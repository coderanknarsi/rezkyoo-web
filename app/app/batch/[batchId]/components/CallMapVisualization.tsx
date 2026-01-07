"use client"

import React, { useState, useEffect } from "react"
import { Phone, PhoneCall, Check, X, Clock, MessageSquare, PhoneOff, AlertTriangle } from "lucide-react"

interface Restaurant {
    id: string
    name: string
    lat?: number
    lng?: number
    // Expanded status types for granular call state visibility
    status: "pending" | "dialing" | "ringing" | "answered" | "calling" | "speaking" | "listening" | "completed" | "error" | "skipped"
    outcome?: "available" | "unavailable" | "hold_confirmed" | "no_answer" | "voicemail" | "busy" | "unclear" | "timeout"
    // Timer support
    startedAt?: string | number  // ISO timestamp or epoch ms when call started
    // Post-call summary
    summary?: string  // One-liner about the call result
}

interface CallMapVisualizationProps {
    userLat: number
    userLng: number
    restaurants: Restaurant[]
    mapUrl?: string | null
}

// Live call timer component
function CallTimer({ startedAt }: { startedAt?: string | number }) {
    const [elapsed, setElapsed] = useState(0)

    useEffect(() => {
        if (!startedAt) return

        const startMs = typeof startedAt === 'string' ? new Date(startedAt).getTime() : startedAt

        const updateTimer = () => {
            const now = Date.now()
            setElapsed(Math.floor((now - startMs) / 1000))
        }

        updateTimer() // Initial update
        const interval = setInterval(updateTimer, 1000)

        return () => clearInterval(interval)
    }, [startedAt])

    if (!startedAt || elapsed === 0) return null

    const minutes = Math.floor(elapsed / 60)
    const seconds = elapsed % 60
    const display = `${minutes}:${seconds.toString().padStart(2, '0')}`

    // Warning color if call is running long (> 60s)
    const isLong = elapsed > 60

    return (
        <span className={`text-xs font-mono ${isLong ? 'text-amber-600' : 'text-gray-500'}`}>
            {display}
        </span>
    )
}

// Get status-based colors
function getStatusColor(status: string, outcome?: string): { bg: string; text: string; ring: string } {
    // Outcomes first (terminal states)
    if (outcome === "hold_confirmed") return { bg: "bg-green-500", text: "text-green-600", ring: "ring-green-400" }
    if (outcome === "available") return { bg: "bg-green-500", text: "text-green-600", ring: "ring-green-400" }
    if (outcome === "unavailable" || outcome === "no_answer" || outcome === "voicemail" || outcome === "busy") return { bg: "bg-red-500", text: "text-red-600", ring: "ring-red-400" }
    if (outcome === "unclear") return { bg: "bg-yellow-500", text: "text-yellow-600", ring: "ring-yellow-400" }

    // Active call states
    if (status === "speaking" || status === "listening") return { bg: "bg-blue-500", text: "text-blue-600", ring: "ring-blue-400" }
    if (status === "answered") return { bg: "bg-blue-400", text: "text-blue-600", ring: "ring-blue-300" }
    if (status === "calling" || status === "dialing" || status === "ringing") return { bg: "bg-amber-500", text: "text-amber-600", ring: "ring-amber-400" }

    // Terminal/error states
    if (status === "completed") return { bg: "bg-gray-400", text: "text-gray-600", ring: "ring-gray-300" }
    if (status === "error" || status === "skipped") return { bg: "bg-red-500", text: "text-red-600", ring: "ring-red-400" }

    return { bg: "bg-gray-300", text: "text-gray-500", ring: "ring-gray-200" }
}

// Get status icon component
function getStatusIcon(status: string, outcome?: string) {
    // Outcomes
    if (outcome === "hold_confirmed" || outcome === "available") return <Check className="w-4 h-4" />
    if (outcome === "unavailable" || outcome === "no_answer" || outcome === "voicemail" || outcome === "busy") return <X className="w-4 h-4" />
    if (outcome === "unclear") return <MessageSquare className="w-4 h-4" />

    // Active states
    if (status === "speaking") return <MessageSquare className="w-4 h-4 animate-pulse" />
    if (status === "listening") return <MessageSquare className="w-4 h-4" />
    if (status === "answered") return <Phone className="w-4 h-4" />
    if (status === "calling" || status === "dialing") return <PhoneCall className="w-4 h-4 animate-pulse" />
    if (status === "ringing") return <Phone className="w-4 h-4 animate-bounce" />

    // Terminal
    if (status === "error" || status === "skipped") return <X className="w-4 h-4" />
    if (status === "completed") return <Check className="w-4 h-4" />

    return <Clock className="w-4 h-4" />
}

// Get status text - USER-FRIENDLY descriptions of what's happening
function getStatusText(status: string, outcome?: string): string {
    // Outcomes first (these override status)
    if (outcome === "hold_confirmed") return "Hold Confirmed! 🎉"
    if (outcome === "available") return "Table Available!"
    if (outcome === "unavailable") return "Not Available"
    if (outcome === "no_answer") return "No Answer"
    if (outcome === "voicemail") return "Reached Voicemail"
    if (outcome === "busy") return "Line Busy"
    if (outcome === "unclear") return "Response Unclear"
    if (outcome === "timeout") return "Call Timed Out"

    // Granular call states - narrate what's happening
    if (status === "dialing") return "Dialing..."
    if (status === "ringing") return "Ringing..."
    if (status === "answered") return "Restaurant answered!"
    if (status === "speaking") return "Speaking with host..."
    if (status === "listening") return "Waiting for response..."
    if (status === "calling") return "Calling..."  // Fallback for legacy

    // Terminal states
    if (status === "completed") return "Call Complete"
    if (status === "error") return "Call Failed"
    if (status === "skipped") return "Skipped"

    return "Waiting..."
}

export function CallMapVisualization({ userLat, userLng, restaurants, mapUrl }: CallMapVisualizationProps) {
    // Count statuses
    const calling = restaurants.filter(r => r.status === "calling").length
    const speaking = restaurants.filter(r => r.status === "speaking").length
    const completed = restaurants.filter(r => r.status === "completed" || r.status === "error" || r.status === "skipped").length
    const confirmed = restaurants.filter(r => r.outcome === "hold_confirmed").length

    return (
        <div className="flex flex-col lg:flex-row gap-4 w-full">
            {/* Map Section */}
            <div className="relative flex-1 min-h-[300px] lg:min-h-[400px] rounded-2xl overflow-hidden shadow-xl">
                {/* Map Background */}
                {mapUrl ? (
                    <img
                        src={mapUrl}
                        alt="Map showing restaurants"
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                ) : (
                    // Fallback dark gradient
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                        <div
                            className="absolute inset-0 opacity-20"
                            style={{
                                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                `,
                                backgroundSize: '40px 40px'
                            }}
                        />
                    </div>
                )}

                {/* Overlay gradient for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

                {/* Status overlay in corner */}
                <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-sm">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${calling > 0 || speaking > 0 ? "bg-red-500 animate-pulse" : "bg-green-500"}`} />
                        <span className="font-medium">
                            {calling > 0 && `${calling} calling`}
                            {speaking > 0 && `${speaking} speaking`}
                            {calling === 0 && speaking === 0 && `${completed}/${restaurants.length} done`}
                        </span>
                    </div>
                </div>

                {/* Center pulsing indicator */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative">
                        {/* Pulse rings */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-16 h-16 rounded-full border-2 border-red-500/30 animate-ping" />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center" style={{ animationDelay: '0.5s' }}>
                            <div className="w-12 h-12 rounded-full border-2 border-red-500/50 animate-ping" />
                        </div>
                        {/* Center dot */}
                        <div className="relative w-6 h-6 bg-red-500 rounded-full shadow-lg shadow-red-500/50 flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-3 text-xs text-white">
                    <span className="flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
                        <span className="w-2 h-2 rounded-full bg-amber-500" /> Calling
                    </span>
                    <span className="flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
                        <span className="w-2 h-2 rounded-full bg-blue-500" /> Speaking
                    </span>
                    <span className="flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
                        <span className="w-2 h-2 rounded-full bg-blue-400" /> Listening
                    </span>
                </div>
            </div>

            {/* Restaurant List Panel */}
            <div className="w-full lg:w-80 bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-3">
                    <h3 className="font-semibold">Restaurant Status</h3>
                    <p className="text-sm text-white/80">
                        {`Checking ${restaurants.length} restaurants...`}
                    </p>
                </div>
                <div className="divide-y divide-gray-100 max-h-[350px] overflow-y-auto">
                    {restaurants.map((r, index) => {
                        const colors = getStatusColor(r.status, r.outcome)
                        const isActive = r.status === "calling" || r.status === "speaking"

                        return (
                            <div
                                key={r.id}
                                className={`px-4 py-3 transition-colors ${isActive ? "bg-gradient-to-r from-amber-50 to-transparent" :
                                    r.outcome === "hold_confirmed" ? "bg-gradient-to-r from-green-50 to-transparent" : ""
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    {/* Status icon */}
                                    <div className={`w-8 h-8 rounded-full ${colors.bg} flex items-center justify-center text-white shrink-0 ${isActive ? "animate-pulse" : ""}`}>
                                        {getStatusIcon(r.status, r.outcome)}
                                    </div>

                                    {/* Restaurant info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate text-sm">{r.name}</p>
                                        <p className={`text-xs ${colors.text}`}>
                                            {getStatusText(r.status, r.outcome)}
                                        </p>
                                    </div>

                                    {/* Timer for active calls, number for others */}
                                    <div className="text-xs text-gray-400 font-mono shrink-0">
                                        {isActive && r.startedAt ? (
                                            <CallTimer startedAt={r.startedAt} />
                                        ) : (
                                            `#${index + 1}`
                                        )}
                                    </div>
                                </div>

                                {/* Post-call summary (shows after call completes) */}
                                {r.status === "completed" && r.summary && (
                                    <p className="mt-1 ml-11 text-xs text-gray-500 italic truncate">
                                        &quot;{r.summary}&quot;
                                    </p>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

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
    // PAYWALL BOUNDARY: Controls visibility of outcomes
    // Pre-paywall (isPaid=false): Only process states (Queued, Calling)
    // Post-paywall (isPaid=true): Reveal outcomes (Success, No Luck)
    isPaid?: boolean
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

// Get status-based colors - 3 BUCKETS matching legend
function getStatusColor(status: string, outcome?: string): { bg: string; text: string; ring: string } {
    // BUCKET: Success (green)
    if (outcome === "hold_confirmed" || outcome === "available") {
        return { bg: "bg-green-500", text: "text-green-600", ring: "ring-green-400" }
    }

    // BUCKET: No Luck (gray)
    if (outcome === "unavailable" || outcome === "no_answer" || outcome === "voicemail" ||
        outcome === "busy" || outcome === "unclear" || outcome === "timeout") {
        return { bg: "bg-gray-400", text: "text-gray-600", ring: "ring-gray-300" }
    }
    if (status === "error" || status === "skipped") {
        return { bg: "bg-gray-400", text: "text-gray-600", ring: "ring-gray-300" }
    }
    if (status === "completed") {
        return { bg: "bg-gray-400", text: "text-gray-600", ring: "ring-gray-300" }
    }

    // BUCKET: In Progress (amber) - includes calling, talking, queued
    if (status === "speaking" || status === "listening" || status === "answered" ||
        status === "calling" || status === "dialing" || status === "ringing") {
        return { bg: "bg-amber-500", text: "text-amber-600", ring: "ring-amber-400" }
    }

    // Default: Queued (lighter amber)
    return { bg: "bg-amber-300", text: "text-amber-500", ring: "ring-amber-200" }
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

// Get status text - 5 USER-FACING states (simplified from 10+ internal states)
// Queued → Calling → Talking → Done (Success) → Done (No Luck)
function getStatusText(status: string, outcome?: string): string {
    // BUCKET 4/5: Done - Success
    if (outcome === "hold_confirmed") return "✓ Hold Confirmed!"
    if (outcome === "available") return "✓ Available"

    // BUCKET 5: Done - No Luck (with specific reason)
    if (outcome === "unavailable") return "✗ Not Available"
    if (outcome === "no_answer") return "✗ No Answer"
    if (outcome === "voicemail") return "✗ Voicemail"
    if (outcome === "busy") return "✗ Line Busy"
    if (outcome === "unclear") return "✗ Unclear Response"
    if (outcome === "timeout") return "✗ Timed Out"

    // BUCKET 3: Talking (collapses: answered + speaking + listening)
    if (status === "speaking" || status === "listening" || status === "answered") {
        return "Talking..."
    }

    // BUCKET 2: Calling (collapses: dialing + ringing + calling)
    if (status === "calling" || status === "dialing" || status === "ringing") {
        return "Calling..."
    }

    // Terminal without clear outcome
    if (status === "completed") return "Done"
    if (status === "error") return "✗ Failed"
    if (status === "skipped") return "Skipped"

    // BUCKET 1: Queued
    return "Queued"
}

export function CallMapVisualization({ userLat, userLng, restaurants, mapUrl, isPaid = false }: CallMapVisualizationProps) {
    // Count statuses
    const calling = restaurants.filter(r => r.status === "calling" || r.status === "dialing" || r.status === "ringing").length
    const speaking = restaurants.filter(r => r.status === "speaking" || r.status === "listening" || r.status === "answered").length
    const completed = restaurants.filter(r => r.status === "completed" || r.status === "error" || r.status === "skipped").length
    const confirmed = restaurants.filter(r => r.outcome === "hold_confirmed").length

    // PAYWALL BOUNDARY: Check if any restaurant has outcome data
    const hasAnyOutcome = restaurants.some(r => r.outcome !== undefined)
    // Only show outcome-related UI if isPaid is true
    const showOutcomes = isPaid && hasAnyOutcome

    // Find the currently active restaurant (prioritize speaking, then calling)
    const activeRestaurant = restaurants.find(r =>
        r.status === "speaking" || r.status === "listening" || r.status === "answered"
    ) || restaurants.find(r =>
        r.status === "calling" || r.status === "dialing" || r.status === "ringing"
    )

    // Calculate restaurant positions relative to user location for static map
    // DYNAMIC: Calculate the actual span needed to fit all restaurants
    const restaurantsWithCoords = restaurants.filter(r => r.lat && r.lng)

    // Find the max distance from user in any direction
    let maxLatOffset = 0.005  // Minimum span of ~0.5km
    let maxLngOffset = 0.005

    restaurantsWithCoords.forEach(r => {
        if (r.lat && r.lng) {
            const latOffset = Math.abs(r.lat - userLat)
            const lngOffset = Math.abs(r.lng - userLng)
            maxLatOffset = Math.max(maxLatOffset, latOffset)
            maxLngOffset = Math.max(maxLngOffset, lngOffset)
        }
    })

    // Add 20% padding so markers aren't at the edge
    const latSpan = maxLatOffset * 1.4
    const lngSpan = maxLngOffset * 1.4

    const getRestaurantPosition = (lat?: number, lng?: number) => {
        if (!lat || !lng) return null

        // Calculate offset from user's position (center)
        const latOffset = lat - userLat
        const lngOffset = lng - userLng

        // Convert to percentage of map area (50% = center)
        // Positive lat = north = up = lower percentage (top of map)
        // Positive lng = east = right = higher percentage
        // Use 35% swing from center to keep markers clearly visible
        const topPct = 50 - (latOffset / latSpan) * 35
        const leftPct = 50 + (lngOffset / lngSpan) * 35

        // Clamp to visible area with generous padding
        return {
            top: Math.max(15, Math.min(75, topPct)),
            left: Math.max(15, Math.min(85, leftPct)),
        }
    }

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

                {/* NUMBERED RESTAURANT MARKERS - correlate with list panel */}
                {restaurants.map((r, index) => {
                    const pos = getRestaurantPosition(r.lat, r.lng)
                    if (!pos) return null

                    const isActive = r.status === "calling" || r.status === "speaking" ||
                        r.status === "dialing" || r.status === "ringing" ||
                        r.status === "listening" || r.status === "answered"

                    return (
                        <div
                            key={r.id}
                            className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                            style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
                        >
                            <div className="flex flex-col items-center">
                                {/* Numbered marker pin */}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white ${isActive
                                    ? 'bg-amber-500 animate-pulse'
                                    : 'bg-red-500'
                                    }`}>
                                    <span className="text-white font-bold text-sm">{index + 1}</span>
                                </div>
                                {/* Pin pointer */}
                                <div className={`w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent -mt-0.5 ${isActive
                                    ? 'border-t-amber-500'
                                    : 'border-t-red-500'
                                    }`} />
                            </div>
                        </div>
                    )
                })}

                {/* Status overlay - shows active call prominently */}
                <div className="absolute top-4 left-4 right-4 flex flex-col gap-2">
                    {/* Active call highlight */}
                    {activeRestaurant && (
                        <div className="bg-black/80 backdrop-blur-sm rounded-lg px-4 py-3 text-white">
                            <div className="flex items-center gap-2 text-xs text-white/70 mb-1">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span>Currently {activeRestaurant.status === "speaking" || activeRestaurant.status === "listening" ? "talking to" : "calling"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-sm truncate max-w-[200px]">{activeRestaurant.name}</span>
                                {activeRestaurant.startedAt && (
                                    <CallTimer startedAt={activeRestaurant.startedAt} />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Progress counter */}
                    <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-sm self-start">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${calling > 0 || speaking > 0 ? "bg-amber-500 animate-pulse" : "bg-green-500"}`} />
                            <span className="font-medium">
                                {completed}/{restaurants.length} done
                            </span>
                        </div>
                    </div>
                </div>

                {/* User location marker - prominent and labeled */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative flex flex-col items-center">
                        {/* Pulse rings */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-20 h-20 rounded-full border-2 border-blue-500/30 animate-ping" />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center" style={{ animationDelay: '0.5s' }}>
                            <div className="w-14 h-14 rounded-full border-2 border-blue-500/50 animate-ping" />
                        </div>
                        {/* Main marker */}
                        <div className="relative w-10 h-10 bg-blue-500 rounded-full shadow-xl shadow-blue-500/50 flex items-center justify-center border-4 border-white">
                            <span className="text-white font-bold text-sm">U</span>
                        </div>
                        {/* "You are here" label */}
                        <div className="mt-2 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
                            You are here
                        </div>
                    </div>
                </div>

                {/* PAYWALL BOUNDARY: Legend/narration area */}
                <div className="absolute bottom-4 left-4 right-4">
                    {showOutcomes ? (
                        // POST-PAYWALL: Show outcome legend
                        <div className="flex justify-center gap-3 text-xs text-white mb-2">
                            <span className="flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
                                <span className="w-2 h-2 rounded-full bg-amber-500" /> In Progress
                            </span>
                            <span className="flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
                                <span className="w-2 h-2 rounded-full bg-green-500" /> Success
                            </span>
                            <span className="flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
                                <span className="w-2 h-2 rounded-full bg-gray-400" /> No Luck
                            </span>
                        </div>
                    ) : (
                        // PRE-PAYWALL: Show process narration only
                        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
                            {activeRestaurant ? (
                                <p className="text-white text-sm">
                                    Calling all restaurants simultaneously...
                                </p>
                            ) : completed > 0 ? (
                                <p className="text-white text-sm">
                                    Calls complete. Results shown after checkout.
                                </p>
                            ) : (
                                <p className="text-white/70 text-xs">
                                    Tap "Check Availability" to start calling
                                </p>
                            )}
                        </div>
                    )}
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
                        // PAYWALL BOUNDARY: Hide outcome colors pre-paywall
                        const colors = showOutcomes
                            ? getStatusColor(r.status, r.outcome)
                            : getStatusColor(r.status, undefined) // No outcome = process colors only
                        const isActive = r.status === "calling" || r.status === "speaking" ||
                            r.status === "dialing" || r.status === "ringing" ||
                            r.status === "listening" || r.status === "answered"

                        return (
                            <div
                                key={r.id}
                                className={`px-4 py-3 transition-colors ${isActive ? "bg-gradient-to-r from-amber-50 to-transparent" :
                                    // Only show success highlight post-paywall
                                    (showOutcomes && r.outcome === "hold_confirmed") ? "bg-gradient-to-r from-green-50 to-transparent" : ""
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    {/* Status icon */}
                                    <div className={`w-8 h-8 rounded-full ${colors.bg} flex items-center justify-center text-white shrink-0 ${isActive ? "animate-pulse" : ""}`}>
                                        {showOutcomes ? getStatusIcon(r.status, r.outcome) : getStatusIcon(r.status, undefined)}
                                    </div>

                                    {/* Restaurant info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate text-sm">{r.name}</p>
                                        <p className={`text-xs ${colors.text}`}>
                                            {/* PAYWALL BOUNDARY: Hide outcome text pre-paywall */}
                                            {showOutcomes
                                                ? getStatusText(r.status, r.outcome)
                                                : getStatusText(r.status, undefined) // Process state only
                                            }
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

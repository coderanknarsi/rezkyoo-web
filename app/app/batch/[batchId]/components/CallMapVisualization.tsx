"use client"

import React from "react"
import { Phone, PhoneCall, Check, X, Clock, MessageSquare } from "lucide-react"

interface Restaurant {
    id: string
    name: string
    lat?: number
    lng?: number
    status: "pending" | "calling" | "speaking" | "completed" | "error" | "skipped"
    outcome?: "available" | "unavailable" | "hold_confirmed" | "no_answer" | "voicemail"
}

interface CallMapVisualizationProps {
    userLat: number
    userLng: number
    restaurants: Restaurant[]
    mapUrl?: string | null
}

// Get status-based colors
function getStatusColor(status: string, outcome?: string): { bg: string; text: string; ring: string } {
    if (outcome === "hold_confirmed") return { bg: "bg-green-500", text: "text-green-600", ring: "ring-green-400" }
    if (outcome === "available") return { bg: "bg-green-500", text: "text-green-600", ring: "ring-green-400" }
    if (outcome === "unavailable" || outcome === "no_answer" || outcome === "voicemail") return { bg: "bg-red-500", text: "text-red-600", ring: "ring-red-400" }
    if (status === "speaking") return { bg: "bg-blue-500", text: "text-blue-600", ring: "ring-blue-400" }
    if (status === "calling") return { bg: "bg-amber-500", text: "text-amber-600", ring: "ring-amber-400" }
    if (status === "completed") return { bg: "bg-gray-400", text: "text-gray-600", ring: "ring-gray-300" }
    if (status === "error" || status === "skipped") return { bg: "bg-red-500", text: "text-red-600", ring: "ring-red-400" }
    return { bg: "bg-gray-300", text: "text-gray-500", ring: "ring-gray-200" }
}

// Get status icon component
function getStatusIcon(status: string, outcome?: string) {
    if (outcome === "hold_confirmed" || outcome === "available") return <Check className="w-4 h-4" />
    if (outcome === "unavailable" || outcome === "no_answer" || outcome === "voicemail") return <X className="w-4 h-4" />
    if (status === "speaking") return <MessageSquare className="w-4 h-4" />
    if (status === "calling") return <PhoneCall className="w-4 h-4 animate-pulse" />
    if (status === "error" || status === "skipped") return <X className="w-4 h-4" />
    return <Clock className="w-4 h-4" />
}

// Get status text
function getStatusText(status: string, outcome?: string): string {
    if (outcome === "hold_confirmed") return "Hold Confirmed! 🎉"
    if (outcome === "available") return "Available"
    if (outcome === "unavailable") return "Not Available"
    if (outcome === "no_answer") return "No Answer"
    if (outcome === "voicemail") return "Voicemail"
    if (status === "speaking") return "Speaking..."
    if (status === "calling") return "Calling..."
    if (status === "completed") return "Completed"
    if (status === "error") return "Error"
    if (status === "skipped") return "Skipped"
    return "Waiting..."
}

export function CallMapVisualization({ userLat, userLng, restaurants, mapUrl }: CallMapVisualizationProps) {
    // Generate styled Google Static Map URL if not provided
    const generateStyledMapUrl = () => {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        if (!apiKey) return null

        // Dark mode style for modern look
        const style = [
            "feature:all|element:geometry|color:0x1a1a2e",
            "feature:all|element:labels.text.fill|color:0x8892b0",
            "feature:all|element:labels.text.stroke|color:0x1a1a2e",
            "feature:road|element:geometry|color:0x2d2d44",
            "feature:road|element:geometry.stroke|color:0x3d3d5c",
            "feature:water|element:geometry|color:0x0d1b2a",
        ].map(s => `style=${encodeURIComponent(s)}`).join("&")

        // User marker (red)
        const userMarker = `markers=color:red|${userLat},${userLng}`

        // Restaurant markers
        const restaurantMarkers = restaurants
            .filter(r => r.lat && r.lng)
            .map(r => `markers=color:0x${r.status === "calling" ? "f59e0b" : r.outcome === "hold_confirmed" ? "22c55e" : "6b7280"}|${r.lat},${r.lng}`)
            .join("&")

        return `https://maps.googleapis.com/maps/api/staticmap?center=${userLat},${userLng}&zoom=12&size=400x400&${style}&${userMarker}&${restaurantMarkers ? `&${restaurantMarkers}` : ""}&key=${apiKey}`
    }

    const effectiveMapUrl = mapUrl || generateStyledMapUrl()

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
                {effectiveMapUrl ? (
                    <img
                        src={effectiveMapUrl}
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
                        <span className="w-2 h-2 rounded-full bg-green-500" /> Success
                    </span>
                </div>
            </div>

            {/* Restaurant List Panel */}
            <div className="w-full lg:w-80 bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-3">
                    <h3 className="font-semibold">Restaurant Status</h3>
                    <p className="text-sm text-white/80">
                        {confirmed > 0 ? `${confirmed} hold${confirmed > 1 ? 's' : ''} confirmed!` : `Checking ${restaurants.length} restaurants...`}
                    </p>
                </div>
                <div className="divide-y divide-gray-100 max-h-[350px] overflow-y-auto">
                    {restaurants.map((r, index) => {
                        const colors = getStatusColor(r.status, r.outcome)
                        const isActive = r.status === "calling" || r.status === "speaking"

                        return (
                            <div
                                key={r.id}
                                className={`px-4 py-3 flex items-center gap-3 transition-colors ${isActive ? "bg-gradient-to-r from-amber-50 to-transparent" :
                                        r.outcome === "hold_confirmed" ? "bg-gradient-to-r from-green-50 to-transparent" : ""
                                    }`}
                            >
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

                                {/* Number indicator */}
                                <div className="text-xs text-gray-400 font-mono">
                                    #{index + 1}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

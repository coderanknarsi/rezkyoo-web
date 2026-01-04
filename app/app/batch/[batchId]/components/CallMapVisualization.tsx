"use client"

import React from "react"

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
}

// Convert lat/lng to x/y position relative to center
function latLngToPosition(
    userLat: number,
    userLng: number,
    targetLat: number,
    targetLng: number,
    scale: number = 15000
): { x: number; y: number } {
    const dx = (targetLng - userLng) * scale
    const dy = (userLat - targetLat) * scale // Inverted because SVG y increases downward

    // Clamp to reasonable bounds
    const maxOffset = 120
    const clampedX = Math.max(-maxOffset, Math.min(maxOffset, dx))
    const clampedY = Math.max(-maxOffset, Math.min(maxOffset, dy))

    return { x: 150 + clampedX, y: 150 + clampedY }
}

// Get status-based colors
function getStatusColor(status: string, outcome?: string): string {
    if (outcome === "hold_confirmed") return "#22c55e" // green
    if (outcome === "available") return "#22c55e" // green
    if (outcome === "unavailable" || outcome === "no_answer" || outcome === "voicemail") return "#ef4444" // red
    if (status === "speaking") return "#3b82f6" // blue
    if (status === "calling") return "#f59e0b" // amber
    if (status === "completed") return "#6b7280" // gray
    if (status === "error" || status === "skipped") return "#ef4444" // red
    return "#9ca3af" // gray for pending
}

// Get status icon
function getStatusIcon(status: string, outcome?: string): string {
    if (outcome === "hold_confirmed") return "✓"
    if (outcome === "available") return "✓"
    if (outcome === "unavailable" || outcome === "no_answer" || outcome === "voicemail") return "✗"
    if (status === "speaking") return "💬"
    if (status === "calling") return "📞"
    if (status === "error" || status === "skipped") return "✗"
    return "•"
}

export function CallMapVisualization({ userLat, userLng, restaurants }: CallMapVisualizationProps) {
    // Calculate positions for each restaurant
    const restaurantPositions = restaurants.map((r) => {
        if (r.lat && r.lng) {
            return { ...r, ...latLngToPosition(userLat, userLng, r.lat, r.lng) }
        }
        // Fallback: distribute evenly in a circle
        const index = restaurants.indexOf(r)
        const angle = (index * 2 * Math.PI) / restaurants.length - Math.PI / 2
        const radius = 100
        return {
            ...r,
            x: 150 + Math.cos(angle) * radius,
            y: 150 + Math.sin(angle) * radius,
        }
    })

    return (
        <div className="relative w-full max-w-md mx-auto aspect-square">
            {/* Background gradient */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
                {/* Subtle grid pattern */}
                <div
                    className="absolute inset-0 opacity-10"
                    style={{
                        backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
                        backgroundSize: '30px 30px'
                    }}
                />
            </div>

            <svg
                viewBox="0 0 300 300"
                className="relative w-full h-full"
                style={{ filter: "drop-shadow(0 4px 20px rgba(0,0,0,0.3))" }}
            >
                <defs>
                    {/* Animated wave gradient */}
                    <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(239,68,68,0)" />
                        <stop offset="50%" stopColor="rgba(239,68,68,0.8)" />
                        <stop offset="100%" stopColor="rgba(239,68,68,0)" />
                    </linearGradient>

                    {/* Glow filter */}
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    {/* Pulse animation */}
                    <radialGradient id="pulseGradient">
                        <stop offset="0%" stopColor="rgba(239,68,68,0.6)" />
                        <stop offset="100%" stopColor="rgba(239,68,68,0)" />
                    </radialGradient>
                </defs>

                {/* Connection lines to restaurants */}
                {restaurantPositions.map((r, i) => {
                    const isActive = r.status === "calling" || r.status === "speaking"
                    const color = getStatusColor(r.status, r.outcome)

                    return (
                        <g key={r.id}>
                            {/* Base line */}
                            <line
                                x1="150"
                                y1="150"
                                x2={r.x}
                                y2={r.y}
                                stroke={color}
                                strokeWidth="2"
                                strokeOpacity={isActive ? 0.6 : 0.2}
                                strokeDasharray={isActive ? "none" : "4 4"}
                            />

                            {/* Animated pulse traveling along line */}
                            {isActive && (
                                <circle r="4" fill={color} filter="url(#glow)">
                                    <animateMotion
                                        dur={r.status === "speaking" ? "1s" : "1.5s"}
                                        repeatCount="indefinite"
                                        path={`M150,150 L${r.x},${r.y}`}
                                    />
                                </circle>
                            )}
                        </g>
                    )
                })}

                {/* User location (center) */}
                <g>
                    {/* Outer pulse ring */}
                    <circle cx="150" cy="150" r="20" fill="none" stroke="rgba(239,68,68,0.3)" strokeWidth="2">
                        <animate
                            attributeName="r"
                            from="15"
                            to="35"
                            dur="2s"
                            repeatCount="indefinite"
                        />
                        <animate
                            attributeName="stroke-opacity"
                            from="0.6"
                            to="0"
                            dur="2s"
                            repeatCount="indefinite"
                        />
                    </circle>

                    {/* Inner pulse ring */}
                    <circle cx="150" cy="150" r="15" fill="none" stroke="rgba(239,68,68,0.5)" strokeWidth="2">
                        <animate
                            attributeName="r"
                            from="12"
                            to="25"
                            dur="2s"
                            begin="0.5s"
                            repeatCount="indefinite"
                        />
                        <animate
                            attributeName="stroke-opacity"
                            from="0.8"
                            to="0"
                            dur="2s"
                            begin="0.5s"
                            repeatCount="indefinite"
                        />
                    </circle>

                    {/* Center dot */}
                    <circle
                        cx="150"
                        cy="150"
                        r="10"
                        fill="url(#pulseGradient)"
                        stroke="#ef4444"
                        strokeWidth="3"
                        filter="url(#glow)"
                    />
                    <circle cx="150" cy="150" r="4" fill="white" />

                    {/* YOU label */}
                    <text
                        x="150"
                        y="175"
                        textAnchor="middle"
                        fill="white"
                        fontSize="10"
                        fontWeight="bold"
                        className="uppercase tracking-wider"
                    >
                        YOU
                    </text>
                </g>

                {/* Restaurant pins */}
                {restaurantPositions.map((r, i) => {
                    const color = getStatusColor(r.status, r.outcome)
                    const icon = getStatusIcon(r.status, r.outcome)
                    const isActive = r.status === "calling" || r.status === "speaking"
                    const isSuccess = r.outcome === "hold_confirmed" || r.outcome === "available"

                    return (
                        <g key={r.id}>
                            {/* Pulse ring for active calls */}
                            {isActive && (
                                <circle cx={r.x} cy={r.y} r="15" fill="none" stroke={color} strokeWidth="2">
                                    <animate
                                        attributeName="r"
                                        from="12"
                                        to="25"
                                        dur="1s"
                                        repeatCount="indefinite"
                                    />
                                    <animate
                                        attributeName="stroke-opacity"
                                        from="0.8"
                                        to="0"
                                        dur="1s"
                                        repeatCount="indefinite"
                                    />
                                </circle>
                            )}

                            {/* Success celebration effect */}
                            {isSuccess && (
                                <>
                                    <circle cx={r.x} cy={r.y} r="20" fill="none" stroke={color} strokeWidth="2">
                                        <animate
                                            attributeName="r"
                                            from="15"
                                            to="35"
                                            dur="1.5s"
                                            repeatCount="indefinite"
                                        />
                                        <animate
                                            attributeName="stroke-opacity"
                                            from="0.6"
                                            to="0"
                                            dur="1.5s"
                                            repeatCount="indefinite"
                                        />
                                    </circle>
                                </>
                            )}

                            {/* Pin circle */}
                            <circle
                                cx={r.x}
                                cy={r.y}
                                r="14"
                                fill={color}
                                stroke="white"
                                strokeWidth="2"
                                filter={isActive || isSuccess ? "url(#glow)" : "none"}
                                className="transition-all duration-300"
                            />

                            {/* Status icon */}
                            <text
                                x={r.x}
                                y={r.y + 4}
                                textAnchor="middle"
                                fill="white"
                                fontSize="12"
                                fontWeight="bold"
                            >
                                {icon}
                            </text>

                            {/* Restaurant name (truncated) */}
                            <text
                                x={r.x}
                                y={r.y + 28}
                                textAnchor="middle"
                                fill="white"
                                fontSize="8"
                                className="opacity-80"
                            >
                                {r.name.length > 15 ? r.name.slice(0, 12) + "..." : r.name}
                            </text>
                        </g>
                    )
                })}
            </svg>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-4 text-xs text-white/70">
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Calling
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" /> Speaking
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" /> Success
                </span>
            </div>
        </div>
    )
}

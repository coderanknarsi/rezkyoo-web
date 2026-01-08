"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { Loader } from "@googlemaps/js-api-loader"

type LatLng = { lat: number; lng: number }
type RenderPhase = "process" | "results"

type Restaurant = {
    id: string
    name: string
    lat: number
    lng: number
}

type Props = {
    renderPhase: RenderPhase
    center: LatLng
    userLocation?: LatLng
    restaurants: Restaurant[]
    activeRestaurantId?: string | null
}

export function DynamicCallMap({
    renderPhase,
    center,
    userLocation,
    restaurants,
    activeRestaurantId,
}: Props) {
    const mapRef = useRef<HTMLDivElement | null>(null)
    const mapInstance = useRef<google.maps.Map | null>(null)
    const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map())
    const [isLoaded, setIsLoaded] = useState(false)

    const loader = useMemo(() => {
        return new Loader({
            apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
            version: "weekly",
        })
    }, [])

    // Initialize map
    useEffect(() => {
        let cancelled = false

        async function init() {
            if (!mapRef.current || mapInstance.current) return

            try {
                // Load the Maps JavaScript API using the Loader
                await loader.load()

                // Now use the global google object directly
                const { Map } = await window.google.maps.importLibrary("maps") as google.maps.MapsLibrary
                const { AdvancedMarkerElement } = await window.google.maps.importLibrary("marker") as google.maps.MarkerLibrary

                if (cancelled || !mapRef.current) return

                // Create map with Map ID for cloud styling
                mapInstance.current = new Map(mapRef.current, {
                    center,
                    zoom: 14,
                    mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || undefined,
                    disableDefaultUI: true,
                    gestureHandling: "greedy",
                    zoomControl: true,
                })

                // User location marker (if provided)
                if (userLocation) {
                    const userEl = document.createElement("div")
                    userEl.className = "relative"
                    userEl.innerHTML = `
                        <div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>
                        <div class="absolute inset-0 w-4 h-4 bg-blue-500 rounded-full animate-ping opacity-75"></div>
                    `
                    new AdvancedMarkerElement({
                        map: mapInstance.current,
                        position: userLocation,
                        content: userEl,
                        title: "Your Location",
                    })
                }

                // Restaurant markers
                for (const r of restaurants) {
                    if (!r.lat || !r.lng) continue

                    const el = document.createElement("div")
                    el.className = "restaurant-marker"
                    updateMarkerStyle(el, r.id === activeRestaurantId, renderPhase)

                    const marker = new AdvancedMarkerElement({
                        map: mapInstance.current,
                        position: { lat: r.lat, lng: r.lng },
                        content: el,
                        title: r.name,
                    })

                    markersRef.current.set(r.id, marker)
                }

                setIsLoaded(true)
            } catch (error) {
                console.error("Failed to load Google Maps:", error)
            }
        }

        init()

        return () => {
            cancelled = true
        }
    }, [loader, center, userLocation, restaurants, renderPhase, activeRestaurantId])

    // Update active highlight without recreating map
    useEffect(() => {
        if (!isLoaded) return

        for (const r of restaurants) {
            const marker = markersRef.current.get(r.id)
            const el = marker?.content as HTMLElement | undefined
            if (!el) continue
            updateMarkerStyle(el, r.id === activeRestaurantId, renderPhase)
        }
    }, [isLoaded, restaurants, activeRestaurantId, renderPhase])

    return (
        <div className="relative w-full h-[350px] rounded-2xl overflow-hidden shadow-xl">
            <div ref={mapRef} className="w-full h-full" />

            {/* Loading overlay */}
            {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-zinc-500">Loading map...</span>
                    </div>
                </div>
            )}

            {/* Process narration overlay */}
            {isLoaded && renderPhase === "process" && activeRestaurantId && (
                <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-black/70 backdrop-blur-sm rounded-lg px-4 py-3 text-white text-center">
                        <p className="text-sm">Calling restaurants one at a time...</p>
                    </div>
                </div>
            )}
        </div>
    )
}

// Helper to style markers based on state
function updateMarkerStyle(el: HTMLElement, isActive: boolean, renderPhase: RenderPhase) {
    if (isActive) {
        // Active call - pulsing amber with glow
        el.className = "relative"
        el.innerHTML = `
            <div class="w-5 h-5 bg-amber-500 rounded-full border-2 border-white shadow-lg z-10 relative"></div>
            <div class="absolute inset-0 w-5 h-5 bg-amber-400 rounded-full animate-ping"></div>
            <div class="absolute -inset-2 bg-amber-500/30 rounded-full animate-pulse"></div>
        `
    } else {
        // Neutral/queued - simple dot
        el.className = ""
        el.innerHTML = `
            <div class="w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-md"></div>
        `
    }
}

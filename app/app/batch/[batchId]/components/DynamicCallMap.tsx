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
    index?: number  // For numbered markers
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
                    zoom: 13,  // Slightly zoomed out for better overview
                    mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || undefined,
                    disableDefaultUI: true,
                    gestureHandling: "greedy",
                    zoomControl: true,
                })

                // Bounds to fit all markers
                const bounds = new google.maps.LatLngBounds()

                // User location marker - pulsing orange dot (matches brand)
                if (userLocation) {
                    bounds.extend(userLocation)
                    const userEl = document.createElement("div")
                    userEl.className = "relative flex items-center justify-center"
                    userEl.innerHTML = `
                        <div class="relative">
                            <!-- Outer pulse rings - hot orange/red -->
                            <div class="absolute -inset-6 bg-orange-500/15 rounded-full animate-pulse"></div>
                            <div class="absolute -inset-4 bg-orange-400/25 rounded-full animate-ping" style="animation-duration: 1.5s;"></div>
                            <div class="absolute -inset-2 bg-orange-500/35 rounded-full animate-pulse" style="animation-duration: 1s;"></div>
                            <!-- Main dot - fiery gradient -->
                            <div class="w-4 h-4 rounded-full border-2 border-white shadow-lg z-10 relative" style="background: linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #ff4500 100%); box-shadow: 0 0 12px rgba(255, 107, 53, 0.6), 0 0 24px rgba(255, 107, 53, 0.3);">
                            </div>
                        </div>
                    `
                    new AdvancedMarkerElement({
                        map: mapInstance.current,
                        position: userLocation,
                        content: userEl,
                        title: "Your Location",
                        zIndex: 1000,  // User always on top
                    })
                }

                // Restaurant markers with INDEX NUMBERS
                restaurants.forEach((r, index) => {
                    if (!r.lat || !r.lng) return

                    bounds.extend({ lat: r.lat, lng: r.lng })

                    const el = document.createElement("div")
                    el.className = "restaurant-marker"
                    updateMarkerStyle(el, r.id === activeRestaurantId, renderPhase, index + 1)

                    const marker = new AdvancedMarkerElement({
                        map: mapInstance.current,
                        position: { lat: r.lat, lng: r.lng },
                        content: el,
                        title: `${index + 1}. ${r.name}`,
                        zIndex: r.id === activeRestaurantId ? 500 : 100,
                    })

                    markersRef.current.set(r.id, marker)
                })

                // Fit map to show all markers with padding
                if (restaurants.length > 0 || userLocation) {
                    mapInstance.current.fitBounds(bounds, {
                        top: 60,
                        right: 40,
                        bottom: 80,
                        left: 40,
                    })
                    // Ensure minimum zoom level (don't zoom in too much for single restaurant)
                    const listener = mapInstance.current.addListener('idle', () => {
                        if (mapInstance.current && mapInstance.current.getZoom()! > 15) {
                            mapInstance.current.setZoom(15)
                        }
                        if (listener) google.maps.event.removeListener(listener)
                    })
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

        restaurants.forEach((r, index) => {
            const marker = markersRef.current.get(r.id)
            const el = marker?.content as HTMLElement | undefined
            if (!el) return
            updateMarkerStyle(el, r.id === activeRestaurantId, renderPhase, index + 1)
        })
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

// Helper to style markers based on state - NOW WITH INDEX NUMBERS
function updateMarkerStyle(el: HTMLElement, isActive: boolean, renderPhase: RenderPhase, index: number) {
    if (isActive) {
        // Active call - pulsing amber with glow and number
        el.className = "relative flex flex-col items-center"
        el.innerHTML = `
            <div class="relative">
                <div class="w-10 h-10 bg-amber-500 rounded-full border-3 border-white shadow-xl flex items-center justify-center z-10 relative">
                    <span class="text-white font-bold text-sm">${index}</span>
                </div>
                <div class="absolute inset-0 w-10 h-10 bg-amber-400 rounded-full animate-ping"></div>
                <div class="absolute -inset-3 bg-amber-500/30 rounded-full animate-pulse"></div>
            </div>
            <div class="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-amber-500 -mt-1"></div>
        `
    } else {
        // Queued/completed restaurants - numbered markers like Google Maps pins
        el.className = "relative flex flex-col items-center"
        el.innerHTML = `
            <div class="w-8 h-8 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                <span class="text-white font-bold text-sm">${index}</span>
            </div>
            <div class="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[7px] border-l-transparent border-r-transparent border-t-red-500 -mt-0.5"></div>
        `
    }
}

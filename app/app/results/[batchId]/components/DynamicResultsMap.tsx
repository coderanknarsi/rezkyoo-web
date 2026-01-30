"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { Loader } from "@googlemaps/js-api-loader"

type LatLng = { lat: number; lng: number }

type Restaurant = {
  id: string
  name: string
  lat: number
  lng: number
  index?: number
  isSelected?: boolean
}

type Props = {
  center: LatLng
  userLocation?: LatLng
  restaurants: Restaurant[]
  selectedIds: Set<string>
}

export function DynamicResultsMap({
  center,
  userLocation,
  restaurants,
  selectedIds,
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
        await loader.load()
        const { Map } = await window.google.maps.importLibrary("maps") as google.maps.MapsLibrary
        const { AdvancedMarkerElement } = await window.google.maps.importLibrary("marker") as google.maps.MarkerLibrary

        if (cancelled || !mapRef.current) return

        mapInstance.current = new Map(mapRef.current, {
          center,
          zoom: 13,
          mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || undefined,
          disableDefaultUI: true,
          gestureHandling: "greedy",
          zoomControl: true,
        })

        const bounds = new google.maps.LatLngBounds()

        // User location marker
        if (userLocation) {
          bounds.extend(userLocation)
          const userEl = document.createElement("div")
          userEl.className = "relative flex items-center justify-center"
          userEl.innerHTML = `
            <div class="relative">
              <div class="absolute -inset-6 bg-orange-500/15 rounded-full animate-pulse"></div>
              <div class="absolute -inset-4 bg-orange-400/25 rounded-full animate-ping" style="animation-duration: 1.5s;"></div>
              <div class="absolute -inset-2 bg-orange-500/35 rounded-full animate-pulse" style="animation-duration: 1s;"></div>
              <div class="w-4 h-4 rounded-full border-2 border-white shadow-lg z-10 relative" style="background: linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #ff4500 100%); box-shadow: 0 0 12px rgba(255, 107, 53, 0.6), 0 0 24px rgba(255, 107, 53, 0.3);">
              </div>
            </div>
          `
          new AdvancedMarkerElement({
            map: mapInstance.current,
            position: userLocation,
            content: userEl,
            title: "Your Location",
            zIndex: 1000,
          })
        }

        // Restaurant markers
        restaurants.forEach((r, index) => {
          if (!r.lat || !r.lng) return

          bounds.extend({ lat: r.lat, lng: r.lng })

          const el = document.createElement("div")
          el.className = "restaurant-marker"
          updateMarkerStyle(el, selectedIds.has(r.id), index + 1)

          const marker = new AdvancedMarkerElement({
            map: mapInstance.current,
            position: { lat: r.lat, lng: r.lng },
            content: el,
            title: `${index + 1}. ${r.name}`,
            zIndex: selectedIds.has(r.id) ? 500 : 100,
          })

          markersRef.current.set(r.id, marker)
        })

        // Fit map to markers
        if (restaurants.length > 0 || userLocation) {
          mapInstance.current.fitBounds(bounds, {
            top: 60,
            right: 40,
            bottom: 80,
            left: 40,
          })
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
  }, [loader, center, userLocation, restaurants])

  // Update marker styles when selection changes
  useEffect(() => {
    if (!isLoaded) return

    restaurants.forEach((r, index) => {
      const marker = markersRef.current.get(r.id)
      const el = marker?.content as HTMLElement | undefined
      if (!el) return
      updateMarkerStyle(el, selectedIds.has(r.id), index + 1)
      
      // Update z-index
      if (marker) {
        marker.zIndex = selectedIds.has(r.id) ? 500 : 100
      }
    })
  }, [isLoaded, restaurants, selectedIds])

  return (
    <div className="relative w-full h-[350px] lg:h-[450px] rounded-2xl overflow-hidden shadow-xl">
      <div ref={mapRef} className="w-full h-full" />

      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-zinc-500">Loading map...</span>
          </div>
        </div>
      )}
    </div>
  )
}

// Style markers based on selection
function updateMarkerStyle(el: HTMLElement, isSelected: boolean, index: number) {
  if (isSelected) {
    // Selected - red with checkmark effect
    el.className = "relative flex flex-col items-center"
    el.innerHTML = `
      <div class="relative">
        <div class="absolute -inset-2 bg-red-500/20 rounded-full animate-pulse"></div>
        <div class="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full border-3 border-white shadow-xl flex items-center justify-center z-10 relative">
          <span class="text-white font-bold text-sm drop-shadow">${index}</span>
        </div>
      </div>
      <div class="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-red-600 -mt-1"></div>
    `
  } else {
    // Not selected - gray
    el.className = "relative flex flex-col items-center"
    el.innerHTML = `
      <div class="w-8 h-8 bg-zinc-400 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
        <span class="text-white font-bold text-sm">${index}</span>
      </div>
      <div class="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[7px] border-l-transparent border-r-transparent border-t-zinc-400 -mt-0.5"></div>
    `
  }
}

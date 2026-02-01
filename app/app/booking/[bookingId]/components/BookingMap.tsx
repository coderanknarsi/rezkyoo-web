"use client"

import { useEffect, useRef } from "react"
import { MapPin } from "lucide-react"

interface BookingMapProps {
  lat: number
  lng: number
  name: string
}

export default function BookingMap({ lat, lng, name }: BookingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)

  useEffect(() => {
    if (!mapRef.current) return

    const initMap = async () => {
      // Check if Google Maps is loaded
      if (!window.google?.maps) {
        // Load Google Maps script
        const script = document.createElement("script")
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=marker`
        script.async = true
        script.defer = true
        script.onload = () => createMap()
        document.head.appendChild(script)
        return
      }
      
      createMap()
    }

    const createMap = async () => {
      if (!mapRef.current || !window.google?.maps) return

      const { Map } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary
      const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary

      const position = { lat, lng }

      // Create map
      const map = new Map(mapRef.current, {
        zoom: 15,
        center: position,
        mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID",
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "cooperative",
      })

      mapInstanceRef.current = map

      // Create custom marker element
      const markerContent = document.createElement("div")
      markerContent.innerHTML = `
        <div style="
          background: #ef4444;
          color: white;
          padding: 8px 12px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 6px;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          ${name}
        </div>
      `

      // Create marker
      const marker = new AdvancedMarkerElement({
        map,
        position,
        content: markerContent,
        title: name,
      })

      markerRef.current = marker
    }

    initMap()

    return () => {
      if (markerRef.current) {
        markerRef.current.map = null
      }
    }
  }, [lat, lng, name])

  return (
    <div
      ref={mapRef}
      className="h-64 rounded-xl overflow-hidden border border-zinc-200 shadow-sm"
      style={{ minHeight: "256px" }}
    >
      {/* Fallback while loading */}
      <div className="h-full w-full bg-zinc-100 flex items-center justify-center">
        <MapPin className="h-8 w-8 text-zinc-300" />
      </div>
    </div>
  )
}

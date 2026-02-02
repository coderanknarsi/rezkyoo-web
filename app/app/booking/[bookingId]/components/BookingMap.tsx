"use client"

import React, { useState } from "react"
import { MapPin } from "lucide-react"

interface BookingMapProps {
  lat: number
  lng: number
  name: string
}

// Use Static Maps API - much simpler and more reliable
const BookingMap = React.memo(function BookingMap({ lat, lng, name }: BookingMapProps) {
  const [imageError, setImageError] = useState(false)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
  
  // Validate coordinates
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    return (
      <div
        className="h-64 rounded-xl overflow-hidden border border-zinc-200 shadow-sm bg-zinc-100 flex items-center justify-center"
        style={{ minHeight: "256px" }}
      >
        <div className="flex flex-col items-center gap-2 text-zinc-400">
          <MapPin className="h-8 w-8" />
          <span className="text-xs">Map unavailable</span>
        </div>
      </div>
    )
  }

  // Build static map URL
  const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x256&scale=2&maptype=roadmap&markers=color:red%7Clabel:R%7C${lat},${lng}&key=${apiKey}`

  if (imageError || !apiKey) {
    // Fallback to OpenStreetMap embed if Google fails
    const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.005},${lng + 0.01},${lat + 0.005}&layer=mapnik&marker=${lat},${lng}`
    
    return (
      <div
        className="h-64 rounded-xl overflow-hidden border border-zinc-200 shadow-sm"
        style={{ minHeight: "256px" }}
      >
        <iframe
          src={osmUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          title={`Map showing ${name}`}
        />
      </div>
    )
  }

  return (
    <div
      className="h-64 rounded-xl overflow-hidden border border-zinc-200 shadow-sm relative"
      style={{ minHeight: "256px" }}
    >
      <img
        src={staticMapUrl}
        alt={`Map showing location of ${name}`}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
      />
      {/* Restaurant name overlay */}
      <div className="absolute bottom-3 left-3 bg-red-500 text-white px-3 py-1.5 rounded-full text-sm font-semibold shadow-lg flex items-center gap-1.5">
        <MapPin className="h-4 w-4" />
        {name}
      </div>
    </div>
  )
})

export default BookingMap

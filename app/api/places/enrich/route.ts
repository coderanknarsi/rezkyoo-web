import { NextRequest, NextResponse } from "next/server"

// Fetch premium details from Google Places API for restaurants
// Only called AFTER user has paid

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

type PlaceDetails = {
  place_id: string
  rating?: number
  user_ratings_total?: number
  price_level?: number
  formatted_phone_number?: string
  website?: string
  url?: string  // Google Maps URL
  reviews?: Array<{
    author_name: string
    rating: number
    text: string
    time: number
    relative_time_description: string
  }>
  opening_hours?: {
    open_now?: boolean
    weekday_text?: string[]
  }
}

async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.error("Missing GOOGLE_MAPS_API_KEY")
    return null
  }

  try {
    const fields = [
      "place_id",
      "rating",
      "user_ratings_total", 
      "price_level",
      "formatted_phone_number",
      "website",
      "url",
      "reviews",
      "opening_hours",
    ].join(",")

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_MAPS_API_KEY}`
    
    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== "OK" || !data.result) {
      console.error(`Places API error for ${placeId}:`, data.status)
      return null
    }

    return {
      place_id: placeId,
      rating: data.result.rating,
      user_ratings_total: data.result.user_ratings_total,
      price_level: data.result.price_level,
      formatted_phone_number: data.result.formatted_phone_number,
      website: data.result.website,
      url: data.result.url,
      reviews: data.result.reviews?.slice(0, 3),  // Only first 3 reviews
      opening_hours: data.result.opening_hours,
    }
  } catch (error) {
    console.error(`Error fetching place details for ${placeId}:`, error)
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const { place_ids } = await req.json()

    if (!Array.isArray(place_ids) || place_ids.length === 0) {
      return NextResponse.json({ ok: false, error: "place_ids required" }, { status: 400 })
    }

    // Limit to 10 places max to control API costs
    const limitedIds = place_ids.slice(0, 10)

    // Fetch all in parallel
    const results = await Promise.all(
      limitedIds.map(id => fetchPlaceDetails(id))
    )

    // Build map of place_id -> details
    const enrichedData: Record<string, PlaceDetails> = {}
    results.forEach((details, index) => {
      if (details) {
        enrichedData[limitedIds[index]] = details
      }
    })

    return NextResponse.json({ 
      ok: true, 
      data: enrichedData,
      fetched: Object.keys(enrichedData).length,
      requested: limitedIds.length,
    })
  } catch (error) {
    console.error("Enrich API error:", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

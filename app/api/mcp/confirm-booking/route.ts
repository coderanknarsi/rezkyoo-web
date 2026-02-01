import { requireUser } from "@/lib/auth"
import { confirmBooking } from "@/lib/mcp/client"

export async function POST(req: Request) {
  try {
    const user = await requireUser()
    const body = await req.json()

    // Validate required fields
    const {
      batchId,
      placeId,
      restaurantName,
      restaurantPhone,
      restaurantAddress,
      restaurantLat,
      restaurantLng,
      customerName,
      customerPhone,
      partySize,
      date,
      time,
    } = body

    if (!batchId || !placeId || !customerName || !customerPhone) {
      return Response.json(
        { ok: false, error: "Missing required booking information" },
        { status: 400 }
      )
    }

    const callMode = process.env.REZKYOO_CALL_MODE ?? "live"

    if (callMode === "simulate") {
      // Simulate booking creation
      const bookingId = `sim_booking_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

      // Store simulated booking in a way the status endpoint can find it
      // For simulation, we'll use localStorage-style approach via a global store
      const { setSimulatedBooking } = await import("@/lib/mcp/sim-store")
      setSimulatedBooking(bookingId, {
        id: bookingId,
        userId: user.id,
        batchId,
        placeId,
        restaurant: {
          name: restaurantName,
          phone: restaurantPhone,
          place_id: placeId,
          address: restaurantAddress,
          lat: restaurantLat,
          lng: restaurantLng,
        },
        customer: {
          name: customerName,
          phone: customerPhone,
        },
        reservation: {
          party_size: partySize,
          date,
          time,
        },
        status: "calling",
        createdAt: new Date().toISOString(),
        // Simulate confirmation after 8 seconds
        confirmsAt: Date.now() + 8000,
      })

      return Response.json({
        ok: true,
        bookingId,
        message: "Booking created, confirmation call starting...",
        simulated: true,
      })
    }

    // Live mode - call MCP server
    const result = await confirmBooking({
      batchId,
      placeId,
      restaurantName,
      restaurantPhone,
      restaurantAddress,
      restaurantLat,
      restaurantLng,
      customerName,
      customerPhone,
      partySize,
      date,
      time,
      userId: user.id,
    })

    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed"
    const status = message.toLowerCase().includes("unauthorized") ? 401 : 500
    return Response.json({ ok: false, error: message }, { status })
  }
}

import { requireUser } from "@/lib/auth"
import { getBookingStatus } from "@/lib/mcp/client"
import { adminDb } from "@/lib/firebase-admin"

export async function POST(req: Request) {
  try {
    const user = await requireUser()
    const body = await req.json()
    const { bookingId } = body

    if (!bookingId) {
      return Response.json(
        { ok: false, error: "Missing bookingId" },
        { status: 400 }
      )
    }

    const callMode = process.env.REZKYOO_CALL_MODE ?? "live"

    if (callMode === "simulate") {
      // Get simulated booking status
      const { getSimulatedBooking, updateSimulatedBooking } = await import("@/lib/mcp/sim-store")
      const booking = getSimulatedBooking(bookingId)

      if (!booking) {
        return Response.json({
          ok: false,
          error: "Booking not found",
          status: "failed",
        })
      }

      // Check if it's time to confirm
      if (booking.status === "calling" && booking.confirmsAt && Date.now() >= booking.confirmsAt) {
        // 90% chance of success
        const success = Math.random() < 0.9
        const newStatus = success ? "confirmed" : "failed"
        
        // Add special request status on confirmation
        const specialRequestStatus = success ? {
          honored: Math.random() < 0.8,  // 80% chance request is honored
          note: "We'll have everything ready for you!"
        } : undefined

        updateSimulatedBooking(bookingId, {
          status: newStatus,
          confirmedAt: success ? new Date().toISOString() : undefined,
          failureReason: success ? undefined : "Restaurant could not confirm at this time",
          specialRequestStatus,
        })

        const updatedBooking = { ...booking, status: newStatus, confirmedAt: success ? new Date().toISOString() : undefined, specialRequestStatus }

        // Save to user's reservations in Firestore if confirmed
        if (success && adminDb) {
          try {
            const reservationData = {
              batchId: booking.batchId,
              placeId: booking.placeId,
              restaurant: {
                name: booking.restaurant.name,
                phone: booking.restaurant.phone,
                address: booking.restaurant.address,
                lat: booking.restaurant.lat,
                lng: booking.restaurant.lng,
              },
              customer: {
                name: booking.customer.name,
                phone: booking.customer.phone,
              },
              reservation: {
                party_size: booking.reservation.party_size,
                date: booking.reservation.date,
                time: booking.reservation.time,
              },
              status: "confirmed",
              confirmedAt: new Date().toISOString(),
              createdAt: booking.createdAt,
            }
            await adminDb
              .collection("users")
              .doc(user.id)
              .collection("reservations")
              .doc(bookingId)
              .set(reservationData)
          } catch (saveErr) {
            console.error("Failed to save reservation to Firestore:", saveErr)
            // Don't fail the response - booking is still confirmed
          }
        }

        return Response.json({
          ok: true,
          status: newStatus,
          message: success
            ? `Your reservation at ${booking.restaurant.name} is confirmed for ${booking.reservation.date} at ${booking.reservation.time}!`
            : "The restaurant was unable to confirm your reservation at this time.",
          booking: updatedBooking,
        })
      }

      // Still in progress
      const progressMessages = [
        "Dialing the restaurant...",
        "Speaking with the host...",
        "Confirming your details...",
        "Almost done...",
      ]
      const elapsed = Date.now() - new Date(booking.createdAt).getTime()
      const messageIndex = Math.min(Math.floor(elapsed / 2000), progressMessages.length - 1)

      return Response.json({
        ok: true,
        status: booking.status,
        message: progressMessages[messageIndex],
        booking,
      })
    }

    // Live mode - call MCP server
    const result = await getBookingStatus({ bookingId })
    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed"
    const status = message.toLowerCase().includes("unauthorized") ? 401 : 500
    return Response.json({ ok: false, error: message }, { status })
  }
}

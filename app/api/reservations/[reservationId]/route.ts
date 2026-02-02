import { requireUser } from "@/lib/auth"
import { adminDb } from "@/lib/firebase-admin"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ reservationId: string }> }
) {
  try {
    const user = await requireUser()
    const { reservationId } = await params

    if (!reservationId) {
      return Response.json(
        { ok: false, error: "Missing reservationId" },
        { status: 400 }
      )
    }

    if (!adminDb) {
      return Response.json(
        { ok: false, error: "Database not initialized" },
        { status: 500 }
      )
    }

    // Fetch reservation from Firestore using Admin SDK
    const docRef = adminDb
      .collection("users")
      .doc(user.id)
      .collection("reservations")
      .doc(reservationId)

    const doc = await docRef.get()

    if (!doc.exists) {
      return Response.json(
        { ok: false, error: "Reservation not found" },
        { status: 404 }
      )
    }

    const reservation = {
      id: doc.id,
      ...doc.data(),
    }

    return Response.json({ ok: true, reservation })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed"
    const status = message.toLowerCase().includes("unauthorized") ? 401 : 500
    return Response.json({ ok: false, error: message }, { status })
  }
}

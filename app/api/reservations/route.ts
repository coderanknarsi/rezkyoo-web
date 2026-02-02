import { requireUser } from "@/lib/auth"
import { adminDb } from "@/lib/firebase-admin"

export async function GET() {
  try {
    const user = await requireUser()

    if (!adminDb) {
      return Response.json(
        { ok: false, error: "Database not initialized" },
        { status: 500 }
      )
    }

    // Fetch reservations from Firestore using Admin SDK
    const reservationsRef = adminDb
      .collection("users")
      .doc(user.id)
      .collection("reservations")
      .orderBy("createdAt", "desc")

    const snapshot = await reservationsRef.get()

    const reservations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return Response.json({ ok: true, reservations })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed"
    const status = message.toLowerCase().includes("unauthorized") ? 401 : 500
    return Response.json({ ok: false, error: message }, { status })
  }
}

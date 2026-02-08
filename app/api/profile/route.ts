import { NextRequest } from "next/server"
import { adminApp, adminDb } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

/**
 * Server-side profile API using Firebase Admin SDK.
 * The client sends a Firebase ID token in the Authorization header.
 * Admin SDK verifies the token and writes directly to Firestore (bypasses security rules).
 */

async function verifyToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized")
  }
  const idToken = authHeader.split("Bearer ")[1]
  if (!adminApp) {
    throw new Error("Firebase Admin not initialized")
  }
  const decoded = await getAuth(adminApp).verifyIdToken(idToken)
  return decoded
}

export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyToken(req)

    if (!adminDb) {
      return Response.json({ ok: false, error: "Database not initialized" }, { status: 500 })
    }

    const docSnap = await adminDb.collection("users").doc(decoded.uid).get()

    if (!docSnap.exists) {
      return Response.json({ ok: true, profile: null })
    }

    return Response.json({ ok: true, profile: docSnap.data() })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed"
    const status = message.toLowerCase().includes("unauthorized") ? 401 : 500
    return Response.json({ ok: false, error: message }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const decoded = await verifyToken(req)

    if (!adminDb) {
      return Response.json({ ok: false, error: "Database not initialized" }, { status: 500 })
    }

    const body = await req.json()
    const { displayName, phoneNumber, smsNotifications } = body

    const docRef = adminDb.collection("users").doc(decoded.uid)
    const docSnap = await docRef.get()

    if (docSnap.exists) {
      await docRef.update({
        ...(displayName !== undefined && { displayName }),
        ...(phoneNumber !== undefined && { phoneNumber }),
        ...(smsNotifications !== undefined && { smsNotifications }),
        updatedAt: new Date(),
      })
    } else {
      await docRef.set({
        uid: decoded.uid,
        email: decoded.email || null,
        displayName: displayName || null,
        phoneNumber: phoneNumber || null,
        smsNotifications: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    return Response.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed"
    const status = message.toLowerCase().includes("unauthorized") ? 401 : 500
    return Response.json({ ok: false, error: message }, { status })
  }
}

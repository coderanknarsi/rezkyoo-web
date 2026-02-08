import { NextRequest, NextResponse } from "next/server"
import { createPaidToken } from "@/lib/paywall"
import { adminApp, adminDb } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"
import { sendSms, buildPaymentSmsBody } from "@/lib/sms"

const PAYPAL_API_BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com"

async function getAccessToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured")
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body: "grant_type=client_credentials",
  })

  if (!response.ok) {
    throw new Error("Failed to get PayPal access token")
  }

  const data = await response.json()
  return data.access_token
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderID, batchId, authToken } = body

    if (!orderID || !batchId) {
      return NextResponse.json(
        { error: "Missing orderID or batchId" },
        { status: 400 }
      )
    }

    const accessToken = await getAccessToken()

    // Capture the order
    const captureResponse = await fetch(
      `${PAYPAL_API_BASE}/v2/checkout/orders/${orderID}/capture`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!captureResponse.ok) {
      const error = await captureResponse.text()
      console.error("PayPal capture error:", error)
      return NextResponse.json(
        { error: "Failed to capture PayPal payment" },
        { status: 500 }
      )
    }

    const captureData = await captureResponse.json()
    console.log("✅ PayPal payment captured:", captureData.id)

    // Verify the payment was completed
    if (captureData.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Payment not completed", status: captureData.status },
        { status: 400 }
      )
    }

    // Verify the batchId matches
    const purchaseUnit = captureData.purchase_units?.[0]
    const capturedBatchId = purchaseUnit?.custom_id || purchaseUnit?.reference_id
    if (capturedBatchId !== batchId) {
      console.error("Batch ID mismatch:", { capturedBatchId, batchId })
      return NextResponse.json(
        { error: "Batch ID mismatch" },
        { status: 400 }
      )
    }

    // Get transaction details
    const capture = purchaseUnit?.payments?.captures?.[0]
    const transactionId = capture?.id || captureData.id

    // Create paid token (same as Dropp flow)
    const token = createPaidToken({
      sub: transactionId,
      exp: Math.floor(Date.now() / 1000) + 2 * 60 * 60, // 2 hours
      scopes: ["availability", "details", "booking"],
      batchId,
    })

    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      transactionId,
      batchId,
    })

    // Set the paid_token cookie (batch-specific name to match get-batch-status)
    response.cookies.set(`rezkyoo_paid_token_${batchId}`, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 2 * 60 * 60, // 2 hours
      path: "/",
    })

    console.log("✅ Paid token issued for batch:", batchId)

    // ── Post-payment SMS notification (fire-and-forget) ──
    // Send SMS to user's phone if they have one saved and SMS is enabled.
    // Guarded by smsSentAt on the batch doc to prevent duplicate texts.
    trySendPostPaymentSms(batchId, authToken, request.nextUrl.origin).catch((err) => {
      console.error("⚠️ SMS send error (non-blocking):", err)
    })

    return response
  } catch (error) {
    console.error("❌ Error capturing PayPal order:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * Attempt to send a post-payment SMS reminder.
 * Non-blocking — called with .catch() so it never breaks the payment flow.
 *
 * Safeguards:
 * 1. Dedup: Checks `smsSentAt` on batch doc — skips if already sent.
 * 2. Opt-out: Checks `smsNotifications !== false` on user profile.
 * 3. Phone validation: Skips if no valid phone number on profile.
 * 4. Rate limit: Sets `smsSentAt` atomically before sending to prevent races.
 */
async function trySendPostPaymentSms(
  batchId: string,
  authToken: string | undefined,
  origin: string
): Promise<void> {
  if (!adminDb || !adminApp) {
    console.log("⚠️ SMS: Admin DB not initialized, skipping")
    return
  }

  // 1. Check batch doc for dedup — if smsSentAt already set, skip
  const batchRef = adminDb.collection("batches").doc(batchId)
  const batchSnap = await batchRef.get()
  if (!batchSnap.exists) {
    console.log("⚠️ SMS: Batch not found:", batchId)
    return
  }

  const batchData = batchSnap.data()
  if (batchData?.smsSentAt) {
    console.log("📱 SMS: Already sent for batch", batchId, "— skipping duplicate")
    return
  }

  // 2. Identify the user — try auth token first, fall back to batch userId
  let userId: string | null = null

  if (authToken) {
    try {
      const decoded = await getAuth(adminApp).verifyIdToken(authToken)
      userId = decoded.uid
    } catch {
      console.log("⚠️ SMS: Could not verify auth token, trying batch userId")
    }
  }

  if (!userId && batchData?.userId) {
    userId = batchData.userId
  }

  if (!userId) {
    console.log("⚠️ SMS: No user ID available for batch", batchId)
    return
  }

  // 3. Look up user profile for phone + SMS preference
  const userSnap = await adminDb.collection("users").doc(userId).get()
  if (!userSnap.exists) {
    console.log("⚠️ SMS: No user profile for", userId)
    return
  }

  const profile = userSnap.data()
  if (profile?.smsNotifications === false) {
    console.log("📱 SMS: User opted out of texts:", userId)
    return
  }

  const phone = profile?.phoneNumber
  if (!phone) {
    console.log("⚠️ SMS: No phone number for user", userId)
    return
  }

  // 4. Atomically set smsSentAt to prevent race conditions (double-send guard)
  try {
    await batchRef.update({ smsSentAt: new Date() })
  } catch {
    console.log("⚠️ SMS: Could not set smsSentAt — possible race, skipping")
    return
  }

  // 5. Count available restaurants for the message
  const items = batchData?.items || []
  const availableCount = items.filter(
    (i: any) => i.result?.outcome === "available" || i.result?.outcome === "hold_confirmed"
  ).length

  if (availableCount === 0) {
    console.log("📱 SMS: No available restaurants — skipping SMS for batch", batchId)
    return
  }

  // 6. Build URL and send
  const batchUrl = `${origin}/app/batch/${batchId}`
  const body = buildPaymentSmsBody(batchUrl, availableCount)

  const result = await sendSms({ to: phone, body })
  if (result.ok) {
    console.log("📱 SMS sent to", phone, "for batch", batchId, "msgId:", result.messageId)
  } else {
    console.error("❌ SMS failed for batch", batchId, ":", result.error)
    // Clear smsSentAt so retry is possible on next page load (if applicable)
    await batchRef.update({ smsSentAt: null }).catch(() => {})
  }
}

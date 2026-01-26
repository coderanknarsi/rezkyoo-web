import { NextRequest, NextResponse } from "next/server"
import { createPaidToken } from "@/lib/paywall"

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
    const { orderID, batchId } = body

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

    // Set the paid_token cookie
    response.cookies.set("paid_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 2 * 60 * 60, // 2 hours
      path: "/",
    })

    console.log("✅ Paid token issued for batch:", batchId)

    return response
  } catch (error) {
    console.error("❌ Error capturing PayPal order:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

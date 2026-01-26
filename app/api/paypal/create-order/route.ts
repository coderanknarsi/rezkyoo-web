import { NextRequest, NextResponse } from "next/server"

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
    const error = await response.text()
    console.error("PayPal auth error:", error)
    throw new Error("Failed to get PayPal access token")
  }

  const data = await response.json()
  return data.access_token
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { batchId, amount, description } = body

    if (!batchId || !amount) {
      return NextResponse.json(
        { error: "Missing batchId or amount" },
        { status: 400 }
      )
    }

    const accessToken = await getAccessToken()

    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: batchId,
          description: description || `Unlock reservation results`,
          amount: {
            currency_code: "USD",
            value: amount.toFixed(2),
          },
          custom_id: batchId, // We'll use this to identify the batch on capture
        },
      ],
      application_context: {
        brand_name: "RezKyoo",
        landing_page: "NO_PREFERENCE",
        user_action: "PAY_NOW",
        return_url: `${request.nextUrl.origin}/app/batch/${batchId}?paid=true`,
        cancel_url: `${request.nextUrl.origin}/app/batch/${batchId}?paid=false`,
      },
    }

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderPayload),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("PayPal create order error:", error)
      return NextResponse.json(
        { error: "Failed to create PayPal order" },
        { status: 500 }
      )
    }

    const order = await response.json()
    console.log("✅ PayPal order created:", order.id)

    return NextResponse.json({ orderID: order.id })
  } catch (error) {
    console.error("❌ Error creating PayPal order:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

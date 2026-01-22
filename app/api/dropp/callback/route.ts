import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

/**
 * Dropp Payment Callback Handler
 * 
 * This endpoint receives the callback from Dropp after a user completes payment.
 * The p2p query parameter contains a signed token that we need to verify.
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const p2pToken = searchParams.get("p2p")

    if (!p2pToken) {
        return NextResponse.redirect(new URL("/app?error=missing_payment_token", request.url))
    }

    try {
        // Decode the p2p token (base64 encoded JSON)
        const p2pData = JSON.parse(Buffer.from(p2pToken, "base64").toString("utf-8"))

        console.log("📦 Dropp callback received:", {
            requestId: p2pData.requestId,
            amount: p2pData.amount,
            status: p2pData.status,
        })

        // Extract batch ID from request ID (format: rezkyoo_{batchId}_{timestamp})
        const requestId = p2pData.requestId || ""
        const batchIdMatch = requestId.match(/rezkyoo_([^_]+)_/)
        const batchId = batchIdMatch ? batchIdMatch[1] : null

        if (!batchId) {
            console.error("❌ Could not extract batch ID from request:", requestId)
            return NextResponse.redirect(new URL("/app?error=invalid_request_id", request.url))
        }

        // Verify payment was successful
        if (p2pData.status === "SUCCESS" || p2pData.code === 0) {
            // Update batch in Firestore to mark as paid
            await adminDb.collection("batches").doc(batchId).update({
                paymentStatus: "paid",
                paymentId: p2pData.transactionId || p2pData.requestId,
                paidAt: new Date(),
                paymentAmount: p2pData.amount,
                paymentMethod: "dropp",
            })

            console.log(`✅ Payment successful for batch ${batchId}`)

            // Redirect back to batch page with success
            return NextResponse.redirect(new URL(`/app/batch/${batchId}?payment=success`, request.url))
        } else {
            console.error("❌ Payment failed:", p2pData)
            return NextResponse.redirect(new URL(`/app/batch/${batchId}?payment=failed`, request.url))
        }
    } catch (error) {
        console.error("❌ Error processing Dropp callback:", error)
        return NextResponse.redirect(new URL("/app?error=payment_processing_failed", request.url))
    }
}

/**
 * POST handler for webhook notifications (if Dropp sends webhooks)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        console.log("📬 Dropp webhook received:", body)

        // Handle webhook notification
        // This is used for async payment status updates

        return NextResponse.json({ received: true })
    } catch (error) {
        console.error("❌ Error processing Dropp webhook:", error)
        return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
    }
}

import { getBatchStatus } from "@/lib/mcp/client"
import { readSimBatch, seedSimBatch } from "@/lib/mcp/sim-store"

// NOTE: This endpoint allows GUEST access (no auth required)
// Users can view search results without signing up.
// Phone numbers are not exposed in the "found" state.

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const cookieHeader = req.headers.get("cookie") || ""
    const paidToken = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const idx = c.indexOf("=")
        return idx >= 0 ? [c.slice(0, idx), c.slice(idx + 1)] : [c, ""]
      })
      .find(([key]) => key === `rezkyoo_paid_token_${body.batchId}`)?.[1]
    
    const hasPaidToken = Boolean(paidToken && paidToken.length > 0)
    const requestBody = paidToken ? { ...body, paid_token: paidToken } : body
    const callMode = process.env.REZKYOO_CALL_MODE ?? "live"
    
    if (callMode === "simulate") {
      const existing = readSimBatch(body.batchId)
      if (existing) {
        // In simulate mode, check if we have a paid token to unlock results
        const isCompleted = existing.status === "completed"
        return Response.json({
          ...existing,
          paywall_required: isCompleted && !hasPaidToken,
        })
      }

      const snapshot = await getBatchStatus(requestBody)
      if (snapshot?.ok) {
        seedSimBatch(body.batchId, snapshot.items ?? [])
        const seeded = readSimBatch(body.batchId)
        if (seeded) {
          const isCompleted = seeded.status === "completed"
          return Response.json({
            ...seeded,
            paywall_required: isCompleted && !hasPaidToken,
          })
        }
        return Response.json(snapshot)
      }
      return Response.json(snapshot)
    }

    const result = await getBatchStatus(requestBody)
    
    // Validate the response structure
    if (!result || typeof result !== 'object') {
      console.error("MCP get_batch_status returned invalid result:", result)
      return Response.json({ ok: false, error: "Invalid response from server" }, { status: 502 })
    }
    
    // Log for debugging
    if (!Array.isArray(result.items)) {
      console.error("MCP get_batch_status items is not an array:", JSON.stringify(result).slice(0, 500))
    }
    
    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed"
    console.error("get-batch-status error:", message)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}

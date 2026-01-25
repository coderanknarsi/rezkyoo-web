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
    const requestBody = paidToken ? { ...body, paid_token: paidToken } : body
    const callMode = process.env.REZKYOO_CALL_MODE ?? "live"
    if (callMode === "simulate") {
      const existing = readSimBatch(body.batchId)
      if (existing) return Response.json(existing)

      const snapshot = await getBatchStatus(requestBody)
      if (snapshot?.ok) {
        seedSimBatch(body.batchId, snapshot.items ?? [])
        const seeded = readSimBatch(body.batchId)
        return Response.json(seeded ?? snapshot)
      }
      return Response.json(snapshot)
    }

    const result = await getBatchStatus(requestBody)
    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed"
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}

import { getBatchStatus } from "@/lib/mcp/client"
import { readSimBatch, seedSimBatch } from "@/lib/mcp/sim-store"

// NOTE: This endpoint allows GUEST access (no auth required)
// Users can view search results without signing up.
// Phone numbers are not exposed in the "found" state.

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const callMode = process.env.REZKYOO_CALL_MODE ?? "live"
    if (callMode === "simulate") {
      const existing = readSimBatch(body.batchId)
      if (existing) return Response.json(existing)

      const snapshot = await getBatchStatus(body)
      if (snapshot?.ok) {
        seedSimBatch(body.batchId, snapshot.items ?? [])
        const seeded = readSimBatch(body.batchId)
        return Response.json(seeded ?? snapshot)
      }
      return Response.json(snapshot)
    }

    const result = await getBatchStatus(body)
    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed"
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}

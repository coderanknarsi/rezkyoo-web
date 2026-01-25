import { requireUser } from "@/lib/auth"
import { getBatchStatus, startCalls } from "@/lib/mcp/client"
import { seedSimBatch } from "@/lib/mcp/sim-store"

export async function POST(req: Request) {
  try {
    await requireUser()
    const body = await req.json()
    const callMode = process.env.REZKYOO_CALL_MODE ?? "live"
    if (callMode === "simulate") {
      const snapshot = await getBatchStatus({ batchId: body.batchId })
      if (snapshot?.ok) {
        seedSimBatch(body.batchId, snapshot.items ?? [])
      }
      return Response.json({
        ok: true,
        message: "Simulated calls started.",
        batchId: body.batchId,
        simulated: true,
      })
    }

    const result = await startCalls(body)
    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed"
    const status = message.toLowerCase().includes("unauthorized") ? 401 : 500
    return Response.json({ ok: false, error: message }, { status })
  }
}

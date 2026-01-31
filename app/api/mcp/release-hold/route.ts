import { requireUser } from "@/lib/auth"
import { releaseHold } from "@/lib/mcp/client"

export async function POST(req: Request) {
  try {
    const user = await requireUser()
    const body = await req.json()

    const { batchId, placeId, restaurantName, restaurantPhone } = body

    if (!batchId || !placeId) {
      return Response.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    const callMode = process.env.REZKYOO_CALL_MODE ?? "live"

    if (callMode === "simulate") {
      // In simulation mode, just acknowledge the release
      console.log(`[SIM] Releasing hold at ${restaurantName} (${placeId})`)
      return Response.json({
        ok: true,
        message: "Hold release acknowledged (simulated)",
        simulated: true,
      })
    }

    // Live mode - call MCP server
    const result = await releaseHold({
      batchId,
      placeId,
      restaurantName: restaurantName || "Unknown",
      restaurantPhone: restaurantPhone || "",
    })

    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed"
    const status = message.toLowerCase().includes("unauthorized") ? 401 : 500
    return Response.json({ ok: false, error: message }, { status })
  }
}

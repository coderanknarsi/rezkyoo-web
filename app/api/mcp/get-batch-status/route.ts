import { getBatchStatus } from "@/lib/mcp/client"

// NOTE: This endpoint allows GUEST access (no auth required)
// Users can view search results without signing up.
// Phone numbers are not exposed in the "found" state.

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const result = await getBatchStatus(body)
    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed"
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}

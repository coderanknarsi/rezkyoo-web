import { findRestaurants } from "@/lib/mcp/client"

// NOTE: This endpoint allows GUEST access (no auth required)
// Users can search without signing up. Auth is required later
// when they click "Check Availability" to start calls.

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const result = await findRestaurants(body)
    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed"
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}

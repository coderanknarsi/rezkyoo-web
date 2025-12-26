import { requireUser } from "@/lib/auth"
import { startCalls } from "@/lib/mcp/client"

export async function POST(req: Request) {
  try {
    await requireUser()
    const body = await req.json()
    const result = await startCalls(body)
    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed"
    const status = message.toLowerCase().includes("unauthorized") ? 401 : 500
    return Response.json({ ok: false, error: message }, { status })
  }
}

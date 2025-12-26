import { requireUser } from "@/lib/auth"
import { startCalls } from "@/lib/mcp/client"

export async function POST(req: Request) {
  try {
    await requireUser()
  } catch {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const result = await startCalls(body)
    return Response.json(result)
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Request failed" },
      { status: 500 }
    )
  }
}

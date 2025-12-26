import type {
  FindRestaurantsInput,
  GetBatchStatusInput,
  StartCallsInput,
} from "@/lib/mcp/types"

async function callTool(tool: string, args: any): Promise<any> {
  const baseUrl = process.env.REZKYOO_MCP_BASE_URL
  if (!baseUrl) {
    throw new Error("REZKYOO_MCP_BASE_URL is not configured")
  }

  const response = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    cache: "no-store",
    // May need adjustment to match MCP server transport contract.
    body: JSON.stringify({ tool, args }),
  })

  if (!response.ok) {
    let details = ""
    try {
      const data = await response.json()
      details = typeof data === "string" ? data : JSON.stringify(data)
    } catch {
      details = await response.text()
    }
    throw new Error(`MCP request failed: ${response.status} ${details}`)
  }

  return response.json()
}

export async function findRestaurants(args: FindRestaurantsInput) {
  return callTool("find_restaurants", args)
}

export async function startCalls(args: StartCallsInput) {
  return callTool("start_calls", args)
}

export async function getBatchStatus(args: GetBatchStatusInput) {
  return callTool("get_batch_status", args)
}

export { callTool }

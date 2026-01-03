import type {
  FindRestaurantsInput,
  GetBatchStatusInput,
  StartCallsInput,
} from "@/lib/mcp/types"

let requestId = 0

async function callTool(toolName: string, args: any): Promise<any> {
  const baseUrl = process.env.REZKYOO_MCP_BASE_URL
  if (!baseUrl) {
    throw new Error("REZKYOO_MCP_BASE_URL is not configured")
  }

  requestId += 1

  // JSON-RPC 2.0 format for MCP tools/call
  const jsonRpcRequest = {
    jsonrpc: "2.0",
    id: requestId,
    method: "tools/call",
    params: {
      name: toolName,
      arguments: args,
    },
  }

  const response = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    cache: "no-store",
    body: JSON.stringify(jsonRpcRequest),
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

  const jsonRpcResponse = await response.json()

  // Handle JSON-RPC error response
  if (jsonRpcResponse.error) {
    throw new Error(jsonRpcResponse.error.message || "MCP tool call failed")
  }

  // Return the result from the JSON-RPC response
  return jsonRpcResponse.result
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

import type {
  FindRestaurantsInput,
  GetBatchStatusInput,
  StartCallsInput,
  ConfirmBookingInput,
  GetBookingStatusInput,
  ReleaseHoldInput,
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
      // MCP server requires both formats in Accept header
      Accept: "application/json, text/event-stream",
    },
    cache: "no-store",
    body: JSON.stringify(jsonRpcRequest),
  })

  if (!response.ok) {
    let details = ""
    try {
      const text = await response.text()
      details = text
    } catch {
      details = "Unknown error"
    }
    throw new Error(`MCP request failed: ${response.status} ${details}`)
  }

  const contentType = response.headers.get("content-type") || ""

  // Handle SSE streaming response
  if (contentType.includes("text/event-stream")) {
    const text = await response.text()
    return parseSSEResponse(text)
  }

  // Handle regular JSON response
  const jsonRpcResponse = await response.json()

  // Handle JSON-RPC error response
  if (jsonRpcResponse.error) {
    throw new Error(jsonRpcResponse.error.message || "MCP tool call failed")
  }

  // Unwrap MCP SDK response format
  // The SDK returns: { result: { content: [{ type: "text", text: "..." }] } }
  // We need to extract and parse the actual tool output from the text field
  const result = jsonRpcResponse.result
  
  if (result?.content && Array.isArray(result.content)) {
    const textContent = result.content.find((c: any) => c.type === "text")
    if (textContent?.text) {
      try {
        return JSON.parse(textContent.text)
      } catch {
        // If not valid JSON, return as-is
        return { text: textContent.text }
      }
    }
  }
  
  // Fallback: return result directly (for non-MCP responses)
  return result
}

// Parse SSE response to extract the final result
function parseSSEResponse(text: string): any {
  const lines = text.split("\n")
  let lastData = null

  for (const line of lines) {
    if (line.startsWith("data:")) {
      const dataStr = line.slice(5).trim()
      if (dataStr) {
        try {
          lastData = JSON.parse(dataStr)
        } catch {
          // Not valid JSON, skip
        }
      }
    }
  }

  if (!lastData) {
    throw new Error("No valid data found in SSE response")
  }

  // Handle JSON-RPC response wrapped in SSE
  if (lastData.error) {
    throw new Error(lastData.error.message || "MCP tool call failed")
  }

  const result = lastData.result
  
  // Unwrap MCP SDK content array format
  if (result?.content && Array.isArray(result.content)) {
    const textContent = result.content.find((c: any) => c.type === "text")
    if (textContent?.text) {
      try {
        return JSON.parse(textContent.text)
      } catch {
        return { text: textContent.text }
      }
    }
  }

  return result ?? lastData
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

export async function confirmBooking(args: ConfirmBookingInput) {
  return callTool("confirm_booking", args)
}

export async function getBookingStatus(args: GetBookingStatusInput) {
  return callTool("get_booking_status", args)
}

export async function releaseHold(args: ReleaseHoldInput) {
  return callTool("release_hold", args)
}

export { callTool }

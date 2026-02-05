import { findRestaurants } from "@/lib/mcp/client"

// NOTE: This endpoint allows GUEST access (no auth required)
// Users can search without signing up. Auth is required later
// when they click "Check Availability" to start calls.

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const result = await findRestaurants(body)
    
    // Validate the response has required fields
    if (!result || typeof result !== 'object') {
      console.error("MCP find_restaurants returned invalid result:", result)
      return Response.json({ ok: false, error: "Invalid response from server" }, { status: 502 })
    }
    
    // If we got a batchId, the search succeeded
    if (result.batchId) {
      return Response.json(result)
    }
    
    // Handle error responses from the MCP server
    if (result.ok === false || result.error) {
      return Response.json({ 
        ok: false, 
        error: result.error || result.text || "Search failed" 
      }, { status: 502 })
    }
    
    // If result has unexpected structure, log and return error
    console.error("MCP find_restaurants returned unexpected structure:", JSON.stringify(result).slice(0, 500))
    return Response.json({ 
      ok: false, 
      error: "Unexpected response format",
      debug: process.env.NODE_ENV === 'development' ? result : undefined
    }, { status: 502 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed"
    console.error("find-restaurants error:", message)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}

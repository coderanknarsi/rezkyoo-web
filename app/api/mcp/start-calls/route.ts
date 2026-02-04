import { requireUser } from "@/lib/auth"
import { getBatchStatus, startCalls, callTool } from "@/lib/mcp/client"
import { reseedSimBatch } from "@/lib/mcp/sim-store"

export async function POST(req: Request) {
  try {
    await requireUser()
    const body = await req.json()
    const { batchId, selected_place_ids } = body
    const callMode = process.env.REZKYOO_CALL_MODE ?? "live"
    
    if (callMode === "simulate") {
      const snapshot = await getBatchStatus({ batchId })
      if (snapshot?.ok) {
        // Filter items to only selected ones if selection provided
        let itemsToCall = snapshot.items ?? []
        if (selected_place_ids && Array.isArray(selected_place_ids) && selected_place_ids.length > 0) {
          itemsToCall = itemsToCall.filter((item: any) => 
            selected_place_ids.includes(item.place_id)
          )
        }
        // Use reseedSimBatch to reset timers (in case user took time to login)
        reseedSimBatch(batchId, itemsToCall)
        
        // Trigger ONE real test call if test phone is configured
        const testPhone = process.env.REZKYOO_TEST_PHONE
        if (testPhone && itemsToCall.length > 0) {
          const firstItem = itemsToCall[0]
          console.log(`🧪 Triggering test call to ${testPhone} with context from ${firstItem.name}`)
          // Fire and forget - don't await, we don't need to monitor the result
          callTool("start_test_call", {
            phone: testPhone,
            batch_id: batchId,
            restaurant_name: firstItem.name,
          }).catch(err => console.error("Test call failed:", err))
        }
      }
      return Response.json({
        ok: true,
        message: "Simulated calls started." + (process.env.REZKYOO_TEST_PHONE ? " Test call triggered." : ""),
        batchId,
        simulated: true,
        selected_count: selected_place_ids?.length,
      })
    }

    // Pass selection to MCP server
    const result = await startCalls({ batchId, selected_place_ids })
    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed"
    const status = message.toLowerCase().includes("unauthorized") ? 401 : 500
    return Response.json({ ok: false, error: message }, { status })
  }
}

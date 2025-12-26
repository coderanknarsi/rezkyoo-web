"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

const POLL_INTERVAL_MS = 2500

type BatchItem = {
  id?: string
  place_id?: string
  name?: string
  phone?: string
  types?: string[]
  status?: unknown
  result?: unknown
}

export default function BatchStatusPage() {
  const params = useParams()
  const router = useRouter()
  const batchId = Array.isArray(params?.batchId)
    ? params.batchId[0]
    : params?.batchId

  const [items, setItems] = React.useState<BatchItem[]>([])
  const [status, setStatus] = React.useState<string | null>(null)
  const [paywallRequired, setPaywallRequired] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(
    () => new Set()
  )
  const [isStartingCalls, setIsStartingCalls] = React.useState(false)

  const fetchStatus = React.useCallback(async () => {
    if (!batchId) return

    try {
      const response = await fetch("/api/mcp/get-batch-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId }),
      })
      const data = await response.json()

      if (data?.ok === false) {
        setError(typeof data.error === "string" ? data.error : "Unknown error")
        return
      }

      setError(null)
      if (typeof data?.status === "string") {
        setStatus(data.status)
      }
      if (Array.isArray(data?.items)) {
        setItems(data.items)
      }
      if (data?.paywall_required) {
        setPaywallRequired(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed")
    }
  }, [batchId])

  React.useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchStatus])

  const updateSelection = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  const handleStartCalls = async () => {
    if (!batchId) return
    setIsStartingCalls(true)
    try {
      const response = await fetch("/api/mcp/start-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId,
          selected_place_ids: Array.from(selectedIds),
        }),
      })

      const data = await response.json()
      if (data?.ok === false) {
        setError(typeof data.error === "string" ? data.error : "Unknown error")
      } else {
        setError(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setIsStartingCalls(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Batch status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
          <div>Batch ID: {batchId}</div>
          <div>Status: {status ?? "Loading..."}</div>
        </CardContent>
      </Card>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {error}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Restaurants</h2>
        <Button
          type="button"
          onClick={handleStartCalls}
          disabled={isStartingCalls || selectedIds.size === 0}
        >
          {isStartingCalls ? "Starting..." : "Start calls"}
        </Button>
      </div>

      <Separator />

      <div className="grid gap-4">
        {items.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              Waiting for restaurants...
            </CardContent>
          </Card>
        ) : (
          items.map((item) => {
            const displayId = item.place_id ?? item.id ?? "unknown"
            const isSelected = selectedIds.has(displayId)
            return (
              <Card key={displayId}>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle>{item.name ?? "Unknown restaurant"}</CardTitle>
                    <div className="text-sm text-muted-foreground">
                      {item.phone ?? "No phone"}
                    </div>
                  </div>
                  <Checkbox
                    checked={isSelected}
                    onChange={(event) =>
                      updateSelection(displayId, event.currentTarget.checked)
                    }
                    aria-label={`Select ${item.name ?? "restaurant"}`}
                  />
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2 text-sm">
                  {(item.types ?? []).map((type) => (
                    <Badge key={type} variant="secondary">
                      {type}
                    </Badge>
                  ))}
                  {paywallRequired ? (
                    <Badge variant="destructive">Locked</Badge>
                  ) : (
                    <Badge variant="outline">Availability pending</Badge>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      <Dialog open={paywallRequired} onOpenChange={setPaywallRequired}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock availability</DialogTitle>
            <DialogDescription>
              Availability was found. Pay to reveal which restaurants are
              bookable and to confirm a booking call.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaywallRequired(false)}>
              Not now
            </Button>
            <Button onClick={() => router.push("/app/unlock")}>Unlock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

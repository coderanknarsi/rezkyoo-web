"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Phone, PhoneCall, PhoneOff, Check, X, Clock, AlertCircle, RefreshCw } from "lucide-react"

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

type CallStatus = "pending" | "calling" | "completed" | "failed" | "no_answer"

type CallResult = {
  outcome?: "available" | "not_available" | "hold_confirmed" | "voicemail" | "no_answer" | "failed"
  alternative_time?: string
  ai_summary?: string
  time_held?: string
  perks?: string
}

type BatchItem = {
  id?: string
  place_id?: string
  name?: string
  phone?: string
  types?: string[]
  address?: string
  rating?: number
  status?: CallStatus
  result?: CallResult
}

function getStatusIcon(status?: CallStatus) {
  switch (status) {
    case "calling":
      return <PhoneCall className="h-5 w-5 text-amber-500 animate-pulse" />
    case "completed":
      return <Check className="h-5 w-5 text-emerald-500" />
    case "failed":
    case "no_answer":
      return <PhoneOff className="h-5 w-5 text-red-500" />
    default:
      return <Phone className="h-5 w-5 text-zinc-400" />
  }
}

function getStatusBadge(status?: CallStatus, result?: CallResult) {
  if (status === "calling") {
    return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Calling...</Badge>
  }
  if (status === "completed" && result?.outcome === "hold_confirmed") {
    return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Hold Confirmed ✓</Badge>
  }
  if (status === "completed" && result?.outcome === "available") {
    return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Available</Badge>
  }
  if (status === "completed" && result?.outcome === "not_available") {
    return <Badge variant="secondary">Not Available</Badge>
  }
  if (status === "completed" && result?.outcome === "voicemail") {
    return <Badge variant="secondary">Voicemail</Badge>
  }
  if (status === "failed" || status === "no_answer") {
    return <Badge variant="destructive">No Answer</Badge>
  }
  return <Badge variant="outline">Pending</Badge>
}

function getOutcomeMessage(result?: CallResult) {
  if (!result) return null

  if (result.outcome === "hold_confirmed") {
    return (
      <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
        <div className="font-medium">🎉 Table on hold!</div>
        {result.time_held && <div>Held until: {result.time_held}</div>}
        {result.perks && <div className="mt-1">Perks: {result.perks}</div>}
        {result.ai_summary && <div className="mt-1 text-emerald-600 dark:text-emerald-400">{result.ai_summary}</div>}
      </div>
    )
  }

  if (result.outcome === "available") {
    return (
      <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
        <div className="font-medium">Table available!</div>
        {result.ai_summary && <div className="mt-1">{result.ai_summary}</div>}
      </div>
    )
  }

  if (result.outcome === "not_available" && result.alternative_time) {
    return (
      <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
        <div className="font-medium">Alternative offered</div>
        <div>Available at: {result.alternative_time}</div>
        {result.ai_summary && <div className="mt-1">{result.ai_summary}</div>}
      </div>
    )
  }

  if (result.outcome === "not_available") {
    return (
      <div className="rounded-lg bg-zinc-100 p-3 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
        <div>Not available at requested time</div>
        {result.ai_summary && <div className="mt-1">{result.ai_summary}</div>}
      </div>
    )
  }

  if (result.ai_summary) {
    return (
      <div className="rounded-lg bg-zinc-100 p-3 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
        {result.ai_summary}
      </div>
    )
  }

  return null
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
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set())
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

  // Calculate progress stats
  const totalItems = items.length
  const completedItems = items.filter(i => i.status === "completed" || i.status === "failed" || i.status === "no_answer").length
  const callingItems = items.filter(i => i.status === "calling").length
  const holdsConfirmed = items.filter(i => i.result?.outcome === "hold_confirmed").length
  const available = items.filter(i => i.result?.outcome === "available" || i.result?.outcome === "hold_confirmed").length

  const isCallsInProgress = status === "calling" || callingItems > 0
  const allCallsComplete = totalItems > 0 && completedItems === totalItems

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
      {/* Header with progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Restaurant Search</CardTitle>
            {isCallsInProgress && (
              <div className="flex items-center gap-2 text-amber-600">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Calling restaurants...</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress bar */}
          {totalItems > 0 && (status === "calling" || status === "completed") && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>{completedItems} of {totalItems} calls completed</span>
                {holdsConfirmed > 0 && (
                  <span className="text-emerald-600 font-medium">{holdsConfirmed} hold{holdsConfirmed > 1 ? "s" : ""} confirmed!</span>
                )}
              </div>
              <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                  style={{ width: `${(completedItems / totalItems) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Stats */}
          {allCallsComplete && (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800 p-3">
                <div className="text-2xl font-bold">{totalItems}</div>
                <div className="text-xs text-muted-foreground">Called</div>
              </div>
              <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900/30 p-3">
                <div className="text-2xl font-bold text-emerald-600">{available}</div>
                <div className="text-xs text-emerald-600">Available</div>
              </div>
              <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-3">
                <div className="text-2xl font-bold text-blue-600">{holdsConfirmed}</div>
                <div className="text-xs text-blue-600">Holds</div>
              </div>
            </div>
          )}

          {status === "found" && (
            <div className="text-sm text-muted-foreground">
              Select restaurants below and click "Start Calls" to check availability.
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
          </CardContent>
        </Card>
      )}

      {/* Action bar */}
      {status === "found" && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Select restaurants to call</h2>
            <Button
              onClick={handleStartCalls}
              disabled={isStartingCalls || selectedIds.size === 0}
              className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            >
              <Phone className="h-4 w-4" />
              {isStartingCalls ? "Starting..." : `Call ${selectedIds.size} restaurant${selectedIds.size !== 1 ? "s" : ""}`}
            </Button>
          </div>
          <Separator />
        </>
      )}

      {/* Restaurant list */}
      <div className="grid gap-4">
        {items.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Finding restaurants...</span>
            </CardContent>
          </Card>
        ) : (
          items.map((item) => {
            const displayId = item.place_id ?? item.id ?? "unknown"
            const isSelected = selectedIds.has(displayId)
            const showCheckbox = status === "found"
            const callStatus = item.status as CallStatus | undefined

            return (
              <Card
                key={displayId}
                className={`transition-all ${item.result?.outcome === "hold_confirmed"
                  ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30"
                  : ""
                  }`}
              >
                <CardHeader className="flex flex-row items-start gap-4 pb-2">
                  {showCheckbox && (
                    <Checkbox
                      checked={isSelected}
                      onChange={(e) => updateSelection(displayId, e.target.checked)}
                      aria-label={`Select ${item.name ?? "restaurant"}`}
                      className="mt-1"
                    />
                  )}
                  {!showCheckbox && (
                    <div className="mt-1">
                      {getStatusIcon(callStatus)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-lg truncate">{item.name ?? "Unknown restaurant"}</CardTitle>
                      {getStatusBadge(callStatus, item.result)}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span>{item.phone ?? "No phone"}</span>
                      {item.rating && (
                        <span>⭐ {item.rating}</span>
                      )}
                    </div>
                    {item.address && (
                      <div className="text-sm text-muted-foreground truncate mt-1">
                        {item.address}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Types/categories */}
                  {item.types && item.types.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {item.types.slice(0, 3).map((type) => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {type.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Call result */}
                  {getOutcomeMessage(item.result)}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Paywall dialog */}
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
            <Button
              onClick={() => router.push("/app/unlock")}
              className="bg-gradient-to-r from-emerald-500 to-teal-500"
            >
              Unlock Results
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

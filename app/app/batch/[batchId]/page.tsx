"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Phone, PhoneCall, PhoneOff, Check, Star, AlertCircle, RefreshCw, MapPin, Lock, MessageSquare } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"

const POLL_INTERVAL_MS = 5000 // 5 seconds during active calls

type CallStatus = "pending" | "calling" | "speaking" | "completed" | "failed" | "no_answer" | "skipped" | "error"

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
  user_ratings_total?: number
  status?: CallStatus
  result?: CallResult
  distance_miles?: number
  lat?: number
  lng?: number
}

function getStatusIcon(status?: CallStatus) {
  switch (status) {
    case "calling":
      return <PhoneCall className="h-5 w-5 text-amber-500 animate-pulse" />
    case "speaking":
      return <MessageSquare className="h-5 w-5 text-blue-500 animate-pulse" />
    case "completed":
      return <Check className="h-5 w-5 text-emerald-500" />
    case "failed":
    case "no_answer":
    case "error":
      return <PhoneOff className="h-5 w-5 text-red-500" />
    case "skipped":
      return <Phone className="h-5 w-5 text-zinc-300" />
    default:
      return <Phone className="h-5 w-5 text-zinc-400" />
  }
}

function getStatusBadge(status?: CallStatus, result?: CallResult) {
  if (status === "calling") {
    return <Badge className="bg-amber-100 text-amber-700 border-amber-300 animate-pulse">Calling...</Badge>
  }
  if (status === "speaking") {
    return <Badge className="bg-blue-100 text-blue-700 border-blue-300 animate-pulse">Speaking with staff...</Badge>
  }
  if (status === "completed" && result?.outcome === "hold_confirmed") {
    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">Hold Confirmed ✓</Badge>
  }
  if (status === "completed" && result?.outcome === "available") {
    return <Badge className="bg-blue-100 text-blue-700 border-blue-300">Available</Badge>
  }
  if (status === "completed" && result?.outcome === "not_available") {
    return <Badge className="bg-zinc-100 text-zinc-600 border-zinc-300">Not Available</Badge>
  }
  if (status === "skipped") {
    return <Badge className="bg-zinc-100 text-zinc-500 border-zinc-200">Skipped</Badge>
  }
  if (status === "failed" || status === "no_answer" || status === "error") {
    return <Badge className="bg-red-100 text-red-700 border-red-300">Failed</Badge>
  }
  return null
}

function RatingStars({ rating, count }: { rating?: number; count?: number }) {
  if (!rating) return null

  let colorClass = "text-yellow-500"
  if (rating >= 4.5) colorClass = "text-emerald-500"
  else if (rating >= 4.0) colorClass = "text-yellow-500"
  else if (rating >= 3.5) colorClass = "text-orange-500"
  else colorClass = "text-red-500"

  return (
    <div className="flex items-center gap-1.5">
      <div className={`flex items-center gap-0.5 ${colorClass}`}>
        <Star className="h-4 w-4 fill-current" />
        <span className="font-semibold">{rating.toFixed(1)}</span>
      </div>
      {count && (
        <span className="text-xs text-muted-foreground">
          ({count.toLocaleString()})
        </span>
      )}
    </div>
  )
}

function getOutcomeMessage(result?: CallResult) {
  if (!result) return null

  if (result.outcome === "hold_confirmed") {
    return (
      <div className="rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 text-sm">
        <div className="font-semibold text-emerald-700">🎉 Table on hold!</div>
        {result.time_held && <div className="text-emerald-600">Held until: {result.time_held}</div>}
        {result.perks && <div className="mt-1 text-emerald-600">Perks: {result.perks}</div>}
        {result.ai_summary && <div className="mt-2 text-emerald-600/80">{result.ai_summary}</div>}
      </div>
    )
  }

  if (result.outcome === "available") {
    return (
      <div className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 text-sm">
        <div className="font-semibold text-blue-700">✨ Table available!</div>
        {result.ai_summary && <div className="mt-1 text-blue-600">{result.ai_summary}</div>}
      </div>
    )
  }

  if (result.outcome === "not_available" && result.alternative_time) {
    return (
      <div className="rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 text-sm">
        <div className="font-semibold text-amber-700">Alternative time offered</div>
        <div className="text-amber-600">Available at: {result.alternative_time}</div>
        {result.ai_summary && <div className="mt-1 text-amber-600/80">{result.ai_summary}</div>}
      </div>
    )
  }

  if (result.ai_summary) {
    return (
      <div className="rounded-lg bg-zinc-100 border border-zinc-200 p-4 text-sm">
        {result.ai_summary}
      </div>
    )
  }

  return null
}

export default function BatchStatusPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const batchId = Array.isArray(params?.batchId)
    ? params.batchId[0]
    : params?.batchId

  const [items, setItems] = React.useState<BatchItem[]>([])
  const [status, setStatus] = React.useState<string | null>(null)
  const [paywallRequired, setPaywallRequired] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isStartingCalls, setIsStartingCalls] = React.useState(false)
  const [mapUrl, setMapUrl] = React.useState<string | null>(null)
  const [query, setQuery] = React.useState<{
    location?: string
    party_size?: number
    date?: string
    time?: string
    craving?: { chips?: string[] }
  } | null>(null)

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
      if (data?.map_url) {
        setMapUrl(data.map_url)
      }
      if (data?.query) {
        setQuery(data.query)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed")
    }
  }, [batchId])

  React.useEffect(() => {
    fetchStatus()

    // Only poll while calls are in progress
    const shouldPoll = !status || status === "calling" || status === "running"

    if (shouldPoll) {
      const interval = setInterval(fetchStatus, POLL_INTERVAL_MS)
      return () => clearInterval(interval)
    }
  }, [fetchStatus, status])

  // Handle "Check Availability" click
  const handleCheckAvailability = async () => {
    // If not logged in, redirect to login with return URL
    if (!user) {
      const returnUrl = `/app/batch/${batchId}?startCalls=true`
      router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`)
      return
    }

    // User is logged in - start calls
    await startCalls()
  }

  // Start calls (requires auth)
  const startCalls = async () => {
    if (!batchId) return
    setIsStartingCalls(true)
    setError(null)

    try {
      const response = await fetch("/api/mcp/start-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId }),
      })
      const data = await response.json()

      if (data?.ok === false) {
        if (data.error?.includes("unauthorized") || data.error?.includes("Unauthorized")) {
          // Redirect to login
          const returnUrl = `/app/batch/${batchId}?startCalls=true`
          router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`)
          return
        }
        setError(typeof data.error === "string" ? data.error : "Failed to start calls")
      } else {
        // Calls started, fetch status to see progress
        await fetchStatus()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setIsStartingCalls(false)
    }
  }

  // Auto-start calls if redirected back from login with startCalls=true
  React.useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("startCalls") === "true" && user && status === "found") {
      // Remove the query param and start calls
      window.history.replaceState({}, "", `/app/batch/${batchId}`)
      startCalls()
    }
  }, [user, status, batchId])

  // Calculate progress stats
  const totalItems = items.length
  const completedItems = items.filter(i =>
    ["completed", "failed", "no_answer", "error", "skipped"].includes(i.status || "")
  ).length
  const callingItems = items.filter(i => i.status === "calling" || i.status === "speaking").length
  const speakingItems = items.filter(i => i.status === "speaking").length
  const pendingItems = items.filter(i => i.status === "pending").length
  const holdsConfirmed = items.filter(i => i.result?.outcome === "hold_confirmed").length
  const available = items.filter(i =>
    i.result?.outcome === "available" || i.result?.outcome === "hold_confirmed"
  ).length

  const isCallsInProgress = status === "calling" || status === "running" || callingItems > 0 || speakingItems > 0
  const allCallsComplete = totalItems > 0 && completedItems === totalItems && status === "completed"
  const isFoundState = status === "found"

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50/30 via-white to-white dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-950 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-red-400/10 blur-3xl" />
      <div className="absolute top-1/3 -left-40 h-80 w-80 rounded-full bg-orange-400/10 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
        {/* Header */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur dark:bg-zinc-900/80">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">
                  {isFoundState ? "Restaurants Found!" :
                    isCallsInProgress ? "Checking Availability..." :
                      allCallsComplete ? "Results" : "Finding Restaurants..."}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {isFoundState && `${items.length} restaurants match your search`}
                  {isCallsInProgress && `${callingItems} calling, ${pendingItems} queued`}
                  {allCallsComplete && `${available} available out of ${totalItems} called`}
                </p>
              </div>
              {isCallsInProgress && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 text-red-700">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-medium">Live</span>
                </div>
              )}
            </div>

            {/* Search Query Banner */}
            {query && (
              <div className="flex flex-wrap items-center gap-2 mt-3 text-sm">
                {query.craving?.chips?.map((chip, i) => (
                  <span key={i} className="px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">
                    {chip}
                  </span>
                ))}
                {query.party_size && (
                  <span className="px-2 py-1 rounded-full bg-zinc-100 text-zinc-700">
                    {query.party_size} guests
                  </span>
                )}
                {query.time && (
                  <span className="px-2 py-1 rounded-full bg-zinc-100 text-zinc-700">
                    {query.time}
                  </span>
                )}
                {query.date && (
                  <span className="px-2 py-1 rounded-full bg-zinc-100 text-zinc-700">
                    {query.date}
                  </span>
                )}
                {query.location && (
                  <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {query.location.length > 30 ? query.location.substring(0, 30) + "..." : query.location}
                  </span>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {/* Static Map */}
            {mapUrl && (
              <div className="mb-4 rounded-lg overflow-hidden shadow-sm border">
                <img
                  src={mapUrl}
                  alt="Map showing restaurant locations"
                  className="w-full h-48 object-cover"
                />
              </div>
            )}
            {/* Progress bar - only during calls */}
            {(isCallsInProgress || allCallsComplete) && totalItems > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>{completedItems} of {totalItems} calls completed</span>
                  {holdsConfirmed > 0 && (
                    <span className="text-red-600 font-semibold">
                      {holdsConfirmed} hold{holdsConfirmed > 1 ? "s" : ""} confirmed! 🎉
                    </span>
                  )}
                </div>
                <div className="h-3 bg-zinc-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 transition-all duration-500 ${isCallsInProgress ? "animate-pulse" : ""}`}
                    style={{ width: `${(completedItems / totalItems) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Stats when complete */}
            {allCallsComplete && (
              <div className="grid grid-cols-3 gap-4 text-center mt-4">
                <div className="rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-50 p-4 shadow-sm">
                  <div className="text-3xl font-bold">{totalItems}</div>
                  <div className="text-xs text-muted-foreground font-medium">Called</div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-green-100 to-emerald-50 p-4 shadow-sm">
                  <div className="text-3xl font-bold text-green-600">{available}</div>
                  <div className="text-xs text-green-600 font-medium">Available</div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-red-100 to-orange-50 p-4 shadow-sm">
                  <div className="text-3xl font-bold text-red-600">{holdsConfirmed}</div>
                  <div className="text-xs text-red-600 font-medium">On Hold</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </CardContent>
          </Card>
        )}

        {/* Restaurant list */}
        <div className="grid gap-4">
          {items.length === 0 ? (
            <Card className="border-0 shadow-md">
              <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                  <div className="relative rounded-full bg-gradient-to-r from-red-500 to-orange-500 p-4">
                    <RefreshCw className="h-6 w-6 text-white animate-spin" />
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-lg">Finding restaurants...</div>
                  <div className="text-sm text-muted-foreground">Searching for the best matches</div>
                </div>
              </CardContent>
            </Card>
          ) : (
            items.map((item) => {
              const displayId = item.place_id ?? item.id ?? "unknown"
              const callStatus = item.status as CallStatus | undefined
              const showCallStatus = !isFoundState // Only show call status after calls started

              return (
                <Card
                  key={displayId}
                  className={`border-0 shadow-md transition-all ${item.result?.outcome === "hold_confirmed"
                    ? "bg-gradient-to-r from-emerald-50 to-teal-50 ring-2 ring-emerald-300"
                    : item.result?.outcome === "available"
                      ? "bg-gradient-to-r from-blue-50 to-indigo-50"
                      : item.status === "speaking"
                        ? "bg-blue-50/50 ring-1 ring-blue-200"
                        : item.status === "calling"
                          ? "bg-amber-50/50"
                          : "bg-white"
                    }`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Status icon - only show during/after calls */}
                      {showCallStatus && (
                        <div className="pt-1">
                          {getStatusIcon(callStatus)}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg truncate">
                              {item.name ?? "Unknown restaurant"}
                            </h3>
                            <div className="flex items-center gap-4 mt-1 flex-wrap">
                              <RatingStars rating={item.rating} count={item.user_ratings_total} />
                              {/* Distance - show if available */}
                              {item.distance_miles && (
                                <span className="text-sm text-muted-foreground">
                                  {item.distance_miles.toFixed(1)} mi away
                                </span>
                              )}
                            </div>
                          </div>
                          {showCallStatus && getStatusBadge(callStatus, item.result)}
                        </div>

                        {/* Address */}
                        {item.address && (
                          <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{item.address}</span>
                          </div>
                        )}

                        {/* Types */}
                        {item.types && item.types.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {item.types.slice(0, 4).map((type) => (
                              <Badge
                                key={type}
                                variant="secondary"
                                className="text-xs bg-zinc-100 hover:bg-zinc-200"
                              >
                                {type.replace(/_/g, " ")}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Call result - only after calls */}
                        {showCallStatus && item.result && (
                          <div className="mt-4">
                            {getOutcomeMessage(item.result)}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>

        {/* Check Availability Button - only shown in "found" state */}
        {isFoundState && items.length > 0 && (
          <Card className="border-0 shadow-lg bg-gradient-to-r from-red-500 to-red-600 sticky bottom-6">
            <CardContent className="p-4">
              <Button
                onClick={handleCheckAvailability}
                disabled={isStartingCalls || authLoading}
                className="w-full h-14 text-lg font-semibold bg-white text-red-700 hover:bg-white/90 shadow-lg"
              >
                {isStartingCalls ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    Starting Calls...
                  </>
                ) : user ? (
                  <>
                    <Phone className="h-5 w-5 mr-2" />
                    Check Availability at {items.length} Restaurant{items.length > 1 ? "s" : ""}
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5 mr-2" />
                    Sign Up to Check Availability
                  </>
                )}
              </Button>
              {!user && (
                <p className="text-center text-white/80 text-sm mt-2">
                  Free to create an account • Only pay when you book
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Paywall dialog */}
        <Dialog open={paywallRequired} onOpenChange={setPaywallRequired}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">Unlock Your Reservations</DialogTitle>
              <DialogDescription>
                Great news! We found availability at some restaurants.
                Unlock to see which ones and let us secure your table.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setPaywallRequired(false)}>
                Maybe Later
              </Button>
              <Button
                onClick={() => router.push("/app/unlock")}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
              >
                Unlock Results
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

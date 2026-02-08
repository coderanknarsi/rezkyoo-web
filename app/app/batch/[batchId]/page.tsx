"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Phone, PhoneCall, Check, Star, AlertCircle, RefreshCw, MapPin, Lock, MessageSquare, XCircle, Calendar, Clock, Users, ChevronDown, ChevronUp, FileText, Quote } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AppHeader } from "@/components/AppHeader"
import { useAuth } from "@/lib/auth-context"
import { CallMapVisualization } from "./components/CallMapVisualization"
import { DynamicCallMap } from "./components/DynamicCallMap"
import { PayPalPayment } from "@/components/PayPalPayment"
import { BookingModal, BookingDetails, UserInfo } from "@/components/BookingModal"
import { getUserProfile } from "@/lib/user-profile"

const POLL_INTERVAL_MS = 5000 // 5 seconds during active calls

// Format 24-hour time to 12-hour format (e.g., "19:30" -> "7:30 PM")
function formatTime12Hour(time24: string): string {
  if (!time24 || !time24.includes(':')) return time24
  const [hours, minutes] = time24.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours % 12 || 12
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
}

// Hold expiration timer - 15 minutes from batch completion
const HOLD_DURATION_MS = 15 * 60 * 1000 // 15 minutes

function HoldCountdownTimer({ completedAt }: { completedAt?: number }) {
  const [timeLeft, setTimeLeft] = React.useState<number | null>(null)

  React.useEffect(() => {
    if (!completedAt) return

    const updateTimer = () => {
      const expiresAt = completedAt + HOLD_DURATION_MS
      const remaining = Math.max(0, expiresAt - Date.now())
      setTimeLeft(remaining)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [completedAt])

  if (timeLeft === null || timeLeft <= 0) {
    return (
      <div className="flex items-center justify-center gap-2 text-red-600 font-semibold">
        <AlertCircle className="h-4 w-4" />
        <span>Holds may have expired</span>
      </div>
    )
  }

  const minutes = Math.floor(timeLeft / 60000)
  const seconds = Math.floor((timeLeft % 60000) / 1000)
  const isUrgent = minutes < 5

  return (
    <div className={`flex items-center justify-center gap-2 font-semibold ${isUrgent ? "text-red-600" : "text-amber-600"}`}>
      <RefreshCw className={`h-4 w-4 ${isUrgent ? "animate-pulse" : ""}`} />
      <span>
        Holds expire in {minutes}:{seconds.toString().padStart(2, '0')}
      </span>
    </div>
  )
}

// Format elapsed seconds as M:SS (e.g., "1:23")
function formatElapsedTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Live call timer component - updates every second
function LiveCallTimer({ startedAt }: { startedAt?: number }) {
  const [elapsed, setElapsed] = React.useState(0)

  React.useEffect(() => {
    if (!startedAt) return

    // Calculate initial elapsed time
    const updateElapsed = () => {
      const now = Date.now()
      setElapsed(Math.floor((now - startedAt) / 1000))
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  if (!startedAt || elapsed < 0) return null

  return (
    <span className="text-xs text-orange-600 font-mono tabular-nums">
      {formatElapsedTime(elapsed)}
    </span>
  )
}

// Live status badge with elapsed time for rotating stage text
function LiveStatusBadge({ status, result, hideOutcome, startedAt }: {
  status?: CallStatus
  result?: CallResult
  hideOutcome?: boolean
  startedAt?: number
}) {
  const [elapsed, setElapsed] = React.useState(0)

  React.useEffect(() => {
    if (!startedAt || status !== "speaking") return

    const updateElapsed = () => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)
    return () => clearInterval(interval)
  }, [startedAt, status])

  return getStatusBadge(status, result, hideOutcome, elapsed)
}

// Restaurant card component for grouped display
function RestaurantCard({ item, index, isActive }: {
  item: BatchItem
  index: number
  isActive: boolean
}) {
  const callStatus = item.status as CallStatus | undefined

  return (
    <div
      className={`p-3 rounded-lg border transition-all ${isActive
        ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300 shadow-md"
        : item.result?.outcome === "hold_confirmed" || item.result?.outcome === "available"
          ? "bg-green-50 border-green-200"
          : "bg-white border-zinc-200"
        }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Number badge */}
          <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isActive
            ? "bg-orange-500 text-white"
            : "bg-zinc-200 text-zinc-600"
            }`}>
            {index}
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm truncate">{item.name}</div>
            <div className="flex items-center gap-1.5">
              <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
              <span className="text-xs text-zinc-600">{item.rating?.toFixed(1) || "N/A"}</span>
            </div>
          </div>
        </div>
        {/* Status badge - hide outcome until payment */}
        <div className="shrink-0 flex items-center gap-2">
          <LiveStatusBadge
            status={callStatus}
            result={item.result}
            hideOutcome={true}
            startedAt={item.startedAt}
          />
          {/* Live timer for active calls */}
          {isActive && item.startedAt && (
            <LiveCallTimer startedAt={item.startedAt} />
          )}
        </div>
        {/* Phone icon */}
        <Phone className={`shrink-0 h-4 w-4 ${isActive ? "text-orange-500 animate-pulse" : "text-zinc-300"
          }`} />
      </div>
    </div>
  )
}

type CallStatus = "pending" | "queued" | "calling" | "speaking" | "completed" | "failed" | "no_answer" | "skipped" | "error"

// Transcript message from the call
type TranscriptMessage = {
  role: "assistant" | "restaurant"
  content: string
  timestamp?: number
}

// Structured call notes generated by AI
type CallNotes = {
  summary: string
  availability_status: "available" | "not_available" | "alternative_offered" | "unknown"
  confirmed_time?: string
  alternative_times?: string[]
  hold_status?: {
    held: boolean
    hold_name?: string
    hold_duration?: string
  }
  group_details?: {
    private_room?: "available" | "required" | "not_available"
    minimum_spend?: string
    deposit_required?: boolean
    deposit_amount?: string
    prix_fixe_required?: boolean
    time_limit?: string
  }
  special_requests?: {
    honored: boolean
    details?: string
  }
  perks?: string[]
  next_steps?: string
  contact_info?: {
    name?: string
    callback_number?: string
  }
  key_quotes?: string[]
  confidence: "high" | "medium" | "low"
}

type CallResult = {
  outcome?: "available" | "not_available" | "hold_confirmed" | "voicemail" | "no_answer" | "failed" | "alternative"
  alternative_time?: string
  alt_time?: string  // Alias for alternative_time
  ai_summary?: string
  time_held?: string
  perks?: string
  special_request_status?: {
    honored: boolean
    note?: string
  }
  requires_deposit?: boolean  // Credit card required for booking
  // Large group (7+) specific fields
  private_room?: "available" | "required" | "not_available"
  minimum_spend?: string  // e.g., "$500", "$50 per person"
  prix_fixe_required?: boolean
  // NEW: Transcript and structured call notes
  transcript?: TranscriptMessage[]
  call_notes?: CallNotes
}

type EnrichedPlaceData = {
  place_id: string
  rating?: number
  user_ratings_total?: number
  price_level?: number
  formatted_phone_number?: string
  formatted_address?: string
  website?: string
  url?: string  // Google Maps URL
  editorial_summary?: {
    overview?: string
    language?: string
  }
  reviews?: Array<{
    author_name: string
    rating: number
    text: string
    relative_time_description: string
  }>
  opening_hours?: {
    open_now?: boolean
    weekday_text?: string[]
  }
}

type BatchItem = {
  id?: string
  place_id?: string
  name?: string
  phone?: string
  types?: string[]
  address?: string
  rating?: number  // May not be available until premium fetch
  user_ratings_total?: number  // May not be available until premium fetch
  price_level?: number  // May not be available until premium fetch
  opening_hours?: { open_now?: boolean }
  status?: CallStatus
  result?: CallResult
  distance_miles?: number  // May not be available until premium fetch
  lat?: number
  lng?: number
  startedAt?: number  // Epoch ms when call started
}

// ===============================
// Call Notes Display Component
// ===============================
// Collapsible transcript viewer — used inside the unified outcome card
function TranscriptToggle({ transcript }: { transcript?: TranscriptMessage[] }) {
  const [showTranscript, setShowTranscript] = React.useState(false)

  if (!transcript || transcript.length === 0) return null

  return (
    <div className="mt-3 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setShowTranscript(!showTranscript)}
        className="w-full flex items-center justify-between p-2.5 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
      >
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
          <MessageSquare className="h-3.5 w-3.5" />
          View Call Transcript ({transcript.length} messages)
        </div>
        {showTranscript ? (
          <ChevronUp className="h-3.5 w-3.5 text-zinc-500" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
        )}
      </button>
      
      {showTranscript && (
        <div className="p-4 bg-white dark:bg-zinc-900 space-y-3 max-h-80 overflow-y-auto">
          {transcript.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "assistant" ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[80%] rounded-lg p-3 text-sm ${
                msg.role === "assistant" 
                  ? "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100" 
                  : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
              }`}>
                <div className="text-xs font-semibold mb-1 opacity-70">
                  {msg.role === "assistant" ? "RezKyoo AI" : "Restaurant"}
                </div>
                <p>{msg.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function getStatusIcon(status?: CallStatus, result?: CallResult) {
  // After calls complete, show outcome-based icons
  if (status === "completed" && result) {
    if (result.outcome === "available" || result.outcome === "hold_confirmed") {
      return <Check className="h-5 w-5 text-emerald-500" />
    }
    if (result.outcome === "not_available") {
      if (result.alternative_time || result.alt_time) {
        return <AlertCircle className="h-5 w-5 text-amber-500" />
      }
      return <XCircle className="h-5 w-5 text-zinc-400" />
    }
    return <XCircle className="h-5 w-5 text-zinc-400" />
  }
  
  switch (status) {
    case "calling":
      return <PhoneCall className="h-5 w-5 text-amber-500 animate-pulse" />
    case "speaking":
      return <MessageSquare className="h-5 w-5 text-blue-500 animate-pulse" />
    case "completed":
      return <Check className="h-5 w-5 text-zinc-400" />
    case "failed":
    case "no_answer":
    case "error":
      return <XCircle className="h-5 w-5 text-zinc-400" />
    case "skipped":
      return <Phone className="h-5 w-5 text-zinc-300" />
    default:
      return <Phone className="h-5 w-5 text-zinc-400" />
  }
}

function getStatusBadge(status?: CallStatus, result?: CallResult, hideOutcome?: boolean, elapsedSeconds?: number) {
  // Speaking - YELLOW animated with rotating stage text (safe, doesn't reveal outcome)
  if (status === "speaking") {
    // Rotate through safe stage messages based on elapsed time
    const stages = [
      "Speaking with staff...",
      "Checking availability...",
      "Gathering info...",
      "Working on it...",
    ]
    const stageIndex = Math.floor((elapsedSeconds || 0) / 10) % stages.length
    const stageText = stages[stageIndex]

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-400 text-yellow-900 shadow-sm animate-pulse">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-600 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-600"></span>
        </span>
        {stageText}
      </span>
    )
  }
  // Calling - ORANGE pulsing
  if (status === "calling") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-400 text-orange-900 shadow-sm animate-pulse">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-600 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-600"></span>
        </span>
        Calling...
      </span>
    )
  }
  // Completed - Show neutral "Done" if outcome should be hidden (before payment)
  if (status === "completed") {
    if (hideOutcome) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-200 text-zinc-600 shadow-sm">
          Done <Check className="h-3 w-3" />
        </span>
      )
    }
    // After payment - show actual outcome
    if (result?.outcome === "hold_confirmed" || result?.outcome === "available") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500 text-white shadow-sm">
          Available <Check className="h-3 w-3" />
        </span>
      )
    }
    if (result?.outcome === "not_available") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 shadow-sm">
          Unavailable
        </span>
      )
    }
    // Fallback for completed without clear outcome
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-200 text-zinc-700 shadow-sm">
        Done <Check className="h-3 w-3" />
      </span>
    )
  }
  // No Answer / Failed - GRAY with X (neutral, doesn't reveal result)
  if (status === "failed" || status === "no_answer" || status === "error") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-200 text-zinc-600 shadow-sm">
        Done <Check className="h-3 w-3" />
      </span>
    )
  }
  // Queued/Pending - Soft gray (shows when waiting, but shouldn't appear much in completed state)
  if (status === "pending" || !status) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-400">
        Waiting
      </span>
    )
  }
  // Skipped
  if (status === "skipped") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-500">
        Skipped
      </span>
    )
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

type ReservationDetails = {
  date?: string
  time?: string
  party_size?: number
  special_requests?: string
}

// Detail chips for call conditions (deposits, private rooms, set menus, etc.)
function OutcomeDetailChips({ result, callNotes }: { result: CallResult; callNotes?: CallNotes }) {
  const chips: { icon: string; label: string; color: string }[] = []

  // Prefer call_notes.group_details (richer data from AI analysis) over flat result fields
  const gd = callNotes?.group_details

  // Private room
  const privateRoom = gd?.private_room || result.private_room
  if (privateRoom === "required") chips.push({ icon: "🚪", label: "Private room required", color: "bg-violet-100 text-violet-700 border-violet-200" })
  else if (privateRoom === "available") chips.push({ icon: "🚪", label: "Private room available", color: "bg-violet-50 text-violet-600 border-violet-200" })

  // Prix fixe / set menu
  const prixFixe = gd?.prix_fixe_required ?? result.prix_fixe_required
  if (prixFixe) chips.push({ icon: "🍽️", label: "Set menu required", color: "bg-orange-100 text-orange-700 border-orange-200" })

  // Deposit / credit card
  const depositReq = gd?.deposit_required ?? result.requires_deposit
  if (depositReq) {
    const amt = gd?.deposit_amount
    chips.push({ icon: "💳", label: amt ? `Deposit: ${amt}` : "Deposit required", color: "bg-amber-100 text-amber-700 border-amber-200" })
  }

  // Minimum spend
  const minSpend = gd?.minimum_spend || result.minimum_spend
  if (minSpend) chips.push({ icon: "💰", label: `Min spend: ${minSpend}`, color: "bg-amber-100 text-amber-700 border-amber-200" })

  // Time limit
  if (gd?.time_limit) chips.push({ icon: "⏱️", label: `Time limit: ${gd.time_limit}`, color: "bg-zinc-100 text-zinc-600 border-zinc-200" })

  // Perks
  const perks = callNotes?.perks || (result.perks ? [result.perks] : null)
  if (perks && perks.length > 0) {
    perks.forEach(p => chips.push({ icon: "🎁", label: p, color: "bg-emerald-50 text-emerald-700 border-emerald-200" }))
  }

  if (chips.length === 0) return null

  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {chips.map((chip, i) => (
        <span key={i} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${chip.color}`}>
          <span>{chip.icon}</span>
          {chip.label}
        </span>
      ))}
    </div>
  )
}

function getOutcomeMessage(result?: CallResult, onBook?: () => void, reservation?: ReservationDetails, isBooked?: boolean) {
  if (!result) return null

  const notes = result.call_notes
  const hasNotes = Boolean(notes?.summary)

  // AI-generated summary (preferred) or flat ai_summary fallback
  const summaryText = notes?.summary || result.ai_summary

  // Special request display — only show when there are NO call_notes
  const specialRequestInfo = !hasNotes && result.special_request_status ? (
    <div className={`mt-2 p-2 rounded text-xs flex items-start gap-2 ${
      result.special_request_status.honored 
        ? "bg-emerald-50/50 text-emerald-700"
        : "bg-amber-50/50 text-amber-700"
    }`}>
      <span>{result.special_request_status.honored ? "✓" : "⚠"}</span>
      <span>{result.special_request_status.note || (result.special_request_status.honored ? "Special request can be accommodated" : "Special request may not be available")}</span>
    </div>
  ) : null

  // Key quotes from the call (inline, not a separate box)
  const keyQuotes = notes?.key_quotes && notes.key_quotes.length > 0 ? (
    <div className="mt-3 space-y-1.5">
      {notes.key_quotes.slice(0, 2).map((quote, i) => (
        <p key={i} className="text-xs italic pl-3 border-l-2 border-current/20 opacity-70">
          "{quote}"
        </p>
      ))}
    </div>
  ) : null

  // Next steps callout
  const nextSteps = notes?.next_steps ? (
    <div className="mt-2 text-xs font-medium opacity-80">
      📌 {notes.next_steps}
    </div>
  ) : null

  // Contact info
  const contactInfo = notes?.contact_info?.name ? (
    <div className="mt-1 text-xs opacity-60">Spoke with: {notes.contact_info.name}</div>
  ) : null

  // Booked state
  const bookedBadge = isBooked ? (
    <div className="mt-3 w-full py-2 px-4 bg-emerald-100 text-emerald-700 font-semibold rounded-lg text-center border-2 border-emerald-300">
      ✓ Booked!
    </div>
  ) : null

  if (result.outcome === "hold_confirmed") {
    return (
      <div className="rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 text-sm">
        <div className="font-semibold text-emerald-700 flex items-center gap-1.5">
          <span>🎉</span> Table on hold!
          {(notes?.hold_status?.hold_duration) && (
            <span className="text-xs font-normal text-emerald-600/70">({notes.hold_status.hold_duration})</span>
          )}
        </div>
        {(notes?.confirmed_time || result.time_held) && (
          <div className="text-emerald-600 mt-1 font-medium">⏰ {notes?.confirmed_time || result.time_held}</div>
        )}
        {summaryText && (
          <div className="mt-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600/70 uppercase tracking-wide mb-1">
              <FileText className="h-3 w-3" /> AI Call Summary
            </div>
            <p className="text-emerald-700/80">{summaryText}</p>
          </div>
        )}
        <OutcomeDetailChips result={result} callNotes={notes} />
        {specialRequestInfo}
        {keyQuotes}
        {nextSteps}
        {contactInfo}
        <TranscriptToggle transcript={result.transcript} />
        {bookedBadge || (onBook && (
          <button onClick={onBook} className="mt-3 w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors">
            ✓ Book This Restaurant
          </button>
        ))}
      </div>
    )
  }

  if (result.outcome === "available") {
    return (
      <div className="rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 p-4 text-sm">
        <div className="font-semibold text-emerald-700">✨ Table available!</div>
        {notes?.confirmed_time && (
          <div className="text-emerald-600 mt-1 font-medium">⏰ {notes.confirmed_time}</div>
        )}
        {summaryText && (
          <div className="mt-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600/70 uppercase tracking-wide mb-1">
              <FileText className="h-3 w-3" /> AI Call Summary
            </div>
            <p className="text-emerald-700/80">{summaryText}</p>
          </div>
        )}
        <OutcomeDetailChips result={result} callNotes={notes} />
        {specialRequestInfo}
        {keyQuotes}
        {nextSteps}
        {contactInfo}
        <TranscriptToggle transcript={result.transcript} />
        {bookedBadge || (onBook && (
          <button onClick={onBook} className="mt-3 w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors">
            ✓ Book This Restaurant
          </button>
        ))}
      </div>
    )
  }

  const altTime = notes?.alternative_times?.[0] || result.alternative_time || result.alt_time
  if (altTime) {
    return (
      <div className="rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 text-sm">
        <div className="font-semibold text-amber-700">⏰ Alternative time available</div>
        <div className="text-amber-800 font-medium text-base mt-1">Available at: {altTime}</div>
        {notes?.alternative_times && notes.alternative_times.length > 1 && (
          <div className="text-xs text-amber-600 mt-0.5">Also available: {notes.alternative_times.slice(1).join(", ")}</div>
        )}
        {summaryText && (
          <div className="mt-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600/70 uppercase tracking-wide mb-1">
              <FileText className="h-3 w-3" /> AI Call Summary
            </div>
            <p className="text-amber-600/80">{summaryText}</p>
          </div>
        )}
        <OutcomeDetailChips result={result} callNotes={notes} />
        {specialRequestInfo}
        {keyQuotes}
        {nextSteps}
        {contactInfo}
        <TranscriptToggle transcript={result.transcript} />
        {bookedBadge || (onBook && (
          <button onClick={onBook} className="mt-3 w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors">
            Book for {altTime}
          </button>
        ))}
      </div>
    )
  }

  if (result.outcome === "not_available") {
    return (
      <div className="rounded-lg bg-zinc-100 border border-zinc-200 p-3 text-sm text-zinc-500">
        <div className="font-medium">No availability at requested time</div>
        {summaryText && (
          <div className="mt-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400/80 uppercase tracking-wide mb-1">
              <FileText className="h-3 w-3" /> AI Call Summary
            </div>
            <p className="text-zinc-400">{summaryText}</p>
          </div>
        )}
        <TranscriptToggle transcript={result.transcript} />
      </div>
    )
  }

  if (summaryText) {
    return (
      <div className="rounded-lg bg-zinc-100 border border-zinc-200 p-4 text-sm text-zinc-600">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500/70 uppercase tracking-wide mb-1">
          <FileText className="h-3 w-3" /> AI Call Summary
        </div>
        <p>{summaryText}</p>
        <TranscriptToggle transcript={result.transcript} />
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
  const [completedAt, setCompletedAt] = React.useState<number | null>(null)
  const [holdsExpired, setHoldsExpired] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isStartingCalls, setIsStartingCalls] = React.useState(false)
  const [mapUrl, setMapUrl] = React.useState<string | null>(null)
  const [userLocation, setUserLocation] = React.useState<{ lat: number; lng: number } | null>(null)
  const [enrichedData, setEnrichedData] = React.useState<Record<string, EnrichedPlaceData>>({})
  const [isEnriching, setIsEnriching] = React.useState(false)
  const [query, setQuery] = React.useState<{
    location?: string
    party_size?: number
    date?: string
    time?: string
    craving?: { chips?: string[] }
    special_requests?: string
  } | null>(null)

  // Track hold expiry — disable payment after 15 minutes
  React.useEffect(() => {
    if (!completedAt) return
    const checkExpiry = () => {
      const expired = Date.now() >= completedAt + HOLD_DURATION_MS
      setHoldsExpired(expired)
    }
    checkExpiry()
    const interval = setInterval(checkExpiry, 1000)
    return () => clearInterval(interval)
  }, [completedAt])

  // Booking modal state
  const [bookingModalOpen, setBookingModalOpen] = React.useState(false)
  const [bookingDetails, setBookingDetails] = React.useState<BookingDetails | null>(null)
  const [userInfo, setUserInfo] = React.useState<UserInfo>({})
  const [confirmedBookingId, setConfirmedBookingId] = React.useState<string | null>(null)
  const [confirmedBookingDetails, setConfirmedBookingDetails] = React.useState<BookingDetails | null>(null)

  // Count other available restaurants (for "try another" option in BookingModal)
  const otherAvailableCount = React.useMemo(() => {
    if (!bookingDetails) return 0
    return items.filter(item => {
      const itemId = item.id || item.place_id || ""
      const isCurrentBooking = itemId === bookingDetails.placeId
      const isAvailable = item.result?.outcome === "available" || 
                          item.result?.outcome === "hold_confirmed" ||
                          item.result?.alternative_time || 
                          item.result?.alt_time
      return !isCurrentBooking && isAvailable
    }).length
  }, [items, bookingDetails])

  // Release holds at other restaurants after a successful booking
  const releaseOtherHolds = React.useCallback(async (bookedPlaceId: string) => {
    if (!batchId) return
    
    // Find all restaurants with holds that are NOT the booked one
    const holdsToRelease = items.filter(item => {
      const itemId = item.id || item.place_id || ""
      const isBookedRestaurant = itemId === bookedPlaceId
      const hasHold = item.result?.outcome === "hold_confirmed"
      return !isBookedRestaurant && hasHold
    })

    if (holdsToRelease.length === 0) {
      console.log("No holds to release")
      return
    }

    console.log(`Releasing holds at ${holdsToRelease.length} restaurant(s)...`)

    // Release holds in parallel (fire and forget - don't block the UI)
    const releasePromises = holdsToRelease.map(async (item) => {
      try {
        await fetch("/api/mcp/release-hold", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            batchId,
            placeId: item.place_id || item.id,
            restaurantName: item.name,
            restaurantPhone: item.phone,
          }),
        })
        console.log(`Released hold at ${item.name}`)
      } catch (err) {
        console.error(`Failed to release hold at ${item.name}:`, err)
      }
    })

    // Don't await - let these run in the background
    Promise.all(releasePromises).catch(console.error)
  }, [batchId, items])

  // Fetch user profile for booking modal
  React.useEffect(() => {
    let cancelled = false

    async function loadUserInfo() {
      if (!user?.uid) return

      try {
        const profile = await getUserProfile(user.uid)
        if (cancelled) return

        setUserInfo({
          name: profile?.displayName || user.displayName || undefined,
          phone: profile?.phoneNumber || user.phoneNumber || undefined,
        })
      } catch (error) {
        if (cancelled) return
        setUserInfo({
          name: user.displayName || undefined,
          phone: user.phoneNumber || undefined,
        })
      }
    }

    loadUserInfo()
    return () => {
      cancelled = true
    }
  }, [user?.uid, user?.displayName])

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
        // Track when batch first transitions to completed
        if (data.status === "completed" && status !== "completed") {
          setCompletedAt(Date.now())
        }
        setStatus(data.status)
      }
      if (Array.isArray(data?.items)) {
        setItems(data.items)
      }
      // FIX: Only show paywall AFTER batch is completed, never mid-flight
      if (data?.paywall_required && data?.status === "completed") {
        setPaywallRequired(true)
      } else if (data?.status === "completed") {
        setPaywallRequired(false)
      }
      if (data?.map_url) {
        setMapUrl(data.map_url)
      }
      if (data?.query) {
        setQuery(data.query)
      }

      // Extract user location - prioritize exact GPS from sessionStorage
      // 1. Check sessionStorage for exact GPS coordinates (stored by search page)
      const sessionKey = `batch_${batchId}_userLocation`
      const storedLocation = typeof window !== 'undefined' ? sessionStorage.getItem(sessionKey) : null
      if (storedLocation) {
        try {
          const coords = JSON.parse(storedLocation)
          if (coords.lat && coords.lng) {
            setUserLocation(coords)
            // Clean up after use
            sessionStorage.removeItem(sessionKey)
            return  // Skip other fallbacks - we have exact GPS
          }
        } catch (e) {
          // Invalid JSON, continue to fallbacks
        }
      }

      // 2. Check if backend returned user_location (exact GPS if backend stored it)
      if (data?.user_location?.lat && data?.user_location?.lng) {
        setUserLocation(data.user_location)
      }
      // 3. Fallback to map_center (geocoded city center)
      else if (data?.map_center?.lat && data?.map_center?.lng) {
        setUserLocation({ lat: data.map_center.lat, lng: data.map_center.lng })
      }
      // 4. Last resort: Estimate from restaurant positions
      else if (Array.isArray(data?.items) && data.items.length > 0 && data.items[0].lat) {
        const lats = data.items.filter((i: any) => i.lat).map((i: any) => i.lat)
        const lngs = data.items.filter((i: any) => i.lng).map((i: any) => i.lng)
        if (lats.length > 0) {
          setUserLocation({
            lat: lats.reduce((a: number, b: number) => a + b, 0) / lats.length,
            lng: lngs.reduce((a: number, b: number) => a + b, 0) / lngs.length,
          })
        }
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

  // Fetch premium data from Google Places API after payment
  // Only fetches for available restaurants to minimize API costs
  React.useEffect(() => {
    const canViewResults = !paywallRequired
    const isCompleted = status === "completed"
    
    // Only fetch if: completed, paid, have items, and haven't already fetched
    if (!isCompleted || !canViewResults || items.length === 0 || isEnriching || Object.keys(enrichedData).length > 0) {
      return
    }

    // Get place_ids of available restaurants only
    const availablePlaceIds = items
      .filter(item => 
        item.place_id && 
        (item.result?.outcome === "available" || 
         item.result?.outcome === "hold_confirmed" || 
         item.result?.alternative_time || item.result?.alt_time)
      )
      .map(item => item.place_id!)

    if (availablePlaceIds.length === 0) return

    const fetchEnrichedData = async () => {
      setIsEnriching(true)
      try {
        const response = await fetch("/api/places/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ place_ids: availablePlaceIds }),
        })
        const result = await response.json()
        if (result.ok && result.data) {
          setEnrichedData(result.data)
        }
      } catch (err) {
        console.error("Failed to fetch enriched data:", err)
      } finally {
        setIsEnriching(false)
      }
    }

    fetchEnrichedData()
  }, [status, paywallRequired, items, isEnriching, enrichedData])

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
  const pendingItems = items.filter(i => !i.status || i.status === "pending" || i.status === "queued").length
  const holdsConfirmed = items.filter(i => i.result?.outcome === "hold_confirmed").length
  const available = items.filter(i =>
    i.result?.outcome === "available" || i.result?.outcome === "hold_confirmed"
  ).length

  // Tiered pricing based on party size
  const LARGE_GROUP_THRESHOLD = 7
  const isLargeGroup = (query?.party_size || 2) >= LARGE_GROUP_THRESHOLD
  const unlockPrice = isLargeGroup ? 3.99 : 1.99
  
  // Paywall logic:
  // - forceHideResults is a dev flag to always require payment
  // - paywallRequired comes from the backend (false if paid token is valid)
  // - canViewResults is true when either: no paywall needed, OR payment was made
  const forceHideResults = process.env.NEXT_PUBLIC_REZKYOO_HIDE_RESULTS === "true"
  const canViewResults = !paywallRequired  // Payment clears the paywall

  // === MONOTONIC STAGE FUNCTION ===
  // Stage can only advance: searching → ready → calling → completed
  // This prevents contradictory UI states
  type UIStage = "searching" | "ready" | "calling" | "completed"

  const computeStage = (): UIStage => {
    // Stage 4: Completed (terminal - once true, always true)
    if (status === "completed") return "completed"

    // Stage 3: Calling (any call has started or is in progress)
    if (
      status === "calling" ||
      status === "running" ||
      callingItems > 0 ||
      speakingItems > 0 ||
      (completedItems > 0 && completedItems < totalItems) // Some done but not all
    ) return "calling"

    // Stage 2: Ready (restaurants found, waiting to start calls)
    if (status === "found" && totalItems > 0) return "ready"

    // Stage 1: Searching (default/loading)
    return "searching"
  }

  // Store previous stage to prevent regression
  const prevStageRef = React.useRef<UIStage>("searching")
  const currentStage = computeStage()

  // Monotonic: only allow stage to advance, never regress
  const stageOrder: Record<UIStage, number> = { searching: 0, ready: 1, calling: 2, completed: 3 }
  const stage: UIStage = stageOrder[currentStage] >= stageOrder[prevStageRef.current]
    ? currentStage
    : prevStageRef.current

  // Update ref for next render
  React.useEffect(() => {
    if (stageOrder[stage] > stageOrder[prevStageRef.current]) {
      prevStageRef.current = stage
    }
  }, [stage])

  // Derived booleans from stage (simple and unambiguous)
  const isSearching = stage === "searching"
  const isReady = stage === "ready"
  const isCalling = stage === "calling"
  const isCompleted = stage === "completed"

  return (
    <>
      <AppHeader />
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
                    {isReady ? "Restaurants Found!" :
                      isCalling ? "Checking Availability..." :
                        isCompleted ? "Results" : "Finding Restaurants..."}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isReady && `${items.length} restaurants match your search`}
                    {isCalling && `${callingItems} calling, ${pendingItems} queued`}
                    {isCompleted && (canViewResults
                      ? `${available} available out of ${totalItems} called`
                      : `${totalItems} calls completed`)}
                  </p>
                  {/* Info note about closed restaurants - only show in ready state */}
                  {isReady && (
                    <p className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Only showing restaurants that are currently open and staffed to answer calls
                    </p>
                  )}
                </div>
                {isCalling && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 text-red-700">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">Live</span>
                  </div>
                )}
                {isCompleted && canViewResults && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="h-4 w-4" />
                    <span className="text-sm font-medium">Unlocked</span>
                  </div>
                )}
              </div>

              {/* Search Query Banner - Simplified */}
              {query && (
                <div className="flex flex-wrap items-center gap-2 mt-3 text-sm">
                  {/* Show user's craving/search term - filter out confusing generic terms */}
                  {Array.isArray(query.craving?.chips) && query.craving.chips.filter(chip =>
                    // Filter out generic/meaningless chips
                    typeof chip === 'string' && !['cuisine', 'dishes', 'dish', '$', '$$', '$$$', 'no exclusions', 'any', 'food', 'restaurant', 'restaurants'].includes(chip.toLowerCase())
                  ).slice(0, 3).map((chip, i) => (
                    <span key={i} className="px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">
                      {chip}
                    </span>
                  ))}
                  {query.party_size && (
                    <span className="px-2 py-1 rounded-full bg-zinc-100 text-zinc-700">
                      {query.party_size} guests
                    </span>
                  )}
                  {query.time && typeof query.time === 'string' && (
                    <span className="px-2 py-1 rounded-full bg-zinc-100 text-zinc-700">
                      {formatTime12Hour(query.time)}
                    </span>
                  )}
                  {query.date && typeof query.date === 'string' && (
                    <span className="px-2 py-1 rounded-full bg-zinc-100 text-zinc-700">
                      {query.date}
                    </span>
                  )}
                  {query.location && typeof query.location === 'string' && (
                    <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {query.location.length > 30 ? query.location.substring(0, 30) + "..." : query.location}
                    </span>
                  )}
                </div>
              )}

              {/* Confirmed Booking Banner */}
              {confirmedBookingId && confirmedBookingDetails && (
                <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <Check className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-emerald-800 text-lg">Booking Confirmed!</div>
                      <div className="text-emerald-700 font-medium">{confirmedBookingDetails.restaurantName}</div>
                      <div className="flex flex-wrap gap-3 mt-2 text-sm text-emerald-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {confirmedBookingDetails.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatTime12Hour(confirmedBookingDetails.alternativeTime || confirmedBookingDetails.time)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {confirmedBookingDetails.partySize} guests
                        </span>
                      </div>
                      {confirmedBookingDetails.specialRequestStatus && (
                        <div className={`mt-2 text-sm flex items-center gap-1 ${
                          confirmedBookingDetails.specialRequestStatus.honored ? "text-emerald-600" : "text-amber-600"
                        }`}>
                          {confirmedBookingDetails.specialRequestStatus.honored ? "✓" : "⚠"}
                          <span>
                            {confirmedBookingDetails.specialRequestStatus.honored 
                              ? "Special request confirmed" 
                              : "Special request note"}
                            {confirmedBookingDetails.specialRequestStatus.note && 
                              `: ${confirmedBookingDetails.specialRequestStatus.note}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {/* SPLIT VIEW DURING CALLS - Map left, Restaurant cards right */}
              {isCalling && userLocation && items.length > 0 && (() => {
                // Find active restaurant for highlight
                const activeItem = items.find(i =>
                  i.status === "calling" || i.status === "speaking"
                )
                const activeRestaurantId = activeItem?.id || activeItem?.place_id || null

                return (
                  <div className="flex flex-col lg:flex-row gap-4">
                    {/* Left: Map */}
                    <div className="lg:w-3/5 relative">
                      <DynamicCallMap
                        renderPhase="process"
                        center={userLocation}
                        userLocation={userLocation}
                        activeRestaurantId={activeRestaurantId}
                        restaurants={items.filter(item => item.lat && item.lng).map((item, idx) => ({
                          id: item.id || item.place_id || item.name || '',
                          name: item.name || 'Unknown',
                          lat: item.lat!,
                          lng: item.lng!,
                          index: idx + 1,
                        }))}
                      />
                      {/* Floating "Speaking with staff..." indicator on map */}
                      {activeItem && activeItem.status === "speaking" && (
                        <div className="absolute top-4 left-4 bg-yellow-400 text-yellow-900 px-3 py-2 rounded-lg shadow-lg text-sm font-medium animate-pulse flex items-center gap-2 z-10">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-600 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-600"></span>
                          </span>
                          Speaking with staff...
                        </div>
                      )}
                    </div>

                    {/* Right: Restaurant status cards - GROUPED BY STATUS */}
                    <div className="lg:w-2/5 space-y-3 max-h-[400px] overflow-y-auto pr-1">
                      {/* Summary counts at top */}
                      <div className="flex flex-wrap gap-2 text-xs font-medium pb-2 border-b border-zinc-200">
                        {speakingItems > 0 && (
                          <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                            🔊 {speakingItems} speaking
                          </span>
                        )}
                        {callingItems - speakingItems > 0 && (
                          <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700">
                            📞 {callingItems - speakingItems} calling
                          </span>
                        )}
                        {pendingItems > 0 && (
                          <span className="px-2 py-1 rounded-full bg-zinc-100 text-zinc-600">
                            ⏳ {pendingItems} waiting
                          </span>
                        )}
                        {completedItems > 0 && (
                          <span className="px-2 py-1 rounded-full bg-zinc-100 text-zinc-600">
                            ✓ {completedItems} done
                          </span>
                        )}
                      </div>

                      {/* Active Calls Section */}
                      {(() => {
                        const activeItems = items.filter(i =>
                          i.status === "calling" || i.status === "speaking"
                        )
                        if (activeItems.length === 0) return null
                        return (
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-orange-600 uppercase tracking-wider flex items-center gap-1">
                              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                              Active Calls
                            </h4>
                            {activeItems.map((item) => {
                              const originalIdx = items.findIndex(i => i.place_id === item.place_id)
                              return (
                                <RestaurantCard
                                  key={item.place_id || item.id}
                                  item={item}
                                  index={originalIdx + 1}
                                  isActive={true}
                                />
                              )
                            })}
                          </div>
                        )
                      })()}

                      {/* Waiting Section */}
                      {(() => {
                        const waitingItems = items.filter(i => !i.status || i.status === "pending" || i.status === "queued")
                        if (waitingItems.length === 0) return null
                        return (
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                              Waiting
                            </h4>
                            {waitingItems.map((item) => {
                              const originalIdx = items.findIndex(i => i.place_id === item.place_id)
                              return (
                                <RestaurantCard
                                  key={item.place_id || item.id}
                                  item={item}
                                  index={originalIdx + 1}
                                  isActive={false}
                                />
                              )
                            })}
                          </div>
                        )
                      })()}

                      {/* Completed Section */}
                      {(() => {
                        const doneItems = items.filter(i =>
                          ["completed", "failed", "no_answer", "error", "skipped"].includes(i.status || "")
                        )
                        if (doneItems.length === 0) return null
                        return (
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                              Completed
                            </h4>
                            {doneItems.map((item) => {
                              const originalIdx = items.findIndex(i => i.place_id === item.place_id)
                              return (
                                <RestaurantCard
                                  key={item.place_id || item.id}
                                  item={item}
                                  index={originalIdx + 1}
                                  isActive={false}
                                />
                              )
                            })}
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                )
              })()}

              {/* Map Widget - show in found state (before calls) - uses DynamicCallMap for proper auto-zoom */}
              {!isCalling && !isCompleted && userLocation && items.length > 0 && (
                <div className="mb-6">
                  <DynamicCallMap
                    renderPhase="process"
                    center={userLocation}
                    userLocation={userLocation}
                    activeRestaurantId={null}
                    restaurants={items.filter(item => item.lat && item.lng).map(item => ({
                      id: item.id || item.place_id || item.name || '',
                      name: item.name || 'Unknown',
                      lat: item.lat!,
                      lng: item.lng!,
                    }))}
                  />
                </div>
              )}
              {/* Progress bar - only during calls */}
              {(isCalling || isCompleted) && totalItems > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>{completedItems} of {totalItems} calls completed</span>
                    {canViewResults && holdsConfirmed > 0 && (
                      <span className="text-red-600 font-semibold">
                        {holdsConfirmed} hold{holdsConfirmed > 1 ? "s" : ""} confirmed! 🎉
                      </span>
                    )}
                  </div>
                  <div className="h-3 bg-zinc-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 transition-all duration-500 ${isCalling ? "animate-pulse" : ""}`}
                      style={{ width: `${(completedItems / totalItems) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Stats when complete */}
              {isCompleted && (
                <div className="grid grid-cols-3 gap-4 text-center mt-4">
                  <div className="rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-50 p-4 shadow-sm">
                    <div className="text-3xl font-bold">{totalItems}</div>
                    <div className="text-xs text-muted-foreground font-medium">Called</div>
                  </div>
                  {/* Available - ALWAYS show count (tease value before payment) */}
                  <div className={`rounded-xl p-4 shadow-sm ${available > 0
                    ? "bg-gradient-to-br from-green-200 to-emerald-100 ring-2 ring-green-400"
                    : "bg-gradient-to-br from-zinc-100 to-zinc-50"}`}>
                    <div className={`text-3xl font-bold ${available > 0 ? "text-green-600" : "text-zinc-400"}`}>
                      {available > 0 ? available : "0"}
                    </div>
                    <div className={`text-xs font-medium ${available > 0 ? "text-green-600" : "text-zinc-400"}`}>
                      {available > 0 ? "Available! 🎉" : "None found"}
                    </div>
                  </div>
                  {/* Holds - ALWAYS show count */}
                  <div className={`rounded-xl p-4 shadow-sm ${holdsConfirmed > 0
                    ? "bg-gradient-to-br from-amber-200 to-orange-100 ring-2 ring-amber-400"
                    : "bg-gradient-to-br from-zinc-100 to-zinc-50"}`}>
                    <div className={`text-3xl font-bold ${holdsConfirmed > 0 ? "text-amber-600" : "text-zinc-400"}`}>
                      {holdsConfirmed > 0 ? holdsConfirmed : "0"}
                    </div>
                    <div className={`text-xs font-medium ${holdsConfirmed > 0 ? "text-amber-600" : "text-zinc-400"}`}>
                      {holdsConfirmed > 0 ? "On Hold! 🎉" : "No holds"}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Button - Changes based on state - Hide when results are unlocked */}
          {items.length > 0 && !(isCompleted && canViewResults) && (
            <Card className={`border-0 shadow-lg ${isCalling ? "bg-gradient-to-r from-amber-500 to-orange-500" :
              isCompleted ? "bg-white/95 ring-1 ring-zinc-200" :
                "bg-gradient-to-r from-red-500 to-red-600"
              }`}>
              <CardContent className="p-4">
                {/* STATE: Calls In Progress - Show progress with time estimate */}
                {isCalling && (
                  <div className="text-center">
                    <div className="w-full h-14 flex items-center justify-center text-lg font-semibold bg-white/90 text-amber-700 rounded-md shadow-lg">
                      <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                      Calling {completedItems + 1} of {totalItems}
                    </div>
                    <p className="text-white/80 text-sm mt-2">
                      ~{Math.max(1, Math.ceil((totalItems - completedItems) * 0.5))} min remaining
                    </p>
                  </div>
                )}

                {/* STATE: All Calls Complete - Show payment or results */}
                {isCompleted && (
                  !canViewResults ? (
                    // Check if there's anything worth paying for
                    available > 0 ? (
                      holdsExpired ? (
                        // Holds expired — disable payment, prompt new search
                        <div className="text-center py-4 space-y-4">
                          <div className="bg-white/95 rounded-lg p-4">
                            <div className="flex items-center justify-center gap-2 text-red-600 font-semibold mb-2">
                              <AlertCircle className="h-5 w-5" />
                              <span>Holds have expired</span>
                            </div>
                            <p className="text-zinc-600 text-sm">
                              The restaurants may have released the tables they were holding.
                              Search again to get fresh availability.
                            </p>
                          </div>
                          <Button
                            onClick={() => router.push("/app/search")}
                            className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg"
                          >
                            Search Again
                          </Button>
                        </div>
                      ) : (
                      <div className="space-y-4">
                        {/* Hold Timer Warning */}
                        <div className="bg-white/95 rounded-lg p-3 text-center">
                          <HoldCountdownTimer completedAt={completedAt || Date.now()} />
                          <p className="text-xs text-gray-500 mt-1">
                            Restaurants are holding tables for you
                          </p>
                        </div>

                        {/* Success message - tease value */}
                        <div className="bg-white rounded-lg p-3 text-zinc-800 text-center border border-emerald-200">
                          <h4 className="font-semibold text-lg mb-1">🎉 Great news!</h4>
                          <p className="text-zinc-600">
                            We found <span className="font-bold text-emerald-700">{available} restaurant{available > 1 ? 's' : ''}</span> with availability!
                          </p>
                          {holdsConfirmed > 0 && (
                            <p className="text-amber-600 text-sm mt-1">
                              {holdsConfirmed} already holding a table for you
                            </p>
                          )}
                        </div>

                        {/* What you're unlocking */}
                        <div className="bg-white rounded-lg p-3 text-zinc-700 border border-zinc-200">
                          <h4 className="font-semibold text-center mb-2 text-zinc-800">🔓 Unlock to see:</h4>
                          <ul className="text-sm space-y-1 text-zinc-600">
                            <li className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-emerald-600" />
                              Which restaurants are available
                            </li>
                            <li className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-emerald-600" />
                              Contact info & booking details
                            </li>
                            <li className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-emerald-600" />
                              Alternative time suggestions
                            </li>
                            {isLargeGroup && (
                              <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-emerald-600" />
                                Private room & minimum spend info
                              </li>
                            )}
                          </ul>
                        </div>

                        {/* Price callout */}
                        <div className="text-center text-zinc-900">
                          <span className="text-2xl font-bold">${unlockPrice.toFixed(2)}</span>
                          <span className="text-zinc-500 text-sm ml-2">one-time unlock</span>
                          {isLargeGroup && (
                            <div className="text-xs text-zinc-500 mt-1">
                              Large group pricing ({query?.party_size}+ guests)
                            </div>
                          )}
                        </div>

                        {/* PayPal Buttons */}
                        <PayPalPayment
                          batchId={batchId || ""}
                          amount={unlockPrice}
                          description={isLargeGroup 
                            ? `Unlock ${available} restaurants for party of ${query?.party_size}` 
                            : `Unlock ${available} available restaurants`
                          }
                        />
                      </div>
                      )
                    ) : (
                      // No availability - don't charge, show sympathy
                      <div className="text-center text-white py-4">
                        <div className="text-4xl mb-2">😔</div>
                        <h4 className="font-semibold text-lg mb-1">No luck this time</h4>
                        <p className="text-white/80 text-sm mb-4">
                          None of the restaurants have availability for your requested time.
                        </p>
                        <Button
                          onClick={() => router.push("/app/search")}
                          variant="outline"
                          className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                        >
                          Try Different Time or Location
                        </Button>
                      </div>
                    )
                  ) : null
                )}

                {/* STATE: Found (not started) - Show "Check Availability" */}
                {isReady && (
                  <>
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
                      ) : authLoading ? (
                        <>
                          <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                          Loading...
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
                    {!user && !authLoading && (
                      <p className="text-center text-white/80 text-sm mt-2">
                        Free to create an account • Only pay when you book
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="flex items-center gap-3 py-4">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-sm text-red-700">{error}</span>
              </CardContent>
            </Card>
          )}

          {/* Map showing available restaurants - only after payment */}
          {isCompleted && canViewResults && available > 0 && (() => {
            const availableRestaurants = items.filter(item => 
              item.lat && item.lng && 
              (item.result?.outcome === "available" || item.result?.outcome === "hold_confirmed" || item.result?.alternative_time || item.result?.alt_time)
            )
            if (availableRestaurants.length === 0) return null
            
            // Use userLocation if available, otherwise center on first available restaurant
            const mapCenter = userLocation || {
              lat: availableRestaurants[0].lat!,
              lng: availableRestaurants[0].lng!
            }
            
            return (
              <Card className="border-0 shadow-lg overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-red-500" />
                    Available Restaurants Near You
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <DynamicCallMap
                    renderPhase="process"
                    center={mapCenter}
                    userLocation={userLocation || undefined}
                    activeRestaurantId={null}
                    restaurants={availableRestaurants.map((item, idx) => ({
                      id: item.id || item.place_id || item.name || '',
                      name: item.name || 'Unknown',
                      lat: item.lat!,
                      lng: item.lng!,
                      index: idx + 1,
                    }))}
                  />
                </CardContent>
              </Card>
            )
          })()}

          {/* Restaurant list - hidden during calls to reduce clutter */}
          {!isCalling && (
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
                // Sort items: available/hold first, then alternatives, then unavailable
                [...items].sort((a, b) => {
                  const getPriority = (item: BatchItem) => {
                    if (item.result?.outcome === "hold_confirmed") return 0
                    if (item.result?.outcome === "available") return 1
                    if (item.result?.alternative_time || item.result?.alt_time) return 2
                    if (item.result?.outcome === "not_available") return 4
                    return 3 // pending/calling/etc
                  }
                  return getPriority(a) - getPriority(b)
                }).map((item) => {
                  const displayId = item.place_id ?? item.id ?? "unknown"
                  const callStatus = item.status as CallStatus | undefined
                  const showCallStatus = !isReady // Only show call status after calls started
                  const hideOutcome = !canViewResults
                  
                  // Determine if this restaurant has availability (for styling)
                  const hasAvailability = item.result?.outcome === "hold_confirmed" || 
                                         item.result?.outcome === "available"
                  const hasAlternative = !!(item.result?.alternative_time || item.result?.alt_time)
                  const isUnavailable = item.result?.outcome === "not_available" && !hasAlternative

                  // Card styling based on outcome
                  const getCardClasses = () => {
                    if (hideOutcome) {
                      // Before payment: only show calling state, not results
                      if (item.status === "speaking") {
                        return "bg-gradient-to-r from-blue-50 to-indigo-50 ring-1 ring-blue-200"
                      }
                      if (item.status === "calling") {
                        return "bg-gradient-to-r from-amber-50 to-orange-50 ring-1 ring-amber-200"
                      }
                      return "bg-white/80 backdrop-blur hover:shadow-lg transition-shadow"
                    }
                    
                    // After payment: show result-based styling - cleaner white cards
                    if (item.result?.outcome === "hold_confirmed") {
                      return "bg-white border-l-4 border-l-red-500 shadow-lg"
                    }
                    if (item.result?.outcome === "available") {
                      return "bg-white border-l-4 border-l-orange-500 shadow-md"
                    }
                    if (hasAlternative) {
                      return "bg-white border-l-4 border-l-amber-400 shadow-md"
                    }
                    if (isUnavailable) {
                      return "bg-zinc-50/80 opacity-60"
                    }
                    return "bg-white/80 backdrop-blur"
                  }

                  // Booking handler for this restaurant
                  const handleBook = () => {
                    // Check if already booked
                    if (confirmedBookingId) {
                      alert("You already have a confirmed booking from this search!")
                      return
                    }

                    // Get the alternative time if this is an alternative booking
                    const alternativeTime = item.result?.alternative_time || item.result?.alt_time

                    // Open booking modal with restaurant details
                    setBookingDetails({
                      restaurantName: item.name || "Unknown Restaurant",
                      restaurantPhone: item.phone || "",
                      restaurantAddress: item.address || enrichedData[item.place_id || ""]?.formatted_address,
                      restaurantLat: item.lat,
                      restaurantLng: item.lng,
                      placeId: item.place_id || item.id || "",
                      batchId: batchId || "",
                      partySize: query?.party_size || 2,
                      date: query?.date || new Date().toISOString().split('T')[0],
                      time: query?.time || "19:00",
                      alternativeTime: alternativeTime,
                      specialRequests: query?.special_requests,
                      specialRequestStatus: item.result?.special_request_status,
                      requiresDeposit: item.result?.requires_deposit,
                      aiSummary: item.result?.call_notes?.summary || item.result?.ai_summary,
                      // Large group fields
                      privateRoom: item.result?.private_room,
                      minimumSpend: item.result?.minimum_spend,
                      prixFixeRequired: item.result?.prix_fixe_required,
                      perks: item.result?.perks,
                    })
                    setBookingModalOpen(true)
                  }

                  return (
                    <Card
                      key={displayId}
                      className={`border-0 shadow-md transition-all ${getCardClasses()}`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          {/* Status icon - only show during/after calls, pass result for correct icon */}
                          {showCallStatus && (
                            <div className="pt-1">
                              {getStatusIcon(callStatus, hideOutcome ? undefined : item.result)}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            {/* Header row */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <h3 className={`font-semibold text-lg truncate ${isUnavailable && !hideOutcome ? "text-zinc-400" : ""}`}>
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
                              {showCallStatus && getStatusBadge(callStatus, item.result, true)}
                            </div>

                            {/* Address */}
                            {item.address && (
                              <div className={`flex items-center gap-1.5 mt-2 text-sm ${isUnavailable && !hideOutcome ? "text-zinc-400" : "text-muted-foreground"}`}>
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
                                    className={`text-xs ${isUnavailable && !hideOutcome 
                                      ? "bg-zinc-100 text-zinc-400 border border-zinc-200" 
                                      : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"}`}
                                  >
                                    {type.replace(/_/g, " ")}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {/* Premium info for available restaurants - only after payment */}
                            {!hideOutcome && (hasAvailability || hasAlternative) && item.place_id && (() => {
                              const enriched = enrichedData[item.place_id]
                              if (!enriched && !isEnriching) return null
                              
                              return (
                                <div className="mt-4 p-4 rounded-lg bg-zinc-50 border border-zinc-200">
                                  {isEnriching && !enriched ? (
                                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                                      <RefreshCw className="h-4 w-4 animate-spin" />
                                      Loading details...
                                    </div>
                                  ) : enriched && (
                                    <>
                                      <div className="flex flex-wrap items-center gap-4 text-sm">
                                        {/* Rating with stars */}
                                        {enriched.rating && (
                                          <div className="flex items-center gap-1.5">
                                            <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                                            <span className="font-bold text-zinc-800">{enriched.rating.toFixed(1)}</span>
                                            {enriched.user_ratings_total && (
                                              <span className="text-zinc-500">({enriched.user_ratings_total.toLocaleString()} reviews)</span>
                                            )}
                                          </div>
                                        )}
                                        {/* Price level */}
                                        {enriched.price_level !== undefined && enriched.price_level > 0 && (
                                          <span className="font-semibold">
                                            <span className="text-zinc-700">{'$'.repeat(enriched.price_level)}</span>
                                            <span className="text-zinc-300">{'$'.repeat(Math.max(0, 4 - enriched.price_level))}</span>
                                          </span>
                                        )}
                                        {/* Links */}
                                        {enriched.website && (
                                          <a 
                                            href={enriched.website} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-red-600 hover:text-red-700 underline"
                                          >
                                            Website
                                          </a>
                                        )}
                                        {enriched.url && (
                                          <a 
                                            href={enriched.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-red-600 hover:text-red-700 underline"
                                          >
                                            View on Maps
                                          </a>
                                        )}
                                      </div>
                                      
                                      {/* Place summary - prefer editorial, fall back to review */}
                                      {(enriched.editorial_summary?.overview || (enriched.reviews && enriched.reviews.length > 0)) && (
                                        <div className="mt-3 p-3 bg-white rounded-lg border border-zinc-100">
                                          {enriched.editorial_summary?.overview ? (
                                            <p className="text-sm text-zinc-600">{enriched.editorial_summary.overview}</p>
                                          ) : enriched.reviews && enriched.reviews[0] ? (
                                            <>
                                              <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                                                <span className="font-medium">{enriched.reviews[0].author_name}</span>
                                                <span>•</span>
                                                <span className="flex items-center gap-0.5">
                                                  <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                                                  {enriched.reviews[0].rating}
                                                </span>
                                                <span>•</span>
                                                <span>{enriched.reviews[0].relative_time_description}</span>
                                              </div>
                                              <p className="text-sm text-zinc-600 line-clamp-2 italic">
                                                "{enriched.reviews[0].text}"
                                              </p>
                                            </>
                                          ) : null}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              )
                            })()}

                            {/* Call result - only after calls, pass booking handler for available items */}
                            {showCallStatus && item.result && !hideOutcome && (
                              <div className="mt-4">
                                {getOutcomeMessage(
                                  item.result, 
                                  (hasAvailability || hasAlternative) ? handleBook : undefined,
                                  query ? { 
                                    date: query.date, 
                                    time: query.time, 
                                    party_size: query.party_size,
                                    special_requests: query.special_requests 
                                  } : undefined,
                                  confirmedBookingDetails?.placeId === (item.place_id || item.id)
                                )}
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
          )}

        </div>
      </div>

      {/* Booking Modal */}
      {bookingDetails && (
        <BookingModal
          open={bookingModalOpen}
          onOpenChange={setBookingModalOpen}
          booking={bookingDetails}
          userInfo={userInfo}
          hasOtherAvailable={otherAvailableCount > 0}
          onTryAnother={() => {
            // Clear current booking details so user can pick another
            setBookingDetails(null)
            // Scroll to results section
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          onComplete={(success, bookingId) => {
            if (success && bookingId && bookingDetails) {
              setConfirmedBookingId(bookingId)
              setConfirmedBookingDetails(bookingDetails)
              // Release holds at other restaurants
              releaseOtherHolds(bookingDetails.placeId)
              // Redirect to booking confirmation page
              router.push(`/app/booking/${bookingId}`)
            } else {
              setBookingModalOpen(false)
            }
          }}
        />
      )}
    </>
  )
}

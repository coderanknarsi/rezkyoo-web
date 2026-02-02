"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Phone, User, Calendar, Users, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { formatPhoneNumber, isValidPhoneNumber } from "@/lib/user-profile"

export interface BookingDetails {
  restaurantName: string
  restaurantPhone: string
  restaurantAddress?: string
  restaurantLat?: number
  restaurantLng?: number
  placeId: string
  batchId: string
  partySize: number
  date: string
  time: string
  alternativeTime?: string  // If booking for an alternative time
  specialRequests?: string  // User's special requests text
  specialRequestStatus?: {  // Whether restaurant can accommodate
    honored: boolean
    note?: string
  }
}

export interface UserInfo {
  name?: string
  phone?: string
}

type BookingStatus = "collecting" | "confirming" | "calling" | "confirmed" | "failed"

interface BookingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking: BookingDetails
  userInfo: UserInfo
  onComplete: (success: boolean, bookingId?: string) => void
  onTryAnother?: () => void  // Called when user wants to try a different restaurant after failure
  hasOtherAvailable?: boolean  // Whether there are other available restaurants to try
}

export function BookingModal({
  open,
  onOpenChange,
  booking,
  userInfo,
  onComplete,
  onTryAnother,
  hasOtherAvailable,
}: BookingModalProps) {
  const [status, setStatus] = React.useState<BookingStatus>("collecting")
  const [name, setName] = React.useState(userInfo.name || "")
  const [phone, setPhone] = React.useState(userInfo.phone || "")
  const [error, setError] = React.useState<string | null>(null)
  const [bookingId, setBookingId] = React.useState<string | null>(null)
  const [statusMessage, setStatusMessage] = React.useState("")

  // Reset state when modal opens
  React.useEffect(() => {
    if (open) {
      setStatus("collecting")
      setName(userInfo.name || "")
      setPhone(userInfo.phone ? formatPhoneNumber(userInfo.phone) : "")
      setError(null)
      setBookingId(null)
      setStatusMessage("")
    }
  }, [open, userInfo])

  const displayTime = booking.alternativeTime || booking.time

  // Format time for display
  const formatTime12Hour = (time24: string): string => {
    if (!time24 || !time24.includes(':')) return time24
    const [hours, minutes] = time24.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const hours12 = hours % 12 || 12
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  const handleSubmit = async () => {
    // Validate inputs
    if (!name.trim()) {
      setError("Please enter your name")
      return
    }
    if (!phone.trim()) {
      setError("Please enter your phone number")
      return
    }
    if (!isValidPhoneNumber(phone)) {
      setError("Please enter a valid US phone number")
      return
    }

    setError(null)
    setStatus("confirming")
    setStatusMessage("Creating booking record...")

    try {
      // Step 1: Create booking and trigger confirmation call
      const response = await fetch("/api/mcp/confirm-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: booking.batchId,
          placeId: booking.placeId,
          restaurantName: booking.restaurantName,
          restaurantPhone: booking.restaurantPhone,
          restaurantAddress: booking.restaurantAddress,
          restaurantLat: booking.restaurantLat,
          restaurantLng: booking.restaurantLng,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          partySize: booking.partySize,
          date: booking.date,
          time: displayTime,  // Use alternative time if applicable
        }),
      })

      const data = await response.json()

      if (!data.ok) {
        throw new Error(data.error || "Failed to create booking")
      }

      setBookingId(data.bookingId)
      setStatus("calling")
      setStatusMessage("AI is calling the restaurant to confirm...")

      // Step 2: Poll for booking status
      const pollBookingStatus = async (): Promise<{ status: string; message?: string }> => {
        const maxAttempts = 60  // 5 minutes at 5-second intervals
        let attempts = 0

        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 5000))
          attempts++

          const statusResponse = await fetch("/api/mcp/booking-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingId: data.bookingId }),
          })

          const statusData = await statusResponse.json()

          if (statusData.status === "confirmed") {
            return { status: "confirmed", message: statusData.message }
          } else if (statusData.status === "failed") {
            return { status: "failed", message: statusData.error || "Confirmation call failed" }
          } else if (statusData.status === "calling") {
            setStatusMessage(statusData.message || "Still on the call...")
          }
          // Continue polling for "pending_confirmation" or "calling" status
        }

        return { status: "failed", message: "Booking confirmation timed out" }
      }

      const result = await pollBookingStatus()

      if (result.status === "confirmed") {
        setStatus("confirmed")
        setStatusMessage(result.message || "Your reservation is confirmed!")
        onComplete(true, data.bookingId)
      } else {
        setStatus("failed")
        setStatusMessage(result.message || "Failed to confirm reservation")
        onComplete(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed")
      setStatus("collecting")
    }
  }

  const handlePhoneChange = (value: string) => {
    // Format phone number as user types
    const cleaned = value.replace(/\D/g, "")
    if (cleaned.length <= 10) {
      setPhone(formatPhoneNumber(cleaned) || cleaned)
    }
  }

  // Prevent closing during booking process
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && (status === "confirming" || status === "calling")) {
      // Don't allow closing while in progress
      return
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {status === "confirmed" ? (
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            ) : status === "failed" ? (
              <XCircle className="h-5 w-5 text-red-500" />
            ) : status === "calling" ? (
              <Phone className="h-5 w-5 text-blue-500 animate-pulse" />
            ) : (
              <Calendar className="h-5 w-5 text-red-500" />
            )}
            {status === "confirmed"
              ? "Reservation Confirmed!"
              : status === "failed"
                ? "Confirmation Failed"
                : status === "calling"
                  ? "Calling Restaurant..."
                  : "Complete Your Booking"}
          </DialogTitle>
          <DialogDescription>
            {status === "collecting"
              ? `Confirm your details for ${booking.restaurantName}`
              : status === "confirming"
                ? "Setting up your reservation..."
                : status === "calling"
                  ? "Our AI is speaking with the restaurant"
                  : status === "confirmed"
                    ? `Your table at ${booking.restaurantName} is confirmed`
                    : "We couldn't confirm your reservation"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Reservation Summary */}
          <div className="rounded-lg bg-zinc-50 p-4 space-y-2">
            <div className="font-semibold text-lg">{booking.restaurantName}</div>
            <div className="flex items-center gap-4 text-sm text-zinc-600">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {booking.date}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatTime12Hour(displayTime)}
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {booking.partySize} {booking.partySize === 1 ? "guest" : "guests"}
              </div>
            </div>
            {booking.alternativeTime && (
              <div className="text-xs text-amber-600 mt-1">
                ⏰ Booking for alternative time offered by restaurant
              </div>
            )}
            {/* Special Request Status */}
            {booking.specialRequestStatus && (
              <div className={`mt-2 p-2 rounded text-xs flex items-start gap-2 ${
                booking.specialRequestStatus.honored 
                  ? "bg-emerald-50 text-emerald-700" 
                  : "bg-amber-50 text-amber-700"
              }`}>
                <span className="text-base">{booking.specialRequestStatus.honored ? "✓" : "⚠"}</span>
                <div>
                  <div className="font-medium">
                    {booking.specialRequestStatus.honored ? "Special request confirmed!" : "Special request note"}
                  </div>
                  {booking.specialRequestStatus.note && (
                    <div className="mt-0.5 opacity-80">{booking.specialRequestStatus.note}</div>
                  )}
                </div>
              </div>
            )}
            {/* Show special requests text if present but no status yet */}
            {booking.specialRequests && !booking.specialRequestStatus && (
              <div className="mt-2 p-2 rounded text-xs bg-zinc-100 text-zinc-600">
                <span className="font-medium">Special request:</span> {booking.specialRequests}
              </div>
            )}
          </div>

          {/* Collection Form */}
          {status === "collecting" && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-zinc-700 flex items-center gap-1.5 mb-1.5">
                  <User className="h-4 w-4" />
                  Your Name
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700 flex items-center gap-1.5 mb-1.5">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </label>
                <Input
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Restaurant will call this number if needed
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button onClick={handleSubmit} className="w-full bg-red-600 hover:bg-red-700">
                Confirm Booking
              </Button>
            </div>
          )}

          {/* Progress States */}
          {(status === "confirming" || status === "calling") && (
            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-red-500" />
              <p className="text-sm text-zinc-600 text-center">{statusMessage}</p>
              {status === "calling" && (
                <div className="text-xs text-zinc-400 text-center max-w-xs">
                  Our AI is speaking with the restaurant to confirm your reservation. 
                  This usually takes 1-2 minutes.
                </div>
              )}
            </div>
          )}

          {/* Success State */}
          {status === "confirmed" && (
            <div className="flex flex-col py-4 space-y-4">
              {/* Success header */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle className="h-7 w-7 text-emerald-500" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-800">Reservation Confirmed!</p>
                  <p className="text-sm text-emerald-600">{statusMessage || "Your table is booked"}</p>
                </div>
              </div>

              {/* Booking details summary */}
              <div className="rounded-lg bg-zinc-50 p-4 space-y-3">
                <div className="font-semibold text-lg">{booking.restaurantName}</div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="flex flex-col items-center p-2 rounded bg-white border">
                    <Calendar className="h-4 w-4 text-zinc-400 mb-1" />
                    <span className="font-medium">{booking.date}</span>
                  </div>
                  <div className="flex flex-col items-center p-2 rounded bg-white border">
                    <Clock className="h-4 w-4 text-zinc-400 mb-1" />
                    <span className="font-medium">{formatTime12Hour(displayTime)}</span>
                  </div>
                  <div className="flex flex-col items-center p-2 rounded bg-white border">
                    <Users className="h-4 w-4 text-zinc-400 mb-1" />
                    <span className="font-medium">{booking.partySize} guests</span>
                  </div>
                </div>
                
                {/* Special request status in confirmed view */}
                {booking.specialRequestStatus && (
                  <div className={`p-3 rounded-lg flex items-start gap-2 ${
                    booking.specialRequestStatus.honored 
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-700" 
                      : "bg-amber-50 border border-amber-200 text-amber-700"
                  }`}>
                    <span className="text-lg">{booking.specialRequestStatus.honored ? "✓" : "⚠"}</span>
                    <div className="text-sm">
                      <div className="font-medium">
                        {booking.specialRequestStatus.honored ? "Special request confirmed" : "Special request note"}
                      </div>
                      {booking.specialRequestStatus.note && (
                        <div className="mt-0.5 opacity-80">{booking.specialRequestStatus.note}</div>
                      )}
                      {booking.specialRequests && !booking.specialRequestStatus.note && (
                        <div className="mt-0.5 opacity-80">{booking.specialRequests}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-zinc-500 text-center">
                Confirmation details will be sent to your phone/email
              </p>
              
              <Button onClick={() => onOpenChange(false)} className="w-full bg-emerald-600 hover:bg-emerald-700">
                Done
              </Button>
            </div>
          )}

          {/* Failed State */}
          {status === "failed" && (
            <div className="flex flex-col py-4 space-y-4">
              {/* Failure header */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <XCircle className="h-7 w-7 text-red-500" />
                </div>
                <div>
                  <p className="font-semibold text-red-800">Booking Failed</p>
                  <p className="text-sm text-red-600">{statusMessage || "We couldn't confirm your reservation"}</p>
                </div>
              </div>

              {/* Restaurant info */}
              <div className="rounded-lg bg-zinc-50 p-3 text-sm">
                <div className="font-medium">{booking.restaurantName}</div>
                <div className="text-zinc-500">
                  {booking.date} at {formatTime12Hour(displayTime)} • {booking.partySize} guests
                </div>
              </div>

              <p className="text-sm text-zinc-600 text-center">
                {hasOtherAvailable 
                  ? "Don't worry — other restaurants from your search are still available!"
                  : "You can try again or call the restaurant directly."}
              </p>

              <div className="flex flex-col gap-2">
                {hasOtherAvailable && onTryAnother && (
                  <Button 
                    onClick={() => {
                      onTryAnother()
                      onOpenChange(false)
                    }} 
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    Try Another Restaurant
                  </Button>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStatus("collecting")} className="flex-1">
                    Retry This One
                  </Button>
                  <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

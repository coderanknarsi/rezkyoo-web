"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  CheckCircle,
  MapPin,
  Calendar,
  Clock,
  Users,
  Phone,
  Navigation,
  CalendarPlus,
  ArrowLeft,
  Copy,
  Check,
  Loader2,
  XCircle,
  AlertTriangle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AppHeader } from "@/components/AppHeader"
import { useAuth } from "@/lib/auth-context"

// Dynamic import for map to avoid SSR issues
import dynamic from "next/dynamic"
const BookingMap = dynamic(() => import("./components/BookingMap"), {
  ssr: false,
  loading: () => (
    <div className="h-64 rounded-xl bg-zinc-100 animate-pulse flex items-center justify-center">
      <MapPin className="h-8 w-8 text-zinc-300" />
    </div>
  ),
})

type BookingData = {
  id: string
  status: "pending_confirmation" | "calling" | "confirmed" | "failed" | "cancelled"
  restaurant: {
    name: string
    phone: string
    place_id: string
    address?: string
    lat?: number
    lng?: number
  }
  customer: {
    name: string
    phone: string
  }
  reservation: {
    party_size: number
    date: string
    time: string
  }
  createdAt: string
  confirmedAt?: string
  cancelledAt?: string
  specialRequestStatus?: {
    honored: boolean
    note?: string
  }
}

// Format time for display
function formatTime12Hour(time24: string): string {
  if (!time24 || !time24.includes(":")) return time24
  const [hours, minutes] = time24.split(":").map(Number)
  const period = hours >= 12 ? "PM" : "AM"
  const hours12 = hours % 12 || 12
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`
}

// Format date for display
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + "T00:00:00")
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

export default function BookingConfirmationPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const bookingId = Array.isArray(params?.bookingId) ? params.bookingId[0] : params?.bookingId

  const [booking, setBooking] = React.useState<BookingData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [phoneCopied, setPhoneCopied] = React.useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = React.useState(false)

  // Fetch booking details
  React.useEffect(() => {
    async function fetchBooking() {
      if (!bookingId) return

      try {
        // First try the booking-status endpoint (for active/recent bookings)
        const response = await fetch("/api/mcp/booking-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId }),
        })

        const data = await response.json()

        if (data.ok && data.booking) {
          setBooking(data.booking)
          setLoading(false)
          return
        }

        // If not found in active bookings, try to fetch from Firestore via API
        const reservationResponse = await fetch(`/api/reservations/${bookingId}`)
        const reservationData = await reservationResponse.json()
        
        if (reservationData.ok && reservationData.reservation) {
          const reservation = reservationData.reservation
          // Convert Reservation format to BookingData format
          setBooking({
            id: reservation.id,
            status: reservation.status as BookingData["status"],
            restaurant: {
              name: reservation.restaurant.name,
              phone: reservation.restaurant.phone,
              place_id: reservation.placeId,
              address: reservation.restaurant.address,
              lat: reservation.restaurant.lat,
              lng: reservation.restaurant.lng,
            },
            customer: {
              name: reservation.customer.name,
              phone: reservation.customer.phone,
            },
            reservation: reservation.reservation,
            createdAt: reservation.createdAt,
            confirmedAt: reservation.confirmedAt,
            cancelledAt: reservation.cancelledAt,
            specialRequestStatus: reservation.specialRequestStatus,
          })
          setLoading(false)
          return
        }

        throw new Error(data.error || "Booking not found")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load booking")
      } finally {
        setLoading(false)
      }
    }

    fetchBooking()
  }, [bookingId, user])

  const handleCopyPhone = async () => {
    if (!booking?.restaurant.phone) return
    try {
      await navigator.clipboard.writeText(booking.restaurant.phone)
      setPhoneCopied(true)
      setTimeout(() => setPhoneCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input")
      input.value = booking.restaurant.phone
      document.body.appendChild(input)
      input.select()
      document.execCommand("copy")
      document.body.removeChild(input)
      setPhoneCopied(true)
      setTimeout(() => setPhoneCopied(false), 2000)
    }
  }

  const handleGetDirections = () => {
    if (!booking) return
    const query = encodeURIComponent(
      booking.restaurant.address || booking.restaurant.name
    )
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank")
  }

  const handleAddToCalendar = () => {
    if (!booking) return

    const { restaurant, reservation } = booking
    const startDate = new Date(`${reservation.date}T${reservation.time}:00`)
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000) // 2 hours

    const formatGoogleDate = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"

    const title = encodeURIComponent(`Dinner at ${restaurant.name}`)
    const details = encodeURIComponent(
      `Reservation for ${reservation.party_size} guests\nPhone: ${restaurant.phone}`
    )
    const location = encodeURIComponent(restaurant.address || restaurant.name)

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}&details=${details}&location=${location}`

    window.open(url, "_blank")
  }

  if (loading) {
    return (
      <>
        <AppHeader />
        <div className="min-h-screen bg-gradient-to-b from-emerald-50/30 via-white to-white flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <p className="text-zinc-500">Loading booking details...</p>
          </div>
        </div>
      </>
    )
  }

  if (error || !booking) {
    return (
      <>
        <AppHeader />
        <div className="min-h-screen bg-gradient-to-b from-red-50/30 via-white to-white">
          <div className="mx-auto max-w-2xl px-6 py-16">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 text-red-600">
                  <XCircle className="h-6 w-6" />
                  <p className="font-medium">{error || "Booking not found"}</p>
                </div>
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/app/search">Back to Search</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    )
  }

  const isConfirmed = booking.status === "confirmed"
  const isCancelled = booking.status === "cancelled"

  return (
    <>
      <AppHeader />
      <div
        className={`min-h-screen ${
          isConfirmed
            ? "bg-gradient-to-b from-emerald-50/50 via-white to-white"
            : isCancelled
              ? "bg-gradient-to-b from-zinc-100 via-white to-white"
              : "bg-gradient-to-b from-amber-50/30 via-white to-white"
        }`}
      >
        <div className="mx-auto max-w-2xl px-6 py-8">
          {/* Back link */}
          <Link
            href="/app/account"
            className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            My Reservations
          </Link>

          {/* Status Banner */}
          <div
            className={`rounded-2xl p-6 mb-6 ${
              isConfirmed
                ? "bg-emerald-500 text-white"
                : isCancelled
                  ? "bg-zinc-500 text-white"
                  : "bg-amber-500 text-white"
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`h-16 w-16 rounded-full flex items-center justify-center ${
                  isConfirmed
                    ? "bg-white/20"
                    : isCancelled
                      ? "bg-white/20"
                      : "bg-white/20"
                }`}
              >
                {isConfirmed ? (
                  <CheckCircle className="h-10 w-10" />
                ) : isCancelled ? (
                  <XCircle className="h-10 w-10" />
                ) : (
                  <Loader2 className="h-10 w-10 animate-spin" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  {isConfirmed
                    ? "Booking Confirmed!"
                    : isCancelled
                      ? "Reservation Cancelled"
                      : "Confirming Reservation..."}
                </h1>
                <p className="opacity-90">
                  {isConfirmed
                    ? `Your table at ${booking.restaurant.name} is ready`
                    : isCancelled
                      ? "This reservation has been cancelled"
                      : "Our AI is speaking with the restaurant"}
                </p>
              </div>
            </div>
          </div>

          {/* Map */}
          {booking.restaurant.lat && booking.restaurant.lng && (
            <div className="mb-6">
              <BookingMap
                lat={booking.restaurant.lat}
                lng={booking.restaurant.lng}
                name={booking.restaurant.name}
              />
            </div>
          )}

          {/* Restaurant & Reservation Details */}
          <Card className="mb-6 shadow-lg border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">{booking.restaurant.name}</CardTitle>
              {booking.restaurant.address && (
                <p className="text-sm text-zinc-500 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {booking.restaurant.address}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Reservation details grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center p-4 rounded-xl bg-zinc-50">
                  <Calendar className="h-5 w-5 text-red-500 mb-2" />
                  <span className="text-xs text-zinc-500">Date</span>
                  <span className="font-semibold text-sm text-center">
                    {formatDate(booking.reservation.date)}
                  </span>
                </div>
                <div className="flex flex-col items-center p-4 rounded-xl bg-zinc-50">
                  <Clock className="h-5 w-5 text-red-500 mb-2" />
                  <span className="text-xs text-zinc-500">Time</span>
                  <span className="font-semibold text-sm">
                    {formatTime12Hour(booking.reservation.time)}
                  </span>
                </div>
                <div className="flex flex-col items-center p-4 rounded-xl bg-zinc-50">
                  <Users className="h-5 w-5 text-red-500 mb-2" />
                  <span className="text-xs text-zinc-500">Party Size</span>
                  <span className="font-semibold text-sm">
                    {booking.reservation.party_size} guests
                  </span>
                </div>
              </div>

              {/* Special request status */}
              {booking.specialRequestStatus && (
                <div
                  className={`p-3 rounded-lg flex items-start gap-2 ${
                    booking.specialRequestStatus.honored
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                      : "bg-amber-50 border border-amber-200 text-amber-700"
                  }`}
                >
                  <span className="text-lg">
                    {booking.specialRequestStatus.honored ? "✓" : "⚠"}
                  </span>
                  <div className="text-sm">
                    <div className="font-medium">
                      {booking.specialRequestStatus.honored
                        ? "Special request confirmed"
                        : "Special request note"}
                    </div>
                    {booking.specialRequestStatus.note && (
                      <div className="mt-0.5 opacity-80">
                        {booking.specialRequestStatus.note}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Customer info */}
              <div className="pt-3 border-t">
                <p className="text-sm text-zinc-500 mb-1">Reserved under</p>
                <p className="font-medium">{booking.customer.name}</p>
                <p className="text-sm text-zinc-500">{booking.customer.phone}</p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {isConfirmed && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              <Button
                variant="outline"
                className="h-12"
                onClick={handleGetDirections}
              >
                <Navigation className="h-4 w-4 mr-2" />
                Get Directions
              </Button>
              <Button
                variant="outline"
                className="h-12"
                onClick={handleAddToCalendar}
              >
                <CalendarPlus className="h-4 w-4 mr-2" />
                Add to Calendar
              </Button>
            </div>
          )}

          {/* Cancel Reservation Section */}
          {isConfirmed && !showCancelConfirm && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-zinc-700">Need to cancel?</p>
                    <p className="text-sm text-zinc-500">
                      Call the restaurant directly
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-300 text-amber-700 hover:bg-amber-100"
                    onClick={() => setShowCancelConfirm(true)}
                  >
                    Cancel Reservation
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cancel Confirmation Panel */}
          {showCancelConfirm && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="py-5">
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-800">Cancel your reservation</p>
                    <p className="text-sm text-red-600 mt-1">
                      To cancel, please call {booking.restaurant.name} directly. 
                      They'll remove your reservation from their system.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-red-200 mb-4">
                  <p className="text-sm text-zinc-500 mb-1">Restaurant Phone</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-semibold text-zinc-900">
                      {booking.restaurant.phone}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyPhone}
                      className="text-zinc-500"
                    >
                      {phoneCopied ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    asChild
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    <a href={`tel:${booking.restaurant.phone}`}>
                      <Phone className="h-4 w-4 mr-2" />
                      Call Now
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCancelConfirm(false)}
                  >
                    Go Back
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Confirmation footer */}
          {booking.confirmedAt && (
            <p className="text-center text-xs text-zinc-400 mt-6">
              Confirmed on{" "}
              {new Date(booking.confirmedAt).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          )}
        </div>
      </div>
    </>
  )
}

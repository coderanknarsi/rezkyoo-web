"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  MapPin,
  Phone,
  CheckCircle,
  XCircle,
  CalendarCheck,
  ChevronRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AppHeader } from "@/components/AppHeader"
import { useAuth } from "@/lib/auth-context"
import { Reservation } from "@/lib/reservations"

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
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  } catch {
    return dateStr
  }
}

// Check if reservation is upcoming
function isUpcoming(reservation: Reservation): boolean {
  const today = new Date().toISOString().split("T")[0]
  return reservation.status === "confirmed" && reservation.reservation.date >= today
}

// Reservation card component
function ReservationCard({ reservation }: { reservation: Reservation }) {
  const router = useRouter()
  const upcoming = isUpcoming(reservation)
  
  const statusColor = {
    confirmed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-zinc-100 text-zinc-500",
    completed: "bg-blue-100 text-blue-700",
  }[reservation.status]

  const statusLabel = {
    confirmed: upcoming ? "Upcoming" : "Past",
    cancelled: "Cancelled",
    completed: "Completed",
  }[reservation.status]

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        reservation.status === "cancelled" ? "opacity-60" : ""
      }`}
      onClick={() => router.push(`/app/booking/${reservation.id}`)}
    >
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Restaurant name */}
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{reservation.restaurant.name}</h3>
              <Badge className={`shrink-0 ${statusColor}`}>
                {statusLabel}
              </Badge>
            </div>

            {/* Date and time */}
            <div className="flex items-center gap-4 text-sm text-zinc-600 mb-2">
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(reservation.reservation.date)}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatTime12Hour(reservation.reservation.time)}
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {reservation.reservation.party_size}
              </div>
            </div>

            {/* Address */}
            {reservation.restaurant.address && (
              <p className="text-xs text-zinc-500 truncate flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                {reservation.restaurant.address}
              </p>
            )}
          </div>

          <ChevronRight className="h-5 w-5 text-zinc-300 shrink-0" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function ReservationsPage() {
  const { user, loading: authLoading } = useAuth()
  const [reservations, setReservations] = React.useState<Reservation[]>([])
  const [loading, setLoading] = React.useState(true)

  // Fetch reservations on mount via API route
  React.useEffect(() => {
    async function fetchReservations() {
      if (!user) return
      setLoading(true)
      try {
        const response = await fetch("/api/reservations")
        const data = await response.json()
        if (data.ok && Array.isArray(data.reservations)) {
          setReservations(data.reservations as Reservation[])
        } else {
          console.error("Failed to load reservations:", data.error)
        }
      } catch (error) {
        console.error("Failed to load reservations:", error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchReservations()
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [user, authLoading])

  // Split into upcoming and past
  const upcomingReservations = reservations.filter(isUpcoming)
  const pastReservations = reservations.filter(r => !isUpcoming(r))

  if (authLoading || loading) {
    return (
      <>
        <AppHeader />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </>
    )
  }

  if (!user) {
    return (
      <>
        <AppHeader />
        <div className="min-h-screen flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-4">Please sign in to view your reservations.</p>
              <Button asChild className="bg-red-500 hover:bg-red-600">
                <Link href="/login">Sign In</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  return (
    <>
      <AppHeader />
      <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
        <div className="mx-auto max-w-2xl px-6 py-12">
          {/* Back link */}
          <Link
            href="/app/account"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Account
          </Link>

          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarCheck className="h-6 w-6 text-red-500" />
              My Reservations
            </h1>
          </div>

          {reservations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarCheck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No reservations yet.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your confirmed bookings will appear here.
                </p>
                <Button asChild className="mt-4 bg-red-500 hover:bg-red-600">
                  <Link href="/app/search">Find a Table</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Upcoming Reservations */}
              {upcomingReservations.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    Upcoming
                  </h2>
                  <div className="space-y-3">
                    {upcomingReservations.map(reservation => (
                      <ReservationCard key={reservation.id} reservation={reservation} />
                    ))}
                  </div>
                </div>
              )}

              {/* Past Reservations */}
              {pastReservations.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-zinc-500">
                    <Clock className="h-5 w-5" />
                    Past
                  </h2>
                  <div className="space-y-3">
                    {pastReservations.map(reservation => (
                      <ReservationCard key={reservation.id} reservation={reservation} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

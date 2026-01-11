"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { MapPin } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

// Generate time options in 15-minute intervals
function generateTimeOptions() {
  const options: { value: string; label: string }[] = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const h24 = hour.toString().padStart(2, "0")
      const m = minute.toString().padStart(2, "0")
      const value = `${h24}:${m}`

      // Format for display (12-hour with AM/PM)
      const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      const ampm = hour < 12 ? "AM" : "PM"
      const label = `${h12}:${m} ${ampm}`

      options.push({ value, label })
    }
  }
  return options
}

const ALL_TIME_OPTIONS = generateTimeOptions()

// Get today's date in YYYY-MM-DD format (using LOCAL timezone)
function getTodayDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, "0")
  const day = now.getDate().toString().padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Get current time in HH:MM format
function getCurrentTime() {
  const now = new Date()
  return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`
}

// Filter out past times if date is today
function getAvailableTimeOptions(selectedDate: string) {
  const today = getTodayDate()

  // If no date selected or date is in the future, show all times
  if (!selectedDate || selectedDate > today) {
    return ALL_TIME_OPTIONS
  }

  // If date is today, filter out past times (with 30 min buffer)
  if (selectedDate === today) {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 30) // 30 min buffer for searching
    const cutoffHour = now.getHours()
    const cutoffMinute = now.getMinutes()
    const cutoffTime = `${cutoffHour.toString().padStart(2, "0")}:${cutoffMinute.toString().padStart(2, "0")}`

    return ALL_TIME_OPTIONS.filter(opt => opt.value >= cutoffTime)
  }

  // Date is in the past - show warning but allow selection
  return ALL_TIME_OPTIONS
}

export default function SearchPage() {
  const router = useRouter()
  const [cravingText, setCravingText] = React.useState("")
  const [location, setLocation] = React.useState("")
  const [partySize, setPartySize] = React.useState("")
  const [date, setDate] = React.useState("")
  const [time, setTime] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [debugResponse, setDebugResponse] = React.useState<any>(null)
  const [gettingLocation, setGettingLocation] = React.useState(false)
  const [locationError, setLocationError] = React.useState<string | null>(null)

  const dateInputRef = React.useRef<HTMLInputElement>(null)

  // Get available time options based on selected date
  const availableTimeOptions = React.useMemo(
    () => getAvailableTimeOptions(date),
    [date]
  )

  // Reset time if it's no longer available after date change
  React.useEffect(() => {
    if (time && !availableTimeOptions.find(opt => opt.value === time)) {
      setTime("")
    }
  }, [date, time, availableTimeOptions])

  // Request GPS location
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser")
      return
    }

    setGettingLocation(true)
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords

        // Reverse geocode to get readable address
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          )
          const data = await response.json()

          // Extract city/neighborhood from response
          const city = data.address?.city || data.address?.town || data.address?.municipality
          const neighborhood = data.address?.neighbourhood || data.address?.suburb
          const state = data.address?.state

          let locationText = ""
          if (neighborhood && city) {
            locationText = `${neighborhood}, ${city}`
          } else if (city && state) {
            locationText = `${city}, ${state}`
          } else if (city) {
            locationText = city
          } else {
            // Fallback to coordinates
            locationText = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
          }

          setLocation(locationText)
        } catch (err) {
          // Fallback to coordinates if reverse geocoding fails
          setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
        }

        setGettingLocation(false)
      },
      (err) => {
        setGettingLocation(false)
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setLocationError("Location permission denied. Please enter manually.")
            break
          case err.POSITION_UNAVAILABLE:
            setLocationError("Location unavailable. Please enter manually.")
            break
          case err.TIMEOUT:
            setLocationError("Location request timed out. Please try again.")
            break
          default:
            setLocationError("Unable to get location. Please enter manually.")
        }
      },
      {
        enableHighAccuracy: false, // Use low accuracy first for faster response
        timeout: 30000, // 30 seconds timeout
        maximumAge: 300000, // Cache for 5 minutes
      }
    )
  }

  // Auto-request location on page load for "near me" default experience
  React.useEffect(() => {
    // Only auto-request if location hasn't been set yet
    if (!location && navigator.geolocation) {
      handleGetLocation()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run once on mount

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setDebugResponse(null)

    // Validate date/time combination
    const today = getTodayDate()
    if (date === today && time) {
      const currentTime = getCurrentTime()
      if (time < currentTime) {
        setError("Please select a future time for today's reservation")
        setLoading(false)
        return
      }
    }

    const payload: Record<string, any> = {
      craving_text: cravingText,
      location,
    }

    if (partySize) {
      payload.party_size = Number(partySize)
    }

    if (date) {
      payload.date = date
    }

    if (time) {
      payload.time = time
      payload.intent = "specific_time" // User picked a specific time
    } else {
      payload.intent = "next_available" // Flexible on time
    }

    try {
      const response = await fetch("/api/mcp/find-restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await response.json()

      if (data?.ok === false) {
        setError(typeof data.error === "string" ? data.error : "Unknown error")
        setDebugResponse(data)
        return
      }

      if (data?.batchId) {
        router.push(`/app/batch/${data.batchId}`)
        return
      }

      setDebugResponse(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setLoading(false)
    }
  }

  // Click anywhere on date container to open picker
  const handleDateContainerClick = () => {
    dateInputRef.current?.showPicker?.()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50/30 via-white to-white dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-950 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-red-400/10 blur-3xl" />
      <div className="absolute top-1/2 -left-40 h-80 w-80 rounded-full bg-orange-400/10 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Find Your Perfect Table
          </h1>
          <p className="text-muted-foreground text-lg">
            Tell us what you're craving and we'll call restaurants for you
          </p>
        </div>

        {/* Main Form Card */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur dark:bg-zinc-900/80">
          <CardContent className="pt-8 pb-6">
            <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
              {/* Craving */}
              <div className="grid gap-2">
                <label className="text-sm font-semibold text-red-600" htmlFor="cravingText">
                  What are you craving?
                </label>
                <Input
                  id="cravingText"
                  value={cravingText}
                  onChange={(event) => setCravingText(event.target.value)}
                  placeholder="Sushi, Italian, steakhouse..."
                  required
                  className="h-12 text-base border-zinc-200 focus:border-red-400 focus:ring-red-400"
                />
              </div>

              {/* Location */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-red-600" htmlFor="location">
                    Location
                  </label>
                  {/* Prominent "Use my location" button */}
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={gettingLocation}
                    className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors"
                  >
                    <MapPin className={`h-4 w-4 ${gettingLocation ? "animate-pulse" : ""}`} />
                    {gettingLocation ? "Finding you..." : "Use my location"}
                  </button>
                </div>
                <Input
                  id="location"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="City, neighborhood, or address"
                  required
                  className="h-12 text-base border-zinc-200 focus:border-red-400 focus:ring-red-400"
                />
                {locationError && (
                  <p className="text-xs text-red-500">{locationError}</p>
                )}
              </div>

              {/* Party size & Date in a row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-red-600" htmlFor="partySize">
                    Party size
                  </label>
                  <Input
                    id="partySize"
                    type="number"
                    min={1}
                    max={20}
                    value={partySize}
                    onChange={(event) => setPartySize(event.target.value)}
                    placeholder="2"
                    className="h-12 text-base border-zinc-200 focus:border-red-400 focus:ring-red-400"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-red-600" htmlFor="date">
                    Date
                  </label>
                  <div
                    onClick={handleDateContainerClick}
                    className="relative cursor-pointer"
                  >
                    <input
                      ref={dateInputRef}
                      id="date"
                      type="date"
                      value={date}
                      min={getTodayDate()}
                      onChange={(event) => setDate(event.target.value)}
                      className="flex h-12 w-full rounded-md border border-zinc-200 bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Time - Quick Select Buttons */}
              <div className="grid gap-3">
                <label className="text-sm font-semibold text-red-600">
                  Time
                </label>

                {/* Quick select time buttons - prime dinner hours */}
                <div className="grid grid-cols-4 gap-2">
                  {['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30'].map(t => {
                    const opt = availableTimeOptions.find(o => o.value === t)
                    if (!opt) return null // Skip if time is in the past

                    const isSelected = time === t
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTime(t)}
                        className={`py-2.5 px-2 text-sm font-medium rounded-lg border transition-all ${isSelected
                            ? 'bg-red-500 text-white border-red-500 shadow-md'
                            : 'bg-white text-zinc-700 border-zinc-200 hover:border-red-300 hover:bg-red-50'
                          }`}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>

                {/* "Other time" expandable section */}
                <details className="group">
                  <summary className="text-sm text-zinc-500 cursor-pointer hover:text-red-600 transition-colors">
                    Need a different time? <span className="group-open:hidden">Show all...</span>
                  </summary>
                  <select
                    id="time"
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                    className="mt-2 flex h-11 w-full rounded-md border border-zinc-200 bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
                  >
                    <option value="">Select a time</option>
                    {availableTimeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </details>

                {date === getTodayDate() && availableTimeOptions.length < ALL_TIME_OPTIONS.length && (
                  <p className="text-xs text-muted-foreground">
                    Only showing times at least 30 min from now
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="h-14 text-lg font-semibold bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/25"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Searching...
                  </span>
                ) : (
                  "Find Tables"
                )}
              </Button>

              {/* Trust text */}
              <p className="text-center text-xs text-muted-foreground">
                🔒 We'll call restaurants on your behalf. No hidden fees.
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Error display */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-600 text-lg">Search error</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-red-700">
              {error}
            </CardContent>
          </Card>
        )}

        {/* Debug response (only in development) */}
        {debugResponse && process.env.NODE_ENV === 'development' && (
          <Card className="border-zinc-200">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Debug response</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-xs text-muted-foreground overflow-auto max-h-40">
                {JSON.stringify(debugResponse, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

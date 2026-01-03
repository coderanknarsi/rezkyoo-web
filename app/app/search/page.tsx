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

// Get today's date in YYYY-MM-DD format
function getTodayDate() {
  const now = new Date()
  return now.toISOString().split("T")[0]
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
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // Cache for 1 minute
      }
    )
  }

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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Find restaurants</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="cravingText">
                What are you craving?
              </label>
              <Input
                id="cravingText"
                value={cravingText}
                onChange={(event) => setCravingText(event.target.value)}
                placeholder="Sushi, burger, pasta..."
                required
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="location">
                Location
              </label>
              <div className="flex gap-2">
                <Input
                  id="location"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="City or neighborhood"
                  required
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleGetLocation}
                  disabled={gettingLocation}
                  title="Use my location"
                >
                  <MapPin className={`h-4 w-4 ${gettingLocation ? "animate-pulse" : ""}`} />
                </Button>
              </div>
              {locationError && (
                <p className="text-sm text-amber-600">{locationError}</p>
              )}
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="partySize">
                Party size
              </label>
              <Input
                id="partySize"
                type="number"
                min={1}
                value={partySize}
                onChange={(event) => setPartySize(event.target.value)}
                placeholder="2"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="date">
                Date
              </label>
              <div
                onClick={handleDateContainerClick}
                className="cursor-pointer"
              >
                <Input
                  ref={dateInputRef}
                  id="date"
                  type="date"
                  min={getTodayDate()} // Prevent past dates
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="cursor-pointer"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="time">
                Time
              </label>
              <select
                id="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                <option value="">Select a time</option>
                {availableTimeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {date === getTodayDate() && availableTimeOptions.length < ALL_TIME_OPTIONS.length && (
                <p className="text-xs text-muted-foreground">
                  Only showing times at least 30 min from now
                </p>
              )}
            </div>
            <Separator />
            <Button type="submit" disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Search error</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {error}
          </CardContent>
        </Card>
      ) : null}

      {debugResponse ? (
        <Card>
          <CardHeader>
            <CardTitle>Debug response</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm">
              {JSON.stringify(debugResponse, null, 2)}
            </pre>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

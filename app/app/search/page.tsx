"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { MapPin, Phone } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { AppHeader } from "@/components/AppHeader"
import { useAuth } from "@/lib/auth-context"
import { saveSearchToHistory } from "@/lib/search-history"
import { isValidPhoneNumber } from "@/lib/user-profile"

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

// ===============================
// Calling Window Constants
// ===============================
// Restaurants typically staff hosts from ~10 AM to ~9 PM.
// Calling outside this window wastes money (voicemail, annoyed staff).
const CALLING_WINDOW_START = "10:00" // Earliest we'll call restaurants
const CALLING_WINDOW_END   = "21:00" // Latest we'll call (9 PM)
const LAST_DINING_SLOT     = "22:00" // Latest reservable time we show
const MAX_FUTURE_DAYS      = 30      // How far out users can book

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

// Get the max bookable date (today + MAX_FUTURE_DAYS)
function getMaxDate() {
  const d = new Date()
  d.setDate(d.getDate() + MAX_FUTURE_DAYS)
  const year = d.getFullYear()
  const month = (d.getMonth() + 1).toString().padStart(2, "0")
  const day = d.getDate().toString().padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Check if it's past the calling window for today
function isPastCallingWindow() {
  return getCurrentTime() >= CALLING_WINDOW_END
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
  const { user } = useAuth()
  const [cravingText, setCravingText] = React.useState("")
  const [location, setLocation] = React.useState("")
  const [userCoords, setUserCoords] = React.useState<{ lat: number; lng: number } | null>(null)
  const [partySize, setPartySize] = React.useState("")
  const [date, setDate] = React.useState("") // Set in useEffect to avoid hydration mismatch
  const [time, setTime] = React.useState("")
  const [specialRequests, setSpecialRequests] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [debugResponse, setDebugResponse] = React.useState<any>(null)
  const [gettingLocation, setGettingLocation] = React.useState(false)
  const [locationError, setLocationError] = React.useState<string | null>(null)
  const [mounted, setMounted] = React.useState(false)

  // Phone number collection
  const [phoneNumber, setPhoneNumber] = React.useState("")
  const [hasPhoneSaved, setHasPhoneSaved] = React.useState(false)
  const [loadingProfile, setLoadingProfile] = React.useState(true)

  const dateInputRef = React.useRef<HTMLInputElement>(null)
  const [shouldAutoSubmit, setShouldAutoSubmit] = React.useState(false)
  const formRef = React.useRef<HTMLFormElement>(null)

  // Set default date after mount to avoid hydration mismatch (new Date() differs server vs client)
  React.useEffect(() => {
    setDate(getTodayDate())
    setMounted(true)
  }, [])

  // Restore form state from URL params (after returning from signup)
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const craving = params.get('craving')
    const loc = params.get('location')
    const size = params.get('partySize')
    const d = params.get('date')
    const t = params.get('time')
    const autoSubmit = params.get('autoSubmit')

    if (craving) setCravingText(craving)
    if (loc) setLocation(loc)
    if (size) setPartySize(size)
    if (d) setDate(d)
    if (t) setTime(t)
    
    // If we have required fields and autoSubmit flag, trigger submit after user is loaded
    if (autoSubmit === 'true' && craving && loc) {
      setShouldAutoSubmit(true)
    }

    // Clean up URL params after restoring
    if (craving || loc || size || d || t || autoSubmit) {
      window.history.replaceState({}, '', '/app/search')
    }
  }, [])

  // Auto-submit when user is authenticated and shouldAutoSubmit is true
  React.useEffect(() => {
    if (shouldAutoSubmit && user && cravingText && location && !loading) {
      setShouldAutoSubmit(false)
      // Small delay to ensure form is ready
      setTimeout(() => {
        formRef.current?.requestSubmit()
      }, 100)
    }
  }, [shouldAutoSubmit, user, cravingText, location, loading])

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

        // Store exact GPS coordinates for map display
        setUserCoords({ lat: latitude, lng: longitude })

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

  // Fetch user profile to check if phone is saved (via server API)
  React.useEffect(() => {
    async function fetchProfile() {
      if (!user) {
        setLoadingProfile(false)
        return
      }
      try {
        const idToken = await user.getIdToken()
        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${idToken}` },
        })
        if (res.ok) {
          const data = await res.json()
          if (data.profile?.phoneNumber) {
            setPhoneNumber(data.profile.phoneNumber)
            setHasPhoneSaved(true)
          }
        }
      } catch (err) {
        console.error("Error fetching profile:", err)
      } finally {
        setLoadingProfile(false)
      }
    }
    fetchProfile()
  }, [user])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setDebugResponse(null)

    // No longer require auth here - auth is required on results page when starting calls

    // If user is logged in and phone was entered, save it to profile via server API
    if (user && phoneNumber && !hasPhoneSaved && isValidPhoneNumber(phoneNumber)) {
      try {
        const idToken = await user.getIdToken()
        const res = await fetch("/api/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ phoneNumber }),
        })
        if (res.ok) {
          setHasPhoneSaved(true)
        }
      } catch (err) {
        console.error("Error saving phone:", err)
      }
    }

    // Validate date/time combination
    const today = getTodayDate()

    // Block past dates entirely
    if (date && date < today) {
      setError("Please select today or a future date.")
      setLoading(false)
      return
    }

    // Same-day validations
    if (date === today) {
      const currentTime = getCurrentTime()

      // If it's past calling window, block same-day searches entirely
      if (isPastCallingWindow()) {
        setError("It's too late to call restaurants today. Please search for tomorrow or later.")
        setLoading(false)
        return
      }

      // Require a time for same-day searches
      if (!time) {
        setError("Please select a time for today's reservation.")
        setLoading(false)
        return
      }

      // Don't allow past times
      if (time < currentTime) {
        setError("Please select a future time for today's reservation.")
        setLoading(false)
        return
      }
    }

    const payload: Record<string, any> = {
      craving_text: cravingText,
      location,
    }

    // Include exact GPS coordinates if available
    if (userCoords) {
      payload.user_lat = userCoords.lat
      payload.user_lng = userCoords.lng
    }

    if (partySize) {
      payload.party_size = Number(partySize)
    }

    if (date) {
      payload.date = date
    }

    // Send user's timezone so the server can validate calling hours
    try {
      payload.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
      // Fallback - server will use UTC
    }

    if (time) {
      payload.time = time
      payload.intent = "specific_time" // User picked a specific time
    } else {
      payload.intent = "next_available" // Flexible on time
    }

    if (specialRequests.trim()) {
      payload.special_requests = specialRequests.trim()
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
        // Store GPS coordinates in sessionStorage for the results page
        if (userCoords) {
          sessionStorage.setItem(`batch_${data.batchId}_userLocation`, JSON.stringify(userCoords))
        }

        // Save search to history if user is logged in
        if (user) {
          saveSearchToHistory(user.uid, {
            cravingText,
            location,
            partySize: partySize ? Number(partySize) : undefined,
            date: date || undefined,
            time: time || undefined,
            batchId: data.batchId,
          })
        }

        // Redirect to results page (not batch page)
        router.push(`/app/results/${data.batchId}`)
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
    <>
      <AppHeader />
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
              <form ref={formRef} className="flex flex-col gap-6" onSubmit={handleSubmit}>
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
                        min={mounted ? getTodayDate() : undefined}
                        max={mounted ? getMaxDate() : undefined}
                        onChange={(event) => setDate(event.target.value)}
                        className="flex h-12 w-full rounded-md border border-zinc-200 bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Large Party Notice */}
                {Number(partySize) >= 7 && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                    <div className="flex items-start gap-2">
                      <span className="text-lg">👥</span>
                      <div>
                        <div className="font-medium text-sm">Large Party Booking</div>
                        <div className="text-xs mt-0.5 opacity-80">
                          Reservations for 7+ guests may require deposits, private dining rooms, 
                          or prix fixe menus. We'll gather all the details from each restaurant for you.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Time - Quick Select Buttons */}
                <div className="grid gap-3">
                  <label className="text-sm font-semibold text-red-600">
                    Time
                  </label>

                  {/* Quick select time buttons - show available times from common dining hours */}
                  {(() => {
                    // All common dining time slots
                    const allDiningTimes = [
                      '11:30', '12:00', '12:30', '13:00', // Lunch
                      '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00' // Dinner
                    ]
                    
                    // Filter to available times and take first 12
                    const availableDiningTimes = allDiningTimes
                      .filter(t => availableTimeOptions.find(o => o.value === t))
                      .slice(0, 12)

                    const isToday = mounted && date === getTodayDate()
                    const tooLateToday = isToday && isPastCallingWindow()
                    
                    // Past the calling window — block same-day search
                    if (tooLateToday) {
                      return (
                        <div className="p-4 text-center text-sm bg-amber-50 rounded-lg border border-amber-200">
                          <div className="text-amber-800 font-medium mb-1">🌙 Restaurants are closing for the night</div>
                          <p className="text-amber-700 mb-3 text-xs">It's past 9 PM — too late to call restaurants today.</p>
                          <button
                            type="button"
                            onClick={() => {
                              const tomorrow = new Date()
                              tomorrow.setDate(tomorrow.getDate() + 1)
                              const y = tomorrow.getFullYear()
                              const m = (tomorrow.getMonth() + 1).toString().padStart(2, '0')
                              const d = tomorrow.getDate().toString().padStart(2, '0')
                              setDate(`${y}-${m}-${d}`)
                              setTime('') // Reset time so they pick a slot for tomorrow
                            }}
                            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-red-500 text-white font-medium text-sm hover:bg-red-600 transition-colors shadow-sm"
                          >
                            Search for tomorrow instead →
                          </button>
                        </div>
                      )
                    }

                    // No dining slots left but still within calling window (unlikely edge)
                    if (availableDiningTimes.length === 0 && isToday) {
                      return (
                        <div className="p-4 text-center text-sm text-zinc-500 bg-zinc-50 rounded-lg border border-zinc-200">
                          <p className="mb-2">No more dining times available today.</p>
                          <button
                            type="button"
                            onClick={() => {
                              const tomorrow = new Date()
                              tomorrow.setDate(tomorrow.getDate() + 1)
                              const y = tomorrow.getFullYear()
                              const m = (tomorrow.getMonth() + 1).toString().padStart(2, '0')
                              const d = tomorrow.getDate().toString().padStart(2, '0')
                              setDate(`${y}-${m}-${d}`)
                              setTime('')
                            }}
                            className="text-red-600 hover:text-red-700 font-medium underline"
                          >
                            Search for tomorrow instead →
                          </button>
                        </div>
                      )
                    }
                    
                    return (
                      <>
                        <div className="grid grid-cols-4 gap-2">
                          {availableDiningTimes.map(t => {
                            const opt = availableTimeOptions.find(o => o.value === t)!
                            const isSelected = time === t
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setTime(t)}
                                className={`py-2.5 px-2 text-sm font-medium rounded-lg border transition-all ${isSelected
                                  ? 'bg-red-500 text-white border-red-500 shadow-md'
                                  : 'bg-red-50 text-red-700 border-red-100 hover:border-red-300 hover:bg-red-100'
                                  }`}
                              >
                                {opt.label}
                              </button>
                            )
                          })}
                        </div>
                        {isToday && !time && (
                          <p className="text-xs text-amber-600 font-medium">
                            ⏰ Please select a time for today's search
                          </p>
                        )}
                      </>
                    )
                  })()}

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

                  {mounted && date === getTodayDate() && availableTimeOptions.length < ALL_TIME_OPTIONS.length && (
                    <p className="text-xs text-muted-foreground">
                      Only showing times at least 30 min from now
                    </p>
                  )}
                </div>

                {/* Special Requests - optional */}
                <div className="grid gap-2">
                  <details className="group">
                    <summary className="text-sm font-semibold text-red-600 cursor-pointer hover:text-red-700 transition-colors flex items-center gap-2">
                      <span>Special requests</span>
                      <span className="text-zinc-400 font-normal text-xs">(optional)</span>
                      <span className="group-open:hidden text-zinc-400">▸</span>
                      <span className="hidden group-open:inline text-zinc-400">▾</span>
                    </summary>
                    <div className="mt-3 space-y-3">
                      <textarea
                        id="specialRequests"
                        value={specialRequests}
                        onChange={(e) => setSpecialRequests(e.target.value)}
                        placeholder="e.g., Patio seating, birthday celebration, nut allergy, bar table, away from bathrooms..."
                        rows={2}
                        className="flex w-full rounded-md border border-zinc-200 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                      />
                      <div className="flex flex-wrap gap-2">
                        {["Patio seating", "Birthday celebration", "Anniversary", "Quiet table", "Bar seating", "High chair needed"].map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => {
                              const current = specialRequests.trim();
                              if (current.toLowerCase().includes(suggestion.toLowerCase())) return;
                              setSpecialRequests(current ? `${current}, ${suggestion}` : suggestion);
                            }}
                            className="px-2 py-1 text-xs rounded-full bg-zinc-100 text-zinc-600 hover:bg-red-100 hover:text-red-700 transition-colors"
                          >
                            + {suggestion}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-zinc-500">
                        Our AI will mention these requests when speaking with the restaurant
                      </p>
                    </div>
                  </details>
                </div>

                {/* Phone Number - shown for logged-in users without saved phone */}
                {user && !loadingProfile && !hasPhoneSaved && (
                  <div className="grid gap-2 p-4 bg-red-50/50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/20">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-red-500" />
                      <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300" htmlFor="phone">
                        Your phone number <span className="text-zinc-400 font-normal">(for reservations)</span>
                      </label>
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="(555) 123-4567"
                      className="h-11 border-zinc-200 focus:border-red-400 focus:ring-red-400"
                    />
                    <p className="text-xs text-zinc-500">
                      Restaurants need this to hold your table. We'll save it to your profile.
                    </p>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading || (mounted && date === getTodayDate() && isPastCallingWindow()) || (mounted && date === getTodayDate() && !time)}
                  className="h-14 text-lg font-semibold bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Searching...
                    </span>
                  ) : mounted && date === getTodayDate() && isPastCallingWindow() ? (
                    "Too late for today"
                  ) : mounted && date === getTodayDate() && !time ? (
                    "Select a time to search"
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
    </>
  )
}

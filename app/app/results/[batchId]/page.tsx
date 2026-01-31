"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Phone, Star, MapPin, Check, Loader2, Sparkles, Hand, ArrowUpDown } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { AppHeader } from "@/components/AppHeader"
import { useAuth } from "@/lib/auth-context"
import { DynamicResultsMap } from "./components/DynamicResultsMap"

type BatchItem = {
  id?: string
  place_id?: string
  name?: string
  phone?: string
  types?: string[]
  address?: string
  rating?: number
  user_ratings_total?: number
  price_level?: number
  distance_miles?: number
  lat?: number
  lng?: number
}

type QueryData = {
  location?: string
  party_size?: number
  date?: string
  time?: string
  craving?: { chips?: string[] }
}

// Format time for display
function formatTime12Hour(time24: string): string {
  if (!time24 || !time24.includes(':')) return time24
  const [hours, minutes] = time24.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours % 12 || 12
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
}

// Selection mode toggle component
function SelectionModeToggle({ 
  mode, 
  onModeChange 
}: { 
  mode: "auto" | "manual"
  onModeChange: (mode: "auto" | "manual") => void 
}) {
  return (
    <div className="flex items-center gap-2 p-1 bg-zinc-100 rounded-lg">
      <button
        onClick={() => onModeChange("auto")}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
          mode === "auto"
            ? "bg-white shadow-sm text-red-600"
            : "text-zinc-600 hover:text-zinc-900"
        }`}
      >
        <Sparkles className="h-4 w-4" />
        Let us choose
      </button>
      <button
        onClick={() => onModeChange("manual")}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
          mode === "manual"
            ? "bg-white shadow-sm text-red-600"
            : "text-zinc-600 hover:text-zinc-900"
        }`}
      >
        <Hand className="h-4 w-4" />
        I'll pick
      </button>
    </div>
  )
}

// Restaurant card with selection checkbox
function RestaurantSelectCard({
  item,
  index,
  isSelected,
  onToggle,
  showCheckbox,
}: {
  item: BatchItem
  index: number
  isSelected: boolean
  onToggle: () => void
  showCheckbox: boolean
}) {
  // Format restaurant types for display
  const displayTypes = item.types
    ?.filter(t => !["restaurant", "food", "point_of_interest", "establishment"].includes(t))
    .slice(0, 3)
    .map(t => t.replace(/_/g, " "))

  return (
    <Card 
      className={`border transition-all cursor-pointer ${
        isSelected 
          ? "border-red-300 bg-red-50/50 shadow-md" 
          : "border-zinc-200 hover:border-zinc-300 hover:shadow-sm"
      }`}
      onClick={showCheckbox ? onToggle : undefined}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Index number */}
          <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            isSelected ? "bg-red-500 text-white" : "bg-zinc-200 text-zinc-600"
          }`}>
            {index}
          </div>

          {/* Restaurant info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-base truncate">{item.name}</h3>
              {showCheckbox && (
                <Checkbox
                  checked={isSelected}
                  onChange={onToggle}
                  className="shrink-0 mt-0.5"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </div>

            {/* Rating and distance */}
            <div className="flex items-center gap-3 mt-1 text-sm">
              {item.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                  <span className="font-medium">{item.rating.toFixed(1)}</span>
                  {item.user_ratings_total && (
                    <span className="text-zinc-400">({item.user_ratings_total.toLocaleString()})</span>
                  )}
                </div>
              )}
              {item.distance_miles && (
                <span className="text-zinc-500">{item.distance_miles.toFixed(1)} mi</span>
              )}
              {item.price_level && (
                <span className="text-zinc-500">{"$".repeat(item.price_level)}</span>
              )}
            </div>

            {/* Address */}
            {item.address && (
              <div className="flex items-center gap-1 mt-1.5 text-sm text-zinc-500">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{item.address}</span>
              </div>
            )}

            {/* Types */}
            {displayTypes && displayTypes.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {displayTypes.map((type) => (
                  <Badge key={type} variant="secondary" className="text-xs capitalize">
                    {type}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SearchResultsPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const batchId = Array.isArray(params?.batchId) ? params.batchId[0] : params?.batchId

  const [items, setItems] = React.useState<BatchItem[]>([])
  const [query, setQuery] = React.useState<QueryData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [userLocation, setUserLocation] = React.useState<{ lat: number; lng: number } | null>(null)
  
  // Selection state
  const [selectionMode, setSelectionMode] = React.useState<"auto" | "manual">("auto")
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [isStartingCalls, setIsStartingCalls] = React.useState(false)
  
  // Sort state
  type SortOption = "distance" | "rating" | "reviews" | "price_low" | "price_high"
  const [sortBy, setSortBy] = React.useState<SortOption>("distance")

  // Fetch batch data
  React.useEffect(() => {
    async function fetchBatch() {
      if (!batchId) return

      try {
        const response = await fetch("/api/mcp/get-batch-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batchId }),
        })
        const data = await response.json()

        if (data?.ok === false) {
          setError(typeof data.error === "string" ? data.error : "Failed to load results")
          return
        }

        if (Array.isArray(data?.items)) {
          setItems(data.items)
          // Auto-select top 5 restaurants with phones by rating
          const withPhones = data.items.filter((i: BatchItem) => i.phone)
          const sorted = [...withPhones].sort((a, b) => (b.rating || 0) - (a.rating || 0))
          const autoSelected = new Set(sorted.slice(0, 5).map((i: BatchItem) => i.id || i.place_id || ""))
          setSelectedIds(autoSelected)
        }

        if (data?.query) {
          setQuery(data.query)
        }

        // Get user location from sessionStorage or batch data
        const sessionKey = `batch_${batchId}_userLocation`
        const storedLocation = typeof window !== 'undefined' ? sessionStorage.getItem(sessionKey) : null
        if (storedLocation) {
          try {
            const coords = JSON.parse(storedLocation)
            if (coords.lat && coords.lng) {
              setUserLocation(coords)
            }
          } catch (e) {
            // Invalid JSON
          }
        } else if (data?.user_location?.lat && data?.user_location?.lng) {
          setUserLocation(data.user_location)
        } else if (data?.map_center?.lat && data?.map_center?.lng) {
          setUserLocation({ lat: data.map_center.lat, lng: data.map_center.lng })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load results")
      } finally {
        setLoading(false)
      }
    }

    fetchBatch()
  }, [batchId])

  // Sort items based on selected sort option
  const sortedItems = React.useMemo(() => {
    const sorted = [...items]
    switch (sortBy) {
      case "distance":
        return sorted.sort((a, b) => (a.distance_miles || 999) - (b.distance_miles || 999))
      case "rating":
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0))
      case "reviews":
        return sorted.sort((a, b) => (b.user_ratings_total || 0) - (a.user_ratings_total || 0))
      case "price_low":
        return sorted.sort((a, b) => (a.price_level || 5) - (b.price_level || 5))
      case "price_high":
        return sorted.sort((a, b) => (b.price_level || 0) - (a.price_level || 0))
      default:
        return sorted
    }
  }, [items, sortBy])

  // Get restaurants with valid coordinates for map
  const restaurantsForMap = React.useMemo(() => {
    return sortedItems
      .filter(i => i.lat && i.lng)
      .map((item, idx) => ({
        id: item.id || item.place_id || `item-${idx}`,
        name: item.name || "Unknown",
        lat: item.lat!,
        lng: item.lng!,
        index: idx + 1,
        isSelected: selectedIds.has(item.id || item.place_id || ""),
      }))
  }, [sortedItems, selectedIds])

  // Map center
  const mapCenter = React.useMemo(() => {
    if (userLocation) return userLocation
    if (restaurantsForMap.length > 0) {
      const lats = restaurantsForMap.map(r => r.lat)
      const lngs = restaurantsForMap.map(r => r.lng)
      return {
        lat: lats.reduce((a, b) => a + b, 0) / lats.length,
        lng: lngs.reduce((a, b) => a + b, 0) / lngs.length,
      }
    }
    return { lat: 40.7128, lng: -74.006 } // Default NYC
  }, [userLocation, restaurantsForMap])

  // Toggle restaurant selection
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        // Limit to 5 selections
        if (next.size >= 5) {
          // Remove oldest and add new
          const firstId = next.values().next().value
          if (firstId) next.delete(firstId)
        }
        next.add(id)
      }
      return next
    })
  }

  // Handle mode change - auto-select when switching to auto mode
  const handleModeChange = (mode: "auto" | "manual") => {
    setSelectionMode(mode)
    if (mode === "auto") {
      // Re-select top 5 based on current sort (use sortedItems)
      const withPhones = sortedItems.filter(i => i.phone)
      const autoSelected = new Set(withPhones.slice(0, 5).map(i => i.id || i.place_id || ""))
      setSelectedIds(autoSelected)
    }
  }
  
  // Update auto-selection when sort changes (only in auto mode)
  React.useEffect(() => {
    if (selectionMode === "auto" && sortedItems.length > 0) {
      const withPhones = sortedItems.filter(i => i.phone)
      const autoSelected = new Set(withPhones.slice(0, 5).map(i => i.id || i.place_id || ""))
      setSelectedIds(autoSelected)
    }
  }, [sortBy, sortedItems, selectionMode])

  // Start calls
  const handleStartCalls = async () => {
    // Require auth
    if (!user) {
      const returnUrl = `/app/results/${batchId}?startCalls=true`
      router.push(`/signup?returnUrl=${encodeURIComponent(returnUrl)}`)
      return
    }

    if (selectedIds.size === 0) {
      setError("Please select at least one restaurant to call")
      return
    }

    setIsStartingCalls(true)
    setError(null)

    try {
      const selectedPlaceIds = items
        .filter(i => selectedIds.has(i.id || i.place_id || ""))
        .map(i => i.place_id)
        .filter(Boolean) as string[]

      const response = await fetch("/api/mcp/start-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          batchId,
          selected_place_ids: selectedPlaceIds,
        }),
      })
      const data = await response.json()

      if (data?.ok === false) {
        setError(typeof data.error === "string" ? data.error : "Failed to start calls")
        return
      }

      // Navigate to batch page for call progress
      router.push(`/app/batch/${batchId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start calls")
    } finally {
      setIsStartingCalls(false)
    }
  }

  // Auto-start calls if returning from signup with startCalls param
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('startCalls') === 'true' && user && !loading && items.length > 0 && !isStartingCalls) {
      // Clean up URL
      window.history.replaceState({}, '', `/app/results/${batchId}`)
      handleStartCalls()
    }
  }, [user, loading, items.length])

  // Count items with phones (callable)
  const callableCount = items.filter(i => i.phone).length

  if (loading || authLoading) {
    return (
      <>
        <AppHeader />
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-red-500" />
            <p className="text-zinc-500">Finding restaurants...</p>
          </div>
        </div>
      </>
    )
  }

  if (error && items.length === 0) {
    return (
      <>
        <AppHeader />
        <div className="min-h-screen flex items-center justify-center p-6">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => router.push("/app/search")}>
                Try New Search
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
      <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Header with search summary */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold">We found {items.length} restaurants</h1>
            {query && (
              <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-zinc-600">
                {query.craving?.chips && query.craving.chips.length > 0 && (
                  <span>🍽️ {query.craving.chips.join(", ")}</span>
                )}
                {query.location && <span>📍 {query.location}</span>}
                {query.party_size && <span>👥 {query.party_size} guests</span>}
                {query.date && <span>📅 {query.date}</span>}
                {query.time && <span>🕐 {formatTime12Hour(query.time)}</span>}
              </div>
            )}
          </div>

          {/* Main layout - Map on top, list below on mobile / Side by side on desktop */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Map section */}
            <div className="lg:sticky lg:top-6 lg:self-start">
              <DynamicResultsMap
                center={mapCenter}
                userLocation={userLocation || undefined}
                restaurants={restaurantsForMap}
                selectedIds={selectedIds}
              />
              
              {/* Selection summary card below map */}
              <Card className="mt-4 border-0 shadow-lg bg-gradient-to-r from-red-50 to-orange-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-lg">
                        {selectedIds.size} restaurant{selectedIds.size !== 1 ? "s" : ""} selected
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-red-600">FREE</p>
                      <p className="text-xs text-zinc-500">to check availability</p>
                    </div>
                  </div>

                  <Button 
                    onClick={handleStartCalls}
                    disabled={isStartingCalls || selectedIds.size === 0}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-6 text-lg"
                  >
                    {isStartingCalls ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Starting calls...
                      </>
                    ) : (
                      <>
                        <Phone className="mr-2 h-5 w-5" />
                        Search Now
                      </>
                    )}
                  </Button>

                  {!user && (
                    <p className="text-xs text-center text-zinc-500 mt-2">
                      You'll need to sign up to start calling
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Restaurant list section */}
            <div>
              {/* Controls row - Selection mode and Sort */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <p className="text-sm text-zinc-600">
                  Select up to 5 restaurants to call
                </p>
                <div className="flex items-center gap-3">
                  {/* Sort dropdown */}
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4 text-zinc-400" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="text-sm border border-zinc-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="distance">Closest</option>
                      <option value="rating">Highest Rated</option>
                      <option value="reviews">Most Reviews</option>
                      <option value="price_low">$ → $$$$</option>
                      <option value="price_high">$$$$ → $</option>
                    </select>
                  </div>
                  <SelectionModeToggle 
                    mode={selectionMode} 
                    onModeChange={handleModeChange} 
                  />
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Restaurant list */}
              <div className="space-y-3">
                {sortedItems.map((item, index) => {
                  const itemId = item.id || item.place_id || `item-${index}`
                  return (
                    <RestaurantSelectCard
                      key={itemId}
                      item={item}
                      index={index + 1}
                      isSelected={selectedIds.has(itemId)}
                      onToggle={() => toggleSelection(itemId)}
                      showCheckbox={selectionMode === "manual"}
                    />
                  )
                })}
              </div>

              {sortedItems.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-zinc-500">No restaurants found. Try a different search.</p>
                    <Button 
                      variant="outline" 
                      onClick={() => router.push("/app/search")}
                      className="mt-4"
                    >
                      New Search
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

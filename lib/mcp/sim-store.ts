type BackendItem = {
  id: string
  place_id?: string
  name: string
  phone?: string
  status?: string
  result?: any
  // Basic location info (from initial search)
  lat?: number
  lng?: number
  address?: string
  types?: string[]
  // Rating and review info (from Places API)
  rating?: number
  user_ratings_total?: number
  distance_miles?: number
  price_level?: number
}

type SimItemPlan = {
  id: string
  place_id?: string
  name: string
  phone?: string
  timeline: { callingAt: number; speakingAt: number; completedAt: number }
  outcome: "available" | "not_available" | "alternative"
  // Basic location info
  lat?: number
  lng?: number
  address?: string
  types?: string[]
  // Rating and review info
  rating?: number
  user_ratings_total?: number
  distance_miles?: number
  price_level?: number
}

type SimBatch = {
  batchId: string
  createdAt: number
  items: SimItemPlan[]
}

const STORE_KEY = "__rezkyooSimStore"

function getStore(): Map<string, SimBatch> {
  const g = globalThis as typeof globalThis & { [STORE_KEY]?: Map<string, SimBatch> }
  if (!g[STORE_KEY]) g[STORE_KEY] = new Map()
  return g[STORE_KEY]!
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function buildPlan(item: BackendItem, now: number): SimItemPlan {
  const callingAt = now + rand(0, 2000)
  const speakingAt = callingAt + rand(2000, 6000)
  const completedAt = speakingAt + rand(4000, 12000)
  const outcomeRoll = Math.random()
  const outcome =
    outcomeRoll < 0.45 ? "available" : outcomeRoll < 0.85 ? "not_available" : "alternative"

  return {
    id: item.id,
    place_id: item.place_id,
    name: item.name,
    phone: item.phone,
    timeline: { callingAt, speakingAt, completedAt },
    outcome,
    // Preserve basic location info
    lat: item.lat,
    lng: item.lng,
    address: item.address,
    types: item.types,
    // Preserve rating info
    rating: item.rating,
    user_ratings_total: item.user_ratings_total,
    distance_miles: item.distance_miles,
    price_level: item.price_level,
  }
}

export function seedSimBatch(batchId: string, items: BackendItem[]) {
  const store = getStore()
  if (store.has(batchId)) return store.get(batchId)!
  const now = Date.now()
  const plans = items.map((i) => buildPlan(i, now))
  const batch: SimBatch = { batchId, createdAt: now, items: plans }
  store.set(batchId, batch)
  return batch
}

// Force reseed - used when starting calls to reset timers
// This ensures calls don't appear "already complete" if user took time to login
export function reseedSimBatch(batchId: string, items: BackendItem[]) {
  const store = getStore()
  const now = Date.now()
  const plans = items.map((i) => buildPlan(i, now))
  const batch: SimBatch = { batchId, createdAt: now, items: plans }
  store.set(batchId, batch)
  return batch
}

export function readSimBatch(batchId: string) {
  const store = getStore()
  const batch = store.get(batchId)
  if (!batch) return null

  const now = Date.now()
  const items = batch.items.map((item) => {
    if (!item.phone) {
      return {
        id: item.id,
        place_id: item.place_id,
        name: item.name,
        phone: item.phone,
        status: "skipped",
        skip_reason: "no_phone",
        result: { outcome: "skipped" },
        // Preserve basic location info
        lat: item.lat,
        lng: item.lng,
        address: item.address,
        types: item.types,
        // Preserve rating info
        rating: item.rating,
        user_ratings_total: item.user_ratings_total,
        distance_miles: item.distance_miles,
        price_level: item.price_level,
      }
    }

    let status: "pending" | "calling" | "speaking" | "completed"
    if (now < item.timeline.callingAt) status = "pending"
    else if (now < item.timeline.speakingAt) status = "calling"
    else if (now < item.timeline.completedAt) status = "speaking"
    else status = "completed"

    const result =
      status !== "completed"
        ? undefined
        : item.outcome === "available"
          ? { 
              outcome: "available", 
              ai_summary: "We can accommodate the requested time.",
              // Simulate special request being honored for available outcomes
              special_request_status: { honored: true, note: "We'll have everything ready for you!" }
            }
          : item.outcome === "alternative"
            ? { 
                outcome: "not_available", 
                alternative_time: "6:30 PM", 
                ai_summary: "Only earlier seating available.",
                // Simulate partial special request handling
                special_request_status: { honored: false, note: "We can try to accommodate at the alternative time." }
              }
            : { outcome: "not_available", ai_summary: "No availability at requested time." }

    return {
      id: item.id,
      place_id: item.place_id,
      name: item.name,
      phone: item.phone,
      status,
      result,
      // Preserve basic location info
      lat: item.lat,
      lng: item.lng,
      address: item.address,
      types: item.types,
      // Preserve rating info
      rating: item.rating,
      user_ratings_total: item.user_ratings_total,
      distance_miles: item.distance_miles,
      price_level: item.price_level,
    }
  })

  const allDone = items.every((i) =>
    ["completed", "skipped"].includes(i.status as string)
  )

  // Calculate map center from restaurant locations
  const itemsWithCoords = items.filter(i => i.lat && i.lng)
  const mapCenter = itemsWithCoords.length > 0 ? {
    lat: itemsWithCoords.reduce((sum, i) => sum + (i.lat || 0), 0) / itemsWithCoords.length,
    lng: itemsWithCoords.reduce((sum, i) => sum + (i.lng || 0), 0) / itemsWithCoords.length,
  } : undefined

  return {
    ok: true,
    status: allDone ? "completed" : "calling",
    items,
    map_center: mapCenter,
  }
}

// ===============================
// Booking Simulation
// ===============================

type SimulatedBooking = {
  id: string
  userId: string
  batchId: string
  placeId: string
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
  status: "pending_confirmation" | "calling" | "confirmed" | "failed" | "cancelled"
  createdAt: string
  confirmsAt?: number  // Epoch time when the simulated call "confirms"
  confirmedAt?: string
  cancelledAt?: string
  failureReason?: string
  specialRequestStatus?: {
    honored: boolean
    note?: string
  }
}

const BOOKING_STORE_KEY = "__rezkyooBookingStore"

function getBookingStore(): Map<string, SimulatedBooking> {
  const g = globalThis as typeof globalThis & { [BOOKING_STORE_KEY]?: Map<string, SimulatedBooking> }
  if (!g[BOOKING_STORE_KEY]) g[BOOKING_STORE_KEY] = new Map()
  return g[BOOKING_STORE_KEY]!
}

export function setSimulatedBooking(bookingId: string, booking: SimulatedBooking) {
  const store = getBookingStore()
  store.set(bookingId, booking)
}

export function getSimulatedBooking(bookingId: string): SimulatedBooking | undefined {
  const store = getBookingStore()
  return store.get(bookingId)
}

export function updateSimulatedBooking(bookingId: string, updates: Partial<SimulatedBooking>) {
  const store = getBookingStore()
  const existing = store.get(bookingId)
  if (existing) {
    store.set(bookingId, { ...existing, ...updates })
  }
}

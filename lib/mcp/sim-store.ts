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
          ? { outcome: "available", ai_summary: "We can accommodate the requested time." }
          : item.outcome === "alternative"
            ? { outcome: "not_available", alternative_time: "6:30 PM", ai_summary: "Only earlier seating available." }
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

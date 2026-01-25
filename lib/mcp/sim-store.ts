type BackendItem = {
  id: string
  place_id?: string
  name: string
  phone?: string
  status?: string
  result?: any
}

type SimItemPlan = {
  id: string
  place_id?: string
  name: string
  phone?: string
  timeline: { callingAt: number; speakingAt: number; completedAt: number }
  outcome: "available" | "not_available" | "alternative"
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
            ? { outcome: "alternative", ai_summary: "Only earlier seating available.", alt_time: "6:30 PM" }
            : { outcome: "not_available", ai_summary: "No availability at requested time." }

    return {
      id: item.id,
      place_id: item.place_id,
      name: item.name,
      phone: item.phone,
      status,
      result,
    }
  })

  const allDone = items.every((i) =>
    ["completed", "skipped"].includes(i.status as string)
  )

  return {
    ok: true,
    status: allDone ? "completed" : "calling",
    items,
  }
}

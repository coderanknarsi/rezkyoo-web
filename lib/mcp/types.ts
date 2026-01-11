export type FindRestaurantsInput = {
  craving_text: string
  location: string
  user_lat?: number  // Exact GPS latitude (for map display)
  user_lng?: number  // Exact GPS longitude (for map display)
  party_size?: number
  date?: string
  time?: string
  intent?: string
  max_restaurants?: number
  client_id?: string
}

export type StartCallsInput = {
  batchId: string
  selected_place_ids?: string[]
}

export type GetBatchStatusInput = {
  batchId: string
  paid_token?: string
}

export type McpOk<T> = { ok: true } & T

export type McpErr = { ok: false; error: string }

export type BatchItem = {
  id: string
  place_id: string
  name: string
  phone: string
  types?: string[]
  status?: unknown
  result?: unknown
}

export type GetBatchStatusResponse =
  | {
    ok: true
    status: string
    items: any[]
    paywall_required?: boolean
    error?: string
  }
  | McpErr

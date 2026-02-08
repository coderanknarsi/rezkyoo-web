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
  timezone?: string  // IANA timezone (e.g. "America/Chicago") for calling-window validation
}

export type StartCallsInput = {
  batchId: string
  selected_place_ids?: string[]
}

export type GetBatchStatusInput = {
  batchId: string
  paid_token?: string
}

export type ConfirmBookingInput = {
  batchId: string
  placeId: string
  restaurantName: string
  restaurantPhone: string
  restaurantAddress?: string
  restaurantLat?: number
  restaurantLng?: number
  customerName: string
  customerPhone: string
  partySize: number
  date: string
  time: string
  userId?: string
}

export type GetBookingStatusInput = {
  bookingId: string
}

export type ReleaseHoldInput = {
  batchId: string
  placeId: string
  restaurantName: string
  restaurantPhone: string
}

export type BookingStatus = "pending_confirmation" | "calling" | "confirmed" | "failed"

export type BookingRecord = {
  id: string
  userId: string
  batchId: string
  placeId: string
  restaurant: {
    name: string
    phone: string
    place_id: string
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
  status: BookingStatus
  createdAt: string
  confirmedAt?: string
  failureReason?: string
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

export type ConfirmBookingResponse =
  | { ok: true; bookingId: string; message?: string }
  | McpErr

export type GetBookingStatusResponse =
  | { ok: true; status: BookingStatus; message?: string; booking?: BookingRecord }
  | McpErr


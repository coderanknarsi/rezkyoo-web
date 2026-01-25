import crypto from "crypto"

type PaidScope = "details" | "availability" | "booking"

type PaidTokenPayload = {
  sub: string
  exp: number
  scopes: PaidScope[]
  batchId?: string
}

const base64url = {
  encode: (buf: Buffer) =>
    buf
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, ""),
}

function sign(payloadPart: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payloadPart).digest()
}

export function createPaidToken(payload: PaidTokenPayload, secret?: string) {
  const key = secret || process.env.PAYWALL_TOKEN_SECRET
  if (!key) {
    throw new Error("PAYWALL_TOKEN_SECRET missing")
  }
  if (!payload.sub || !payload.sub.trim()) {
    throw new Error("invalid_payload_sub")
  }
  if (!Array.isArray(payload.scopes) || payload.scopes.length === 0) {
    throw new Error("invalid_payload_scopes")
  }
  if (typeof payload.exp !== "number" || payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error("invalid_payload_exp")
  }
  const payloadPart = base64url.encode(Buffer.from(JSON.stringify(payload), "utf8"))
  const sig = sign(payloadPart, key)
  const sigPart = base64url.encode(sig)
  return `${payloadPart}.${sigPart}`
}

export type { PaidScope, PaidTokenPayload }

/**
 * SMS sending helper via Telnyx REST API.
 *
 * Uses the same Telnyx credentials as the MCP server for voice calls.
 * Requires TELNYX_API_KEY and TELNYX_FROM_NUMBER env vars.
 */

const TELNYX_API_URL = "https://api.telnyx.com/v2/messages"

/**
 * Format a phone number to E.164 (US numbers only).
 */
function toE164(phone: string): string | null {
  const cleaned = phone.replace(/\D/g, "")
  if (cleaned.length === 10) return `+1${cleaned}`
  if (cleaned.length === 11 && cleaned.startsWith("1")) return `+${cleaned}`
  return null
}

interface SendSmsOptions {
  to: string       // Raw phone number (will be formatted to E.164)
  body: string     // Message text
}

interface SendSmsResult {
  ok: boolean
  messageId?: string
  error?: string
}

/**
 * Send an SMS message via Telnyx.
 */
export async function sendSms({ to, body }: SendSmsOptions): Promise<SendSmsResult> {
  const apiKey = process.env.TELNYX_API_KEY
  const fromNumber = process.env.TELNYX_FROM_NUMBER

  if (!apiKey || !fromNumber) {
    console.warn("⚠️ SMS skipped — TELNYX_API_KEY or TELNYX_FROM_NUMBER not set")
    return { ok: false, error: "SMS not configured" }
  }

  const e164 = toE164(to)
  if (!e164) {
    console.warn("⚠️ SMS skipped — invalid phone number:", to)
    return { ok: false, error: "Invalid phone number" }
  }

  // Ensure from number is also E.164
  const fromE164 = toE164(fromNumber)
  if (!fromE164) {
    console.warn("⚠️ SMS skipped — invalid from number:", fromNumber)
    return { ok: false, error: "Invalid from number" }
  }

  try {
    const response = await fetch(TELNYX_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromE164,
        to: e164,
        text: body,
        type: "SMS",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Telnyx SMS error:", response.status, errorText)
      return { ok: false, error: `Telnyx API error: ${response.status}` }
    }

    const data = await response.json()
    const messageId = data?.data?.id
    console.log("📱 SMS sent:", messageId, "→", e164)
    return { ok: true, messageId }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    console.error("❌ SMS send failed:", msg)
    return { ok: false, error: msg }
  }
}

/**
 * Build the post-payment SMS body.
 * Includes STOP opt-out language for TCPA compliance.
 */
export function buildPaymentSmsBody(batchUrl: string, availableCount: number): string {
  const emoji = availableCount > 1 ? "🎉" : "✅"
  const restaurants = availableCount === 1 ? "1 restaurant" : `${availableCount} restaurants`
  return [
    `${emoji} RezKyoo: ${restaurants} available!`,
    `Your hold expires in 15 min. Finish booking now:`,
    batchUrl,
    ``,
    `Reply STOP to opt out of texts.`,
  ].join("\n")
}

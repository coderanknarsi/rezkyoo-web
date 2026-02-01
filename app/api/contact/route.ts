import { NextResponse } from "next/server"

// HTML-escape user input to prevent injection
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, message } = body

    if (!name || !email || !message) {
      return NextResponse.json(
        { ok: false, error: "Name, email, and message are required" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { ok: false, error: "Invalid email format" },
        { status: 400 }
      )
    }

    const resendApiKey = process.env.RESEND_API_KEY
    const toEmail = process.env.CONTACT_TO_EMAIL || "support@rezkyoo.com"
    const fromEmail = process.env.CONTACT_FROM_EMAIL || "RezKyoo Support <support@contact.rezkyoo.com>"

    // Send via Resend
    if (resendApiKey) {
      const safeName = escapeHtml(name)
      const safeEmail = escapeHtml(email)
      const safeMessage = escapeHtml(message).replace(/\n/g, "<br>")

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: toEmail,
          reply_to: email,
          headers: {
            "Reply-To": email,
          },
          subject: `Contact Form: Message from ${safeName}`,
          html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>From:</strong> ${safeName}</p>
            <p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
            <hr />
            <p><strong>Message:</strong></p>
            <p>${safeMessage}</p>
            <hr />
            <p style="color: #888; font-size: 12px;">Sent from RezKyoo Contact Form</p>
          `,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("Resend API error:", errorData)
        throw new Error("Failed to send email")
      }

      console.log(`📧 Contact form sent via Resend to ${toEmail}`)
      return NextResponse.json({ ok: true, message: "Message sent successfully" })
    }

    // Fallback: webhook or log-only (dev mode)
    console.log("📧 Contact form submission (no RESEND_API_KEY):")
    console.log(`   From: ${name} <${email}>`)
    console.log(`   Message: ${message}`)

    const webhookUrl = process.env.CONTACT_FORM_WEBHOOK_URL
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          message,
          timestamp: new Date().toISOString(),
          source: "rezkyoo-contact-form",
        }),
      })
      return NextResponse.json({ ok: true, message: "Message sent to webhook" })
    }

    // No email service configured - log only (dev mode)
    return NextResponse.json({ 
      ok: true, 
      message: "Message received! We'll get back to you soon." 
    })

  } catch (error) {
    console.error("Contact form error:", error)
    const message = error instanceof Error ? error.message : "Failed to send message"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

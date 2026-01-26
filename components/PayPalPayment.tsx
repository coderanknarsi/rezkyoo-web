"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"

interface PayPalPaymentProps {
  batchId: string
  amount: number // in USD
  description: string
  onPaymentComplete?: () => void
  className?: string
}

declare global {
  interface Window {
    paypal?: any
  }
}

export function PayPalPayment({
  batchId,
  amount,
  description,
  onPaymentComplete,
  className = "",
}: PayPalPaymentProps) {
  const paypalRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const buttonsRendered = useRef(false)

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

  useEffect(() => {
    if (!clientId) {
      setError("PayPal not configured")
      setLoading(false)
      return
    }

    // Check if PayPal SDK is already loaded
    if (window.paypal && !buttonsRendered.current) {
      renderButtons()
      return
    }

    // Check if script is already in DOM
    const existingScript = document.querySelector(
      `script[src*="paypal.com/sdk/js"]`
    )
    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (!buttonsRendered.current) renderButtons()
      })
      return
    }

    // Load PayPal SDK
    const script = document.createElement("script")
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=capture`
    script.async = true
    script.onload = () => {
      console.log("PayPal SDK loaded")
      renderButtons()
    }
    script.onerror = () => {
      setError("Failed to load PayPal")
      setLoading(false)
    }
    document.body.appendChild(script)

    return () => {
      // Cleanup not needed - script stays for reuse
    }
  }, [clientId])

  const renderButtons = () => {
    if (!window.paypal || !paypalRef.current || buttonsRendered.current) return

    buttonsRendered.current = true
    setLoading(false)

    window.paypal
      .Buttons({
        style: {
          layout: "vertical",
          color: "gold",
          shape: "rect",
          label: "paypal",
          height: 55,
        },

        // Called when the button is clicked
        createOrder: async () => {
          try {
            const response = await fetch("/api/paypal/create-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                batchId,
                amount,
                description,
              }),
            })

            const data = await response.json()

            if (!response.ok || !data.orderID) {
              throw new Error(data.error || "Failed to create order")
            }

            return data.orderID
          } catch (err) {
            console.error("Create order error:", err)
            setError("Failed to create payment")
            throw err
          }
        },

        // Called when the payment is approved
        onApprove: async (data: { orderID: string }) => {
          try {
            const response = await fetch("/api/paypal/capture-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderID: data.orderID,
                batchId,
              }),
            })

            const result = await response.json()

            if (!response.ok || !result.success) {
              throw new Error(result.error || "Failed to capture payment")
            }

            console.log("✅ Payment successful:", result.transactionId)

            // Refresh page to show unlocked results
            if (onPaymentComplete) {
              onPaymentComplete()
            } else {
              window.location.reload()
            }
          } catch (err) {
            console.error("Capture error:", err)
            setError("Payment failed. Please try again.")
          }
        },

        onError: (err: any) => {
          console.error("PayPal error:", err)
          setError("Payment error. Please try again.")
        },

        onCancel: () => {
          console.log("Payment cancelled")
        },
      })
      .render(paypalRef.current)
  }

  if (error) {
    return (
      <div className={`text-center p-4 bg-red-50 rounded-lg ${className}`}>
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-sm text-red-700 underline"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className={className}>
      {loading && (
        <div className="flex items-center justify-center h-14 bg-gray-100 rounded-lg">
          <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
          <span className="ml-2 text-gray-500">Loading PayPal...</span>
        </div>
      )}
      <div ref={paypalRef} className={loading ? "hidden" : ""} />
      <p className="text-center text-xs text-gray-400 mt-2">
        Unlock results for ${amount.toFixed(2)}
      </p>
    </div>
  )
}

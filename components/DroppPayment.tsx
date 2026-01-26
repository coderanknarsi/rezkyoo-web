"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Lock, Loader2 } from "lucide-react"

interface DroppPaymentProps {
    batchId: string
    amount: number // in USD
    description: string
    onPaymentComplete?: () => void
    className?: string
}

/**
 * Dropp Payment Button Component
 * 
 * Uses Dropp's SDK to handle cryptocurrency/fiat payments.
 * The flow:
 * 1. User clicks button → Dropp SDK opens wallet
 * 2. User approves payment
 * 3. Dropp redirects to callback URL with p2p token
 * 4. Backend verifies and marks batch as paid
 */
export function DroppPayment({
    batchId,
    amount,
    description,
    onPaymentComplete,
    className = "",
}: DroppPaymentProps) {
    const buttonRef = useRef<HTMLButtonElement>(null)
    const scriptLoaded = useRef(false)

    const merchantId = process.env.NEXT_PUBLIC_DROPP_MERCHANT_ID
    const env = process.env.NEXT_PUBLIC_DROPP_ENV || "sandbox"
    const signingKey = process.env.NEXT_PUBLIC_DROPP_SIGNING_KEY

    // SDK URLs based on environment
    const sdkUrl = env === "production"
        ? "https://merchant.portal.dropp.cc/dropp-sdk/dropp.min.js"
        : "https://sandbox.merchantportal.dropp.cc/dropp-sdk/dropp.min.js"

    // Callback URL - where Dropp redirects after payment
    const callbackUrl = typeof window !== "undefined"
        ? `${window.location.origin}/api/dropp/callback`
        : ""

    // Generate unique request ID for this payment
    const requestId = `rezkyoo_${batchId}_${Date.now()}`

    useEffect(() => {
        // Load Dropp SDK script
        if (scriptLoaded.current) return

        const existingScript = document.querySelector(`script[src="${sdkUrl}"]`)
        if (existingScript) {
            scriptLoaded.current = true
            return
        }

        const script = document.createElement("script")
        script.src = sdkUrl
        script.async = true
        script.onload = () => {
            scriptLoaded.current = true
            console.log("Dropp SDK loaded")
        }
        script.onerror = () => {
            console.error("Failed to load Dropp SDK")
        }
        document.body.appendChild(script)

        return () => {
            // Don't remove script on unmount - other components may need it
        }
    }, [sdkUrl])

    return (
        <button
            ref={buttonRef}
            className={`dropp-payment w-full h-14 text-lg font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 ${className}`}
            data-merchant-id={merchantId}
            data-amount={amount.toFixed(2)}
            data-currency="USD"
            data-callback-url={callbackUrl}
            data-request-id={requestId}
            data-description={description}
            data-title="RezKyoo"
            data-product-name="RezKyoo"
            data-product-description={description}
            data-signing-key={signingKey}
            data-is-recurring="false"
            data-env={env}
        >
            <Lock className="h-5 w-5" />
            Unlock Results - ${amount.toFixed(2)}
        </button>
    )
}

/**
 * Alternative manual trigger for Dropp payment
 * Use this if you need more control over when payment is initiated
 */
export function useDroppPayment() {
    const initiatePayment = (config: {
        merchantId: string
        amount: number
        callbackUrl: string
        requestId: string
        description: string
    }) => {
        // Check if Dropp SDK is available
        if (typeof window !== "undefined" && (window as any).Dropp) {
            const dropp = (window as any).Dropp
            dropp.pay({
                merchantAccount: config.merchantId,
                amount: config.amount,
                callbackUrl: config.callbackUrl,
                requestId: config.requestId,
                description: config.description,
            })
        } else {
            console.error("Dropp SDK not loaded")
        }
    }

    return { initiatePayment }
}

"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, User, Mail, Calendar, CreditCard, History, Phone, CalendarCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { AppHeader } from "@/components/AppHeader"
import { useAuth } from "@/lib/auth-context"
import { updateProfile } from "firebase/auth"
import { getUserProfile } from "@/lib/user-profile"
import { auth } from "@/lib/firebase"

export default function AccountPage() {
    const { user, loading } = useAuth()
    const [fullName, setFullName] = React.useState("")
    const [phoneNumber, setPhoneNumber] = React.useState("")
    const [saving, setSaving] = React.useState(false)
    const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null)

    // Fetch user profile from Firestore
    React.useEffect(() => {
        async function fetchProfile() {
            if (!user) return
            try {
                const profile = await getUserProfile(user.uid)
                if (profile?.phoneNumber) {
                    setPhoneNumber(profile.phoneNumber)
                }
                if (profile?.displayName) {
                    setFullName(profile.displayName)
                } else if (user.displayName) {
                    setFullName(user.displayName)
                }
            } catch (err) {
                console.error("Error fetching profile:", err)
                // Fallback to Firebase Auth display name
                if (user.displayName) {
                    setFullName(user.displayName)
                }
            }
        }
        fetchProfile()
    }, [user])

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        setSaving(true)
        setMessage(null)

        try {
            // Update Firebase Auth display name
            await updateProfile(user, { displayName: fullName })

            // Update Firestore profile via server-side API (Admin SDK)
            const idToken = await user.getIdToken()
            const res = await fetch("/api/profile", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    displayName: fullName,
                    phoneNumber: phoneNumber || null,
                }),
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.error || "Failed to save profile")
            }

            setMessage({ type: "success", text: "Profile updated successfully!" })
        } catch (error) {
            console.error("Error updating profile:", error)
            setMessage({ type: "error", text: "Failed to update profile. Please try again." })
        } finally {
            setSaving(false)
        }
    }

    // Format creation date
    const createdAt = user?.metadata?.creationTime
        ? new Date(user.metadata.creationTime).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        })
        : null

    if (loading) {
        return (
            <>
                <AppHeader />
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
                    <div className="animate-pulse text-muted-foreground">Loading...</div>
                </div>
            </>
        )
    }

    if (!user) {
        return (
            <>
                <AppHeader />
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
                    <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur">
                        <CardContent className="pt-6 text-center">
                            <p className="text-muted-foreground mb-4">Please sign in to view your account.</p>
                            <Button asChild className="bg-red-500 hover:bg-red-600">
                                <Link href="/login">Sign In</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </>
        )
    }

    return (
        <>
            <AppHeader />
            <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 relative overflow-hidden">
                {/* Background decorations */}
                <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-red-400/10 blur-3xl" />
                <div className="absolute top-1/2 -left-40 h-80 w-80 rounded-full bg-orange-400/10 blur-3xl" />

                <div className="relative mx-auto max-w-2xl px-6 py-12">
                    {/* Back link */}
                    <Link
                        href="/app/search"
                        className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700 mb-6 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Search
                    </Link>

                    <h1 className="text-3xl font-bold mb-8 text-zinc-900 dark:text-white">Account Settings</h1>

                    <div className="space-y-6">
                        {/* Profile Card */}
                        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur dark:bg-zinc-900/80">
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-red-600">
                                    <User className="h-5 w-5" />
                                    Profile
                                </CardTitle>
                                <CardDescription>Your reservation contact information</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleUpdateProfile} className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                                            <Mail className="h-4 w-4 text-zinc-400" />
                                            Email
                                        </label>
                                        <Input
                                            value={user.email || ""}
                                            disabled
                                            className="bg-zinc-100 dark:bg-zinc-800 border-zinc-200"
                                        />
                                        <p className="text-xs text-zinc-500">Email cannot be changed</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                                            <User className="h-4 w-4 text-zinc-400" />
                                            Full Name
                                        </label>
                                        <Input
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="Enter your name"
                                            className="border-zinc-200 focus:border-red-400 focus:ring-red-400"
                                        />
                                        <p className="text-xs text-zinc-500">Used for restaurant reservations</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                                            <Phone className="h-4 w-4 text-zinc-400" />
                                            Phone Number
                                        </label>
                                        <Input
                                            type="tel"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            placeholder="(555) 123-4567"
                                            className="border-zinc-200 focus:border-red-400 focus:ring-red-400"
                                        />
                                        <p className="text-xs text-zinc-500">Restaurants need this to hold your table</p>
                                    </div>

                                    {createdAt && (
                                        <div className="flex items-center gap-2 text-sm text-zinc-500 pt-2">
                                            <Calendar className="h-4 w-4" />
                                            Member since {createdAt}
                                        </div>
                                    )}

                                    {message && (
                                        <p className={`text-sm font-medium ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
                                            {message.text}
                                        </p>
                                    )}

                                    <Button
                                        type="submit"
                                        disabled={saving}
                                        className="w-full h-11 bg-red-500 hover:bg-red-600 text-white font-medium shadow-lg shadow-red-500/25"
                                    >
                                        {saving ? "Saving..." : "Save Changes"}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Quick Links */}
                        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur dark:bg-zinc-900/80">
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-red-600">
                                    <History className="h-5 w-5" />
                                    Quick Links
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Button
                                    asChild
                                    variant="outline"
                                    className="w-full justify-start border-zinc-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                >
                                    <Link href="/app/account/reservations">
                                        <CalendarCheck className="h-4 w-4 mr-2" />
                                        My Reservations
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    variant="outline"
                                    className="w-full justify-start border-zinc-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                >
                                    <Link href="/app/account/history">
                                        <History className="h-4 w-4 mr-2" />
                                        View Search History
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Payment Settings (Coming Soon) */}
                        <Card className="shadow-xl border-0 bg-white/60 backdrop-blur dark:bg-zinc-900/60 opacity-70">
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-zinc-500">
                                    <CreditCard className="h-5 w-5" />
                                    Payment Methods
                                    <span className="text-xs bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded-full font-normal">
                                        Coming Soon
                                    </span>
                                </CardTitle>
                                <CardDescription>Manage your payment methods and billing</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-zinc-500">
                                    Payment integration will be available in a future update.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    )
}

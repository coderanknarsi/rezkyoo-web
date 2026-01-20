"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, User, Mail, Calendar, CreditCard, History, Phone } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { AppHeader } from "@/components/AppHeader"
import { useAuth } from "@/lib/auth-context"
import { updateProfile } from "firebase/auth"
import { getUserProfile, saveUserProfile, formatPhoneNumber } from "@/lib/user-profile"

export default function AccountPage() {
    const { user, loading } = useAuth()
    const [displayName, setDisplayName] = React.useState("")
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
            } catch (err) {
                console.error("Error fetching profile:", err)
            }
        }
        fetchProfile()
    }, [user])

    React.useEffect(() => {
        if (user?.displayName) {
            setDisplayName(user.displayName)
        }
    }, [user?.displayName])

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        setSaving(true)
        setMessage(null)

        try {
            // Update Firebase Auth display name
            await updateProfile(user, { displayName })

            // Update Firestore profile with phone number
            await saveUserProfile(user.uid, {
                displayName,
                phoneNumber: phoneNumber || null,
            })

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
                <div className="min-h-screen flex items-center justify-center">
                    <div className="animate-pulse text-muted-foreground">Loading...</div>
                </div>
            </>
        )
    }

    if (!user) {
        return (
            <>
                <AppHeader />
                <div className="min-h-screen flex items-center justify-center">
                    <Card className="w-full max-w-md">
                        <CardContent className="pt-6 text-center">
                            <p className="text-muted-foreground mb-4">Please sign in to view your account.</p>
                            <Button asChild>
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
            <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
                <div className="mx-auto max-w-2xl px-6 py-12">
                    {/* Back link */}
                    <Link
                        href="/app"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to App
                    </Link>

                    <h1 className="text-2xl font-bold mb-6">Account Settings</h1>

                    <div className="space-y-6">
                        {/* Profile Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Profile
                                </CardTitle>
                                <CardDescription>Manage your account information</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleUpdateProfile} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-muted-foreground" />
                                            Email
                                        </label>
                                        <Input value={user.email || ""} disabled className="bg-zinc-50 dark:bg-zinc-800" />
                                        <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium flex items-center gap-2">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                            Display Name
                                        </label>
                                        <Input
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            placeholder="Enter your name"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium flex items-center gap-2">
                                            <Phone className="h-4 w-4 text-muted-foreground" />
                                            Phone Number
                                        </label>
                                        <Input
                                            type="tel"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            placeholder="(555) 123-4567"
                                        />
                                        <p className="text-xs text-muted-foreground">Used for restaurant reservations and SMS notifications</p>
                                    </div>

                                    {createdAt && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Calendar className="h-4 w-4" />
                                            Member since {createdAt}
                                        </div>
                                    )}

                                    {message && (
                                        <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
                                            {message.text}
                                        </p>
                                    )}

                                    <Button type="submit" disabled={saving}>
                                        {saving ? "Saving..." : "Save Changes"}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Quick Links */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <History className="h-5 w-5" />
                                    Quick Links
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button asChild variant="outline" className="w-full justify-start">
                                    <Link href="/app/account/history">
                                        <History className="h-4 w-4 mr-2" />
                                        View Search History
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Payment Settings (Coming Soon) */}
                        <Card className="opacity-60">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5" />
                                    Payment Methods
                                    <span className="text-xs bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded-full font-normal">
                                        Coming Soon
                                    </span>
                                </CardTitle>
                                <CardDescription>Manage your payment methods and billing</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
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

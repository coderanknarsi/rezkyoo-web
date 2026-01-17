"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, History, Trash2, Calendar, MapPin, Users, Clock, ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AppHeader } from "@/components/AppHeader"
import { useAuth } from "@/lib/auth-context"
import { getSearchHistory, clearSearchHistory, SearchHistoryItem } from "@/lib/search-history"

export default function SearchHistoryPage() {
    const { user, loading: authLoading } = useAuth()
    const [history, setHistory] = React.useState<SearchHistoryItem[]>([])
    const [loading, setLoading] = React.useState(true)
    const [clearing, setClearing] = React.useState(false)

    // Fetch history on mount
    React.useEffect(() => {
        async function fetchHistory() {
            if (!user) return
            setLoading(true)
            try {
                const items = await getSearchHistory(user.uid)
                setHistory(items)
            } catch (error) {
                console.error("Failed to load history:", error)
            } finally {
                setLoading(false)
            }
        }

        if (user) {
            fetchHistory()
        } else if (!authLoading) {
            setLoading(false)
        }
    }, [user, authLoading])

    const handleClearHistory = async () => {
        if (!user || !confirm("Are you sure you want to clear all search history?")) return

        setClearing(true)
        try {
            await clearSearchHistory(user.uid)
            setHistory([])
        } catch (error) {
            console.error("Failed to clear history:", error)
            alert("Failed to clear history. Please try again.")
        } finally {
            setClearing(false)
        }
    }

    // Format date for display
    const formatDate = (date: Date) => {
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
        })
    }

    if (authLoading || loading) {
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
                            <p className="text-muted-foreground mb-4">Please sign in to view your search history.</p>
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
                        href="/app/account"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Account
                    </Link>

                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <History className="h-6 w-6" />
                            Search History
                        </h1>
                        {history.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleClearHistory}
                                disabled={clearing}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {clearing ? "Clearing..." : "Clear All"}
                            </Button>
                        )}
                    </div>

                    {history.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                                <p className="text-muted-foreground">No search history yet.</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Your searches will appear here.
                                </p>
                                <Button asChild className="mt-4">
                                    <Link href="/app/search">Start Searching</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {history.map((item) => (
                                <Link key={item.id} href={`/app/batch/${item.batchId}`}>
                                    <Card className="hover:shadow-md hover:border-red-200 transition-all cursor-pointer">
                                        <CardContent className="py-4">
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1">
                                                    <p className="font-medium">{item.cravingText || "Restaurant search"}</p>
                                                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="h-3.5 w-3.5" />
                                                            {item.location}
                                                        </span>
                                                        {item.partySize && (
                                                            <span className="flex items-center gap-1">
                                                                <Users className="h-3.5 w-3.5" />
                                                                {item.partySize} guests
                                                            </span>
                                                        )}
                                                        {item.date && (
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="h-3.5 w-3.5" />
                                                                {item.date}
                                                            </span>
                                                        )}
                                                        {item.time && (
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="h-3.5 w-3.5" />
                                                                {item.time}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-2">
                                                        {formatDate(item.createdAt)}
                                                    </p>
                                                </div>
                                                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}

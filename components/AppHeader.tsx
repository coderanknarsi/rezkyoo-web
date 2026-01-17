"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { User, LogOut, Settings, History, ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"

export function AppHeader() {
    const { user, loading, signOut } = useAuth()
    const router = useRouter()
    const [dropdownOpen, setDropdownOpen] = React.useState(false)
    const dropdownRef = React.useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleSignOut = async () => {
        try {
            await signOut()
            router.push("/login")
        } catch (error) {
            console.error("Sign out failed:", error)
        }
    }

    // Get display name or email
    const displayName = user?.displayName || user?.email?.split("@")[0] || "User"
    const userEmail = user?.email || ""

    return (
        <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
                {/* Logo */}
                <Link
                    href="/app"
                    className="flex items-center gap-2 font-bold text-lg text-red-600 hover:text-red-700 transition-colors"
                >
                    <span className="text-2xl">🍽️</span>
                    <span>Rez Q</span>
                </Link>

                {/* Right side */}
                <div className="flex items-center gap-3">
                    {loading ? (
                        <div className="h-8 w-8 animate-pulse rounded-full bg-zinc-200" />
                    ) : user ? (
                        /* User dropdown */
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-200 transition-colors dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                            >
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
                                    {displayName.charAt(0).toUpperCase()}
                                </div>
                                <span className="hidden sm:inline max-w-[120px] truncate">{displayName}</span>
                                <ChevronDown className={`h-4 w-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                            </button>

                            {dropdownOpen && (
                                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-zinc-200 bg-white shadow-lg ring-1 ring-black/5 dark:border-zinc-700 dark:bg-zinc-900">
                                    {/* User info */}
                                    <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
                                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{displayName}</p>
                                        <p className="text-xs text-zinc-500 truncate">{userEmail}</p>
                                    </div>

                                    {/* Menu items */}
                                    <div className="py-1">
                                        <Link
                                            href="/app/account"
                                            onClick={() => setDropdownOpen(false)}
                                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                        >
                                            <Settings className="h-4 w-4" />
                                            Account Settings
                                        </Link>
                                        <Link
                                            href="/app/account/history"
                                            onClick={() => setDropdownOpen(false)}
                                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                        >
                                            <History className="h-4 w-4" />
                                            Search History
                                        </Link>
                                    </div>

                                    {/* Sign out */}
                                    <div className="border-t border-zinc-100 py-1 dark:border-zinc-800">
                                        <button
                                            onClick={handleSignOut}
                                            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                                        >
                                            <LogOut className="h-4 w-4" />
                                            Sign Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Sign in button */
                        <Button asChild variant="outline" size="sm">
                            <Link href="/login">Sign In</Link>
                        </Button>
                    )}
                </div>
            </div>
        </header>
    )
}

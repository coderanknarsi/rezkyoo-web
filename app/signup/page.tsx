"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Mail, Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/lib/auth-context"

export default function SignupPage() {
    const router = useRouter()
    const { user, signUp, signInWithGoogle, loading } = useAuth()
    const [email, setEmail] = React.useState("")
    const [password, setPassword] = React.useState("")
    const [confirmPassword, setConfirmPassword] = React.useState("")
    const [error, setError] = React.useState<string | null>(null)
    const [isLoading, setIsLoading] = React.useState(false)

    // Redirect if already logged in
    React.useEffect(() => {
        if (user && !loading) {
            router.push("/app/search")
        }
    }, [user, loading, router])

    const handleEmailSignUp = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (password !== confirmPassword) {
            setError("Passwords do not match")
            return
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters")
            return
        }

        setIsLoading(true)

        try {
            await signUp(email, password)
            router.push("/app/search")
        } catch (err: any) {
            setError(err.message || "Failed to create account")
        } finally {
            setIsLoading(false)
        }
    }

    const handleGoogleSignUp = async () => {
        setError(null)
        setIsLoading(true)

        try {
            await signInWithGoogle()
            router.push("/app/search")
        } catch (err: any) {
            setError(err.message || "Failed to sign up with Google")
        } finally {
            setIsLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen flex-col bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-red-400/20 blur-3xl" />
            <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-orange-400/20 blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-red-300/10 blur-3xl" />

            {/* Header */}
            <header className="relative z-10 px-6 py-4">
                <div className="mx-auto max-w-6xl">
                    <Link href="/" className="inline-block">
                        <Image
                            src="/rezkyoo-logo-horizontal-transparent.png"
                            alt="RezKyoo"
                            width={160}
                            height={40}
                            className="h-10 w-auto"
                        />
                    </Link>
                </div>
            </header>

            {/* Main content */}
            <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
                <Card className="w-full max-w-md border-0 shadow-2xl bg-white/80 backdrop-blur-sm dark:bg-zinc-900/80">
                    <CardHeader className="text-center pb-4">
                        <div className="mx-auto mb-4">
                            <Image
                                src="/rezkyoo-logo-horizontal-transparent.png"
                                alt="RezKyoo"
                                width={180}
                                height={45}
                                className="h-12 w-auto"
                            />
                        </div>
                        <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
                        <CardDescription>Get started with RezKyoo today</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {error && (
                            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                                {error}
                            </div>
                        )}

                        <Button
                            variant="outline"
                            className="w-full gap-2 h-11 border-zinc-300 hover:bg-zinc-50 hover:border-zinc-400 dark:border-zinc-700"
                            onClick={handleGoogleSignUp}
                            disabled={isLoading}
                        >
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Continue with Google
                        </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <Separator />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-muted-foreground dark:bg-zinc-900">
                                    Or continue with email
                                </span>
                            </div>
                        </div>

                        <form onSubmit={handleEmailSignUp} className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        className="pl-10 h-11 border-zinc-300 focus:border-red-500 focus:ring-red-500"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        className="pl-10 h-11 border-zinc-300 focus:border-red-500 focus:ring-red-500"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        className="pl-10 h-11 border-zinc-300 focus:border-red-500 focus:ring-red-500"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-11 bg-red-500 hover:bg-red-600 text-white font-medium shadow-lg shadow-red-500/25"
                                disabled={isLoading}
                            >
                                {isLoading ? "Creating account..." : "Create account"}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 pt-2">
                        <div className="text-center text-sm text-muted-foreground">
                            Already have an account?{" "}
                            <Link href="/login" className="font-medium text-red-600 hover:text-red-500">
                                Sign in
                            </Link>
                        </div>
                    </CardFooter>
                </Card>
            </div>

            {/* Footer */}
            <footer className="relative z-10 px-6 py-4 text-center text-sm text-zinc-500">
                <Link href="/" className="hover:text-zinc-700">← Back to home</Link>
            </footer>
        </div>
    )
}

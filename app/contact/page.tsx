"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { Mail, MessageSquare, MapPin, Phone, Send, ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function ContactPage() {
    const [name, setName] = React.useState("")
    const [email, setEmail] = React.useState("")
    const [message, setMessage] = React.useState("")
    const [submitted, setSubmitted] = React.useState(false)
    const [isLoading, setIsLoading] = React.useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        // Simulate form submission
        await new Promise(resolve => setTimeout(resolve, 1000))

        setSubmitted(true)
        setIsLoading(false)
    }

    return (
        <div className="flex min-h-screen flex-col bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-red-400/20 blur-3xl" />
            <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-orange-400/20 blur-3xl" />

            {/* Header */}
            <header className="relative z-10 border-b bg-white/80 backdrop-blur-sm dark:bg-zinc-950/80">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
                    <Link href="/" className="inline-block">
                        <Image
                            src="/rezkyoo-logo-horizontal-transparent.png"
                            alt="RezKyoo"
                            width={160}
                            height={40}
                            className="h-10 w-auto"
                        />
                    </Link>
                    <Button asChild size="sm" className="bg-red-500 hover:bg-red-600">
                        <Link href="/app/search">Get Started</Link>
                    </Button>
                </div>
            </header>

            {/* Main content */}
            <main className="relative z-10 flex-1 px-6 py-16">
                <div className="mx-auto max-w-4xl">
                    {/* Back link */}
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 mb-8"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to home
                    </Link>

                    <div className="text-center mb-12">
                        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
                            Contact Us
                        </h1>
                        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
                            Have a question or feedback? We'd love to hear from you.
                        </p>
                    </div>

                    <div className="grid gap-8 lg:grid-cols-2">
                        {/* Contact Info */}
                        <div className="space-y-6">
                            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-zinc-900/80">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MessageSquare className="h-5 w-5 text-red-500" />
                                        Get in Touch
                                    </CardTitle>
                                    <CardDescription>
                                        We typically respond within 24 hours
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <Mail className="h-5 w-5 text-red-500 mt-0.5" />
                                        <div>
                                            <p className="font-medium">Email</p>
                                            <a href="mailto:support@rezkyoo.com" className="text-sm text-zinc-600 hover:text-red-500">
                                                support@rezkyoo.com
                                            </a>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Phone className="h-5 w-5 text-red-500 mt-0.5" />
                                        <div>
                                            <p className="font-medium">Phone</p>
                                            <p className="text-sm text-zinc-600">Coming soon</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <MapPin className="h-5 w-5 text-red-500 mt-0.5" />
                                        <div>
                                            <p className="font-medium">Location</p>
                                            <p className="text-sm text-zinc-600">United States</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-lg bg-gradient-to-br from-red-500 to-red-600 text-white">
                                <CardContent className="py-6">
                                    <h3 className="font-semibold text-lg mb-2">Need help with a reservation?</h3>
                                    <p className="text-red-100 text-sm mb-4">
                                        Check your batch status or start a new search to find available tables.
                                    </p>
                                    <Button asChild variant="secondary" size="sm">
                                        <Link href="/app/search">Find a Table</Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Contact Form */}
                        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-zinc-900/80">
                            <CardHeader>
                                <CardTitle>Send us a message</CardTitle>
                                <CardDescription>
                                    Fill out the form below and we'll get back to you
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {submitted ? (
                                    <div className="text-center py-8">
                                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                                            <Send className="h-6 w-6" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Message sent!</h3>
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
                                            Thank you for reaching out. We'll get back to you soon.
                                        </p>
                                        <Button
                                            variant="outline"
                                            className="mt-4"
                                            onClick={() => {
                                                setSubmitted(false)
                                                setName("")
                                                setEmail("")
                                                setMessage("")
                                            }}
                                        >
                                            Send another message
                                        </Button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div className="space-y-2">
                                            <label htmlFor="name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                                Name
                                            </label>
                                            <Input
                                                id="name"
                                                type="text"
                                                placeholder="Your name"
                                                className="h-11 border-zinc-300"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                                Email
                                            </label>
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="you@example.com"
                                                className="h-11 border-zinc-300"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label htmlFor="message" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                                Message
                                            </label>
                                            <textarea
                                                id="message"
                                                placeholder="How can we help you?"
                                                className="w-full min-h-[120px] rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value)}
                                                required
                                            />
                                        </div>

                                        <Button
                                            type="submit"
                                            className="w-full h-11 bg-red-500 hover:bg-red-600 text-white font-medium shadow-lg shadow-red-500/25"
                                            disabled={isLoading}
                                        >
                                            {isLoading ? "Sending..." : "Send Message"}
                                        </Button>
                                    </form>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 border-t px-6 py-8 bg-white/50 dark:bg-zinc-950/50">
                <div className="mx-auto max-w-6xl text-center text-sm text-zinc-500">
                    <p>© {new Date().getFullYear()} RezKyoo. AI Calls. Real Tables.</p>
                </div>
            </footer>
        </div>
    )
}

"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowLeft } from "lucide-react"

export default function TermsPage() {
    const lastUpdated = "January 18, 2026"

    return (
        <div className="flex min-h-screen flex-col bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
            {/* Header */}
            <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-zinc-950/80">
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
                </div>
            </header>

            {/* Main content */}
            <main className="flex-1 px-6 py-12">
                <div className="mx-auto max-w-3xl">
                    {/* Back link */}
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 mb-8"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to home
                    </Link>

                    <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white mb-4">
                        Terms of Service
                    </h1>
                    <p className="text-sm text-zinc-500 mb-8">Last updated: {lastUpdated}</p>

                    <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8">
                        {/* Introduction */}
                        <section>
                            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">1. Introduction</h2>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                Welcome to RezKyoo ("we," "our," or "us"). By accessing or using our AI-powered restaurant
                                reservation service, you agree to be bound by these Terms of Service. Please read them carefully
                                before using our platform.
                            </p>
                        </section>

                        {/* Service Description */}
                        <section>
                            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">2. Service Description</h2>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                RezKyoo is an AI-powered service that calls restaurants on your behalf to check availability
                                and secure reservations. Our service:
                            </p>
                            <ul className="list-disc pl-6 text-zinc-600 dark:text-zinc-400 space-y-2 mt-2">
                                <li>Uses automated AI voice technology to contact restaurants</li>
                                <li>Searches for available tables based on your preferences</li>
                                <li>Attempts to secure temporary holds for you to confirm</li>
                                <li>Does not guarantee reservation availability at any restaurant</li>
                            </ul>
                        </section>

                        {/* Payment Terms */}
                        <section>
                            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">3. Payment & Pricing</h2>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                RezKyoo operates on a success-based payment model:
                            </p>
                            <ul className="list-disc pl-6 text-zinc-600 dark:text-zinc-400 space-y-2 mt-2">
                                <li><strong>Free to search:</strong> You can search for restaurants without charge</li>
                                <li><strong>Pay only on success:</strong> Fees apply only when a reservation is successfully confirmed</li>
                                <li><strong>No hidden fees:</strong> The total price is displayed before you confirm a booking</li>
                                <li><strong>Refunds:</strong> If a restaurant fails to honor a confirmed reservation due to our error, you may be eligible for a refund</li>
                            </ul>
                        </section>

                        {/* User Responsibilities */}
                        <section>
                            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">4. User Responsibilities</h2>
                            <p className="text-zinc-600 dark:text-zinc-400">By using RezKyoo, you agree to:</p>
                            <ul className="list-disc pl-6 text-zinc-600 dark:text-zinc-400 space-y-2 mt-2">
                                <li>Provide accurate information (party size, date, time, contact details)</li>
                                <li>Honor confirmed reservations or cancel in a timely manner</li>
                                <li>Not misuse the service for spam, fraud, or harassment</li>
                                <li>Not attempt to reverse engineer or interfere with our systems</li>
                                <li>Use the service for personal, non-commercial purposes only</li>
                            </ul>
                        </section>

                        {/* Limitations */}
                        <section>
                            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">5. Limitations & Disclaimers</h2>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                While we strive to provide excellent service, please understand:
                            </p>
                            <ul className="list-disc pl-6 text-zinc-600 dark:text-zinc-400 space-y-2 mt-2">
                                <li><strong>No guarantee:</strong> We cannot guarantee that any restaurant will have availability or accept AI-initiated reservations</li>
                                <li><strong>Third-party restaurants:</strong> Restaurants are independent businesses; we are not responsible for their service quality, pricing, or policies</li>
                                <li><strong>Temporary holds:</strong> A "hold" is not a confirmed reservation until you complete the confirmation process</li>
                                <li><strong>Service availability:</strong> Our service may be unavailable due to maintenance, outages, or other factors beyond our control</li>
                            </ul>
                        </section>

                        {/* Privacy */}
                        <section>
                            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">6. Privacy & Data</h2>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                Your privacy is important to us:
                            </p>
                            <ul className="list-disc pl-6 text-zinc-600 dark:text-zinc-400 space-y-2 mt-2">
                                <li>We collect only the information necessary to provide our service</li>
                                <li>AI call recordings may be retained briefly for quality assurance but are not stored permanently</li>
                                <li>We do not sell your personal information to third parties</li>
                                <li>Your data is handled in accordance with our <Link href="/privacy" className="text-red-500 hover:text-red-600">Privacy Policy</Link></li>
                            </ul>
                        </section>

                        {/* Intellectual Property */}
                        <section>
                            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">7. Intellectual Property</h2>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                All content, branding, technology, and materials on RezKyoo are owned by us or our licensors.
                                You may not copy, modify, distribute, or create derivative works without our written permission.
                            </p>
                        </section>

                        {/* Termination */}
                        <section>
                            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">8. Account Termination</h2>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                We reserve the right to suspend or terminate your account if you violate these terms,
                                engage in fraudulent activity, or abuse our service. You may also delete your account
                                at any time through your account settings.
                            </p>
                        </section>

                        {/* Limitation of Liability */}
                        <section>
                            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">9. Limitation of Liability</h2>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                To the maximum extent permitted by law, RezKyoo shall not be liable for any indirect,
                                incidental, special, consequential, or punitive damages, including but not limited to
                                loss of profits, data, or goodwill, arising from your use of our service.
                            </p>
                        </section>

                        {/* Changes */}
                        <section>
                            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">10. Changes to Terms</h2>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                We may update these Terms of Service from time to time. We will notify you of significant
                                changes via email or through our platform. Continued use of our service after changes
                                constitutes acceptance of the updated terms.
                            </p>
                        </section>

                        {/* Contact */}
                        <section>
                            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">11. Contact Us</h2>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                If you have questions about these Terms of Service, please contact us at{" "}
                                <a href="mailto:support@rezkyoo.com" className="text-red-500 hover:text-red-600">
                                    support@rezkyoo.com
                                </a>{" "}
                                or visit our <Link href="/contact" className="text-red-500 hover:text-red-600">Contact page</Link>.
                            </p>
                        </section>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t px-6 py-8 bg-white/50 dark:bg-zinc-950/50">
                <div className="mx-auto max-w-6xl text-center text-sm text-zinc-500">
                    <p>© {new Date().getFullYear()} RezKyoo. Your personal reservation concierge.</p>
                </div>
            </footer>
        </div>
    )
}

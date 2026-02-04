"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowLeft } from "lucide-react"

export default function PrivacyPolicyPage() {
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

          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white mb-4">Privacy Policy</h1>
          <p className="text-sm text-zinc-500 mb-8">Last updated: {lastUpdated}</p>

          <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">1. Overview</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                This Privacy Policy explains how RezKyoo ("RezKyoo," "we," "our," or "us") collects, uses, and
                shares information when you use our website and AI-powered restaurant reservation service.
              </p>
              <p className="text-zinc-600 dark:text-zinc-400">
                RezKyoo helps you find restaurants and, when you choose, places calls to restaurants on your behalf to
                check availability and help you secure a reservation.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">2. Information We Collect</h2>
              <p className="text-zinc-600 dark:text-zinc-400">We may collect the following categories of information:</p>
              <ul className="list-disc pl-6 text-zinc-600 dark:text-zinc-400 space-y-2 mt-2">
                <li>
                  <strong>Account information:</strong> email address and authentication identifiers when you create an
                  account or sign in.
                </li>
                <li>
                  <strong>Reservation details you provide:</strong> party size, date/time, location, and any notes or
                  special requests you enter.
                </li>
                <li>
                  <strong>Contact information for a booking:</strong> details necessary to confirm a reservation (for
                  example, a name and phone number if required by a restaurant).
                </li>
                <li>
                  <strong>Usage and device information:</strong> basic analytics such as pages viewed, device/browser
                  type, approximate location (e.g., city), and IP address.
                </li>
                <li>
                  <strong>Call-related information:</strong> call status, timing, and outcomes (e.g., available/not
                  available, alternate times offered) for calls placed on your behalf.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">3. How We Use Information</h2>
              <p className="text-zinc-600 dark:text-zinc-400">We use information to:</p>
              <ul className="list-disc pl-6 text-zinc-600 dark:text-zinc-400 space-y-2 mt-2">
                <li>Provide, maintain, and improve the service</li>
                <li>Find restaurants that match your search criteria</li>
                <li>Place calls and communicate with restaurants on your behalf</li>
                <li>Confirm, modify, or cancel reservations you request</li>
                <li>Provide customer support and respond to requests</li>
                <li>Prevent fraud, abuse, and security incidents</li>
                <li>Comply with applicable legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">4. How We Share Information</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                We do not sell your personal information. We may share information in the following circumstances:
              </p>
              <ul className="list-disc pl-6 text-zinc-600 dark:text-zinc-400 space-y-2 mt-2">
                <li>
                  <strong>With restaurants:</strong> we share the information needed to request availability and, if you
                  choose to confirm, to complete the reservation (such as party size, time, and your name/phone when
                  required).
                </li>
                <li>
                  <strong>With service providers:</strong> we use third-party vendors to power the service (for example,
                  telephony providers to place calls, mapping/search providers to find restaurants, cloud hosting, and
                  authentication/database providers).
                </li>
                <li>
                  <strong>With payment processors:</strong> if you purchase a paid feature, payments are handled by
                  third-party processors; we receive confirmation and limited transaction details.
                </li>
                <li>
                  <strong>For legal and safety reasons:</strong> to comply with law, enforce our terms, or protect the
                  rights, safety, and security of RezKyoo, our users, restaurants, or others.
                </li>
                <li>
                  <strong>Business transfers:</strong> if we are involved in a merger, acquisition, or asset sale,
                  information may be transferred as part of that transaction.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">5. AI Calls and Communications</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                When you initiate calls, RezKyoo uses automated systems to communicate with restaurants. Calls are made
                on your behalf to check availability, request alternative times, and (when you confirm) help finalize a
                reservation.
              </p>
              <p className="text-zinc-600 dark:text-zinc-400">
                We may process call audio and related data through our telephony and AI providers to operate the service.
                We generally do not store call audio recordings as part of normal operation.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">6. Cookies and Analytics</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                We may use cookies or similar technologies to keep you signed in, remember preferences, and understand
                how the site is used. You can control cookies through your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">7. Data Retention</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                We retain information for as long as necessary to provide the service, comply with legal obligations,
                resolve disputes, and enforce our agreements. Retention periods may vary depending on the type of data
                and the context in which it was collected.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">8. Security</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                We use reasonable administrative, technical, and physical safeguards designed to protect information.
                However, no method of transmission or storage is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">9. Your Choices</h2>
              <ul className="list-disc pl-6 text-zinc-600 dark:text-zinc-400 space-y-2 mt-2">
                <li>
                  <strong>Account:</strong> you can update certain account details or delete your account through your
                  account settings (where available).
                </li>
                <li>
                  <strong>Marketing:</strong> if we send marketing emails, you can opt out by following the unsubscribe
                  link.
                </li>
                <li>
                  <strong>Cookies:</strong> adjust browser settings to manage cookies.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">10. Childrens Privacy</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                RezKyoo is not directed to children under 13 (or the age required by local law), and we do not knowingly
                collect personal information from children.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">11. Changes to This Policy</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                We may update this Privacy Policy from time to time. If we make material changes, we will take
                reasonable steps to notify you (for example, by posting an updated policy on this page).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">12. Contact Us</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                If you have questions about this Privacy Policy or our privacy practices, contact us at{" "}
                <a href="mailto:support@rezkyoo.com" className="text-red-500 hover:text-red-600">
                  support@rezkyoo.com
                </a>
                .
              </p>
              <p className="text-zinc-600 dark:text-zinc-400">
                You can also visit our <Link href="/contact" className="text-red-500 hover:text-red-600">Contact page</Link>.
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t px-6 py-8 bg-white/50 dark:bg-zinc-950/50">
        <div className="mx-auto max-w-6xl text-center text-sm text-zinc-500">
          <p>9 {new Date().getFullYear()} RezKyoo. Your personal reservation concierge.</p>
        </div>
      </footer>
    </div>
  )
}

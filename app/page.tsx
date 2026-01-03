import Link from "next/link"
import { Phone, Search, Clock, CheckCircle, Users, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm dark:bg-zinc-950/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-sm">
              RQ
            </div>
            <span className="text-xl font-bold tracking-tight">Rez Q</span>
          </div>
          <Button asChild size="sm">
            <Link href="/app">Get Started</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <Sparkles className="h-4 w-4" />
            AI-Powered Restaurant Reservations
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-6xl">
            Skip the hold music.
            <br />
            <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
              Let AI call for you.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Rez Q calls restaurants on your behalf to check availability and secure reservations.
            No more waiting on hold or playing phone tag. Just tell us what you want, and we'll handle the rest.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600">
              <Link href="/app/search">
                <Search className="h-4 w-4" />
                Find a Table
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link href="#how-it-works">
                Learn How It Works
              </Link>
            </Button>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-teal-400/20 blur-3xl" />
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-t bg-zinc-50/50 px-6 py-24 dark:bg-zinc-900/50">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
              Three simple steps to your perfect reservation
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {/* Step 1 */}
            <div className="relative flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg">
                <Search className="h-8 w-8" />
              </div>
              <div className="absolute -right-4 top-8 hidden text-4xl font-bold text-zinc-200 dark:text-zinc-800 sm:block">→</div>
              <h3 className="mt-6 text-xl font-semibold text-zinc-900 dark:text-white">Tell Us What You Want</h3>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                Enter your cuisine preference, location, party size, and desired date/time.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-lg">
                <Phone className="h-8 w-8" />
              </div>
              <div className="absolute -right-4 top-8 hidden text-4xl font-bold text-zinc-200 dark:text-zinc-800 sm:block">→</div>
              <h3 className="mt-6 text-xl font-semibold text-zinc-900 dark:text-white">AI Calls Restaurants</h3>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                Our AI voice agent calls multiple restaurants simultaneously to check availability.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-lg">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-zinc-900 dark:text-white">Confirm Your Booking</h3>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                Review the results, pick your favorite, and we'll lock in your reservation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
              Why Rez Q?
            </h2>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Clock className="h-6 w-6" />}
              title="Save Time"
              description="No more waiting on hold. Our AI handles multiple calls at once while you do what matters."
            />
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="Large Groups Welcome"
              description="Specialized handling for parties of 7+, including private rooms and set menu negotiations."
            />
            <FeatureCard
              icon={<Phone className="h-6 w-6" />}
              title="Real Conversations"
              description="Our AI talks naturally with restaurant hosts, handling questions and special requests."
            />
            <FeatureCard
              icon={<CheckCircle className="h-6 w-6" />}
              title="Confirmed Holds"
              description="We secure a temporary hold so you can confirm at your convenience."
            />
            <FeatureCard
              icon={<Search className="h-6 w-6" />}
              title="Multiple Options"
              description="We call several restaurants and present you with the best available options."
            />
            <FeatureCard
              icon={<Sparkles className="h-6 w-6" />}
              title="Smart Negotiation"
              description="For large parties, we ask about perks, private rooms, and special offers."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to skip the phone calls?
          </h2>
          <p className="mt-4 text-lg text-emerald-100">
            Find your perfect table in minutes, not hours.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-8 gap-2">
            <Link href="/app/search">
              <Search className="h-4 w-4" />
              Start Searching
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-xs">
                RQ
              </div>
              <span className="font-semibold">Rez Q</span>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              © 2026 Rez Q. AI-powered restaurant reservations.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="group rounded-2xl border bg-white p-6 shadow-sm transition-all hover:shadow-md dark:bg-zinc-900">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 transition-colors group-hover:bg-emerald-500 group-hover:text-white dark:bg-emerald-900/30 dark:text-emerald-400">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
    </div>
  )
}

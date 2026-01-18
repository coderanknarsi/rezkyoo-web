"use client"

import Link from "next/link"
import Image from "next/image"
import { Phone, Search, Clock, CheckCircle, Users, Sparkles, Star, Shield, Quote } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function Home() {
  const currentYear = new Date().getFullYear()

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm dark:bg-zinc-950/80">
        <div className="mx-auto flex h-24 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center">
            <Image
              src="/rezkyoo-logo-horizontal-transparent.png"
              alt="RezKyoo"
              width={240}
              height={60}
              className="h-12 w-auto"
              priority
            />
          </Link>
          <Button asChild size="lg" className="bg-red-500 hover:bg-red-600">
            <Link href="/app/search">Get Started</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
            {/* Left: Text Content */}
            <div className="text-center lg:text-left">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-red-100 px-4 py-1.5 text-sm font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                <Sparkles className="h-4 w-4" />
                AI-Powered Restaurant Reservations
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-5xl lg:text-6xl">
                Skip the hold music.
                <br />
                <span className="bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
                  Let AI call for you.
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400 mx-auto lg:mx-0">
                RezKyoo calls restaurants on your behalf to check availability and secure reservations.
                No more waiting on hold or playing phone tag.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
                <Button asChild size="lg" className="gap-2 bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25">
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

              {/* Trust badge */}
              <div className="mt-8 flex items-center justify-center lg:justify-start gap-2 text-sm text-zinc-500">
                <Shield className="h-4 w-4 text-red-500" />
                <span>Your privacy is protected. We never share your information.</span>
              </div>
            </div>

            {/* Right: Hero Image Mockup */}
            <div className="relative">
              <div className="relative mx-auto max-w-lg lg:max-w-none">
                {/* Glow effect behind image */}
                <div className="absolute -inset-4 bg-gradient-to-r from-red-500/20 to-orange-500/20 blur-3xl rounded-3xl" />

                {/* Main mockup image */}
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800">
                  <Image
                    src="/hero-mockup.png"
                    alt="RezKyoo calling restaurants in real-time"
                    width={600}
                    height={400}
                    className="w-full h-auto"
                    priority
                  />
                </div>

                {/* Floating status badges */}
                <div className="absolute -bottom-4 -left-4 rounded-lg bg-white dark:bg-zinc-900 shadow-lg p-3 border animate-pulse">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-yellow-500 animate-pulse" />
                    <span className="text-sm font-medium">Calling 5 restaurants...</span>
                  </div>
                </div>

                <div className="absolute -top-4 -right-4 rounded-lg bg-white dark:bg-zinc-900 shadow-lg p-3 border">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="text-sm font-medium text-green-600">Table Available!</span>
                  </div>
                </div>

                <div className="absolute top-1/2 -left-6 -translate-y-1/2 rounded-lg bg-white dark:bg-zinc-900 shadow-lg p-3 border">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-sm font-medium text-blue-600">Speaking with staff...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-red-400/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-orange-400/10 blur-3xl" />
      </section>

      {/* Social Proof / Trust Section */}
      <section className="border-y bg-white/50 px-6 py-10 dark:bg-zinc-900/50">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-12">
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <div className="flex -space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="font-medium">4.9/5 from 500+ users</span>
            </div>
            <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-700 hidden sm:block" />
            <div className="text-zinc-600 dark:text-zinc-400">
              <span className="font-semibold text-red-500">10,000+</span> reservations secured
            </div>
            <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-700 hidden sm:block" />
            <div className="text-zinc-600 dark:text-zinc-400">
              <span className="font-semibold text-red-500">2,500+</span> restaurants called
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-zinc-50/50 px-6 py-24 dark:bg-zinc-900/50">
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
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25">
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
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25">
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
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25">
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

      {/* Testimonials */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
              What Our Users Say
            </h2>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
              Real experiences from real diners
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            <TestimonialCard
              quote="RezKyoo got me a table at a fully-booked steakhouse on Valentine's Day. I couldn't believe it worked!"
              author="Sarah M."
              role="New York, NY"
              rating={5}
            />
            <TestimonialCard
              quote="As a busy exec, I don't have time to call restaurants. This saves me hours every week. Game changer."
              author="Michael T."
              role="San Francisco, CA"
              rating={5}
            />
            <TestimonialCard
              quote="Booked a private room for my mom's 70th birthday. The AI even negotiated a champagne toast!"
              author="Jessica L."
              role="Chicago, IL"
              rating={5}
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-zinc-50/50 px-6 py-24 dark:bg-zinc-900/50">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
              Why RezKyoo?
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
              icon={<Shield className="h-6 w-6" />}
              title="Privacy First"
              description="Your personal information is never shared. Calls are made on your behalf, not as you."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to skip the phone calls?
          </h2>
          <p className="mt-4 text-lg text-red-100">
            Find your perfect table in minutes, not hours.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-8 gap-2 shadow-lg">
            <Link href="/app/search">
              <Search className="h-4 w-4" />
              Start Searching
            </Link>
          </Button>

          {/* Privacy note near CTA */}
          <p className="mt-6 text-sm text-red-100/80">
            <Shield className="inline h-4 w-4 mr-1" />
            Free to search • Only pay when you book • No call recordings stored
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <Link href="/" className="flex items-center">
              <Image
                src="/rezkyoo-logo-horizontal-transparent.png"
                alt="RezKyoo"
                width={160}
                height={40}
                className="h-8 w-auto"
              />
            </Link>
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-6 text-sm text-zinc-500 dark:text-zinc-400">
              <Link href="#" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Terms of Service</Link>
              <Link href="#" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Contact Us</Link>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              © {currentYear} RezKyoo. AI Calls. Real Tables.
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
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-500 transition-colors group-hover:bg-red-500 group-hover:text-white dark:bg-red-900/30 dark:text-red-400">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
    </div>
  )
}

function TestimonialCard({ quote, author, role, rating }: { quote: string; author: string; role: string; rating: number }) {
  return (
    <div className="relative rounded-2xl border bg-white p-6 shadow-sm dark:bg-zinc-900">
      <Quote className="absolute top-4 right-4 h-8 w-8 text-red-100 dark:text-red-900/50" />
      <div className="flex gap-0.5 mb-4">
        {[...Array(rating)].map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="text-zinc-700 dark:text-zinc-300 italic">"{quote}"</p>
      <div className="mt-4 pt-4 border-t">
        <p className="font-semibold text-zinc-900 dark:text-white">{author}</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{role}</p>
      </div>
    </div>
  )
}

"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

export default function SearchPage() {
  const router = useRouter()
  const [cravingText, setCravingText] = React.useState("")
  const [location, setLocation] = React.useState("")
  const [partySize, setPartySize] = React.useState("")
  const [date, setDate] = React.useState("")
  const [time, setTime] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [debugResponse, setDebugResponse] = React.useState<any>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setDebugResponse(null)

    const payload: Record<string, any> = {
      craving_text: cravingText,
      location,
    }

    if (partySize) {
      payload.party_size = Number(partySize)
    }

    if (date) {
      payload.date = date
    }

    if (time) {
      payload.time = time
    }

    try {
      const response = await fetch("/api/mcp/find-restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await response.json()

      if (data?.ok === false) {
        setError(typeof data.error === "string" ? data.error : "Unknown error")
        setDebugResponse(data)
        return
      }

      if (data?.batchId) {
        router.push(`/app/batch/${data.batchId}`)
        return
      }

      setDebugResponse(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Find restaurants</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="cravingText">
                What are you craving?
              </label>
              <Input
                id="cravingText"
                value={cravingText}
                onChange={(event) => setCravingText(event.target.value)}
                placeholder="Sushi, burger, pasta..."
                required
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="location">
                Location
              </label>
              <Input
                id="location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="City or neighborhood"
                required
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="partySize">
                Party size
              </label>
              <Input
                id="partySize"
                type="number"
                min={1}
                value={partySize}
                onChange={(event) => setPartySize(event.target.value)}
                placeholder="2"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="date">
                Date
              </label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="time">
                Time
              </label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </div>
            <Separator />
            <Button type="submit" disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Search error</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {error}
          </CardContent>
        </Card>
      ) : null}

      {debugResponse ? (
        <Card>
          <CardHeader>
            <CardTitle>Debug response</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm">
              {JSON.stringify(debugResponse, null, 2)}
            </pre>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

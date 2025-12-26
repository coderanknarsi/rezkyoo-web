import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AppHomePage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle>RezKyoo App</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground">
            Search for restaurants and queue booking calls.
          </p>
          <Button asChild className="w-fit">
            <Link href="/app/search">Go to search</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

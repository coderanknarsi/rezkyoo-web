import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function UnlockPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Unlock availability</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Payments coming next. After checkout we’ll mint a paid_token server-side
          and reveal availability.
        </CardContent>
      </Card>
    </div>
  )
}

import { redirect } from "next/navigation"

export default function AppHomePage() {
  // Redirect to search page - no need for an intermediate landing page
  redirect("/app/search")
}

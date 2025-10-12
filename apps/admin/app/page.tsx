import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Панель администратора — Self-Hosted Video Chat"
}

export default async function AdminHomePage() {
  redirect("/admin/dashboard")
  return null
}

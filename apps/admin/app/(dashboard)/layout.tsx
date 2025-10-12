import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { AdminShell } from "@/components/layout/admin-shell"
import { getInitialSession } from "@video-chat/web-auth/session/server"

export const metadata: Metadata = {
  title: "Админ-панель — Self-Hosted Video Chat"
}

export default async function AdminDashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  const session = await getInitialSession()

  if (session.status !== "authenticated" || !session.user) {
    redirect("/auth/login")
  }

  return <AdminShell user={session.user}>{children}</AdminShell>
}

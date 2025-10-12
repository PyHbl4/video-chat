import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { AppShell } from "@/components/layout/app-shell"
import { getInitialSession } from "@video-chat/web-auth/session/server"

export const metadata: Metadata = {
  title: "Приложение — Self-Hosted Video Chat"
}

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  const session = await getInitialSession()

  if (session.status !== "authenticated" || !session.user) {
    redirect("/auth/login")
  }

  return <AppShell user={session.user}>{children}</AppShell>
}

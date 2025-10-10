import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getInitialSession } from "@video-chat/web-auth/session/server"
import { FriendsAppPage } from "@/components/app/friends-app-page"

export const metadata: Metadata = {
  title: "Приложение — Self-Hosted Video Chat"
}

export default async function AppHomePage() {
  const session = await getInitialSession()

  if (session.status !== "authenticated" || !session.user) {
    redirect("/auth/login")
  }

  return <FriendsAppPage user={session.user} />
}

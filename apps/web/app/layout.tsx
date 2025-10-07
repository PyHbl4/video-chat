import type { Metadata } from "next"

import "./globals.css"

import { SessionProvider } from "@/components/session/session-provider"
import { getInitialSession } from "@/lib/session/server"

export const metadata: Metadata = {
  title: "Self-Hosted Video Chat",
  description: "Self-hosted WebRTC mesh video chat"
}

export default async function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  const session = await getInitialSession()

  return (
    <html lang="ru">
      <body>
        <SessionProvider initialSession={session}>{children}</SessionProvider>
      </body>
    </html>
  )
}

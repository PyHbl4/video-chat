import type { Metadata } from "next"

import "./globals.css"

import { SessionProvider, getInitialSession } from "@video-chat/web-auth"

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
      <body className="min-h-screen bg-background text-foreground antialiased">
        <SessionProvider initialSession={session}>{children}</SessionProvider>
      </body>
    </html>
  )
}

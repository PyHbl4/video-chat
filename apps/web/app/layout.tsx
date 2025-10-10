import type { Metadata } from "next"

import "./globals.css"

import { SessionProvider } from "@video-chat/web-auth"
import { Toaster } from "@video-chat/ui"
import { getInitialSession } from "@video-chat/web-auth/session/server"

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
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  )
}

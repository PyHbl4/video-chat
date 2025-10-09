import type { Metadata } from "next"

import "./globals.css"

import { SessionProvider, getInitialSession } from "@video-chat/web-auth"

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Admin interface for the video chat platform"
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

import * as React from "react"
import type { Metadata } from "next"

import "@/styles/globals.css"

import { ThemeProvider } from "@/components/providers/theme-provider"

export const metadata: Metadata = {
  title: "ownSpace",
  description: "Self-hosted video collaboration platform"
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}

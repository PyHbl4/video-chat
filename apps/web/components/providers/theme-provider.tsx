"use client"

import * as React from "react"
import { ThemeProvider as NextThemeProvider } from "next-themes"

export interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="ownspace-theme"
      disableTransitionOnChange
    >
      {children}
    </NextThemeProvider>
  )
}

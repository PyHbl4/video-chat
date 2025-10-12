"use client"

import * as React from "react"

import type { SessionSnapshot } from "@video-chat/web-auth"

const AppUserContext = React.createContext<SessionSnapshot["user"] | null | undefined>(undefined)

export interface AppUserProviderProps {
  user: SessionSnapshot["user"] | null | undefined
  children: React.ReactNode
}

export function AppUserProvider({ user, children }: AppUserProviderProps) {
  return <AppUserContext.Provider value={user}>{children}</AppUserContext.Provider>
}

export function useAppUser() {
  const context = React.useContext(AppUserContext)

  if (context === undefined) {
    throw new Error("useAppUser must be used within AppUserProvider")
  }

  return context
}

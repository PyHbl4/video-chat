"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import type { SessionContextValue, SessionSnapshot } from "@/lib/session/types"

const SessionContext = createContext<SessionContextValue | undefined>(undefined)

export interface SessionProviderProps {
  initialSession: SessionSnapshot
  children: React.ReactNode
}

export function SessionProvider({ initialSession, children }: SessionProviderProps) {
  const [state, setState] = useState<SessionSnapshot>(initialSession)

  useEffect(() => {
    setState((prev) => {
      if (prev.fetchedAt === initialSession.fetchedAt) {
        return prev
      }
      return initialSession
    })
  }, [initialSession])

  const update = useCallback((updater: (prev: SessionSnapshot) => SessionSnapshot) => {
    setState((prev) => updater(prev))
  }, [])

  const refresh = useCallback(async () => {
    const response = await fetch("/api/session", {
      method: "GET",
      credentials: "include",
      cache: "no-store"
    })

    if (!response.ok) {
      throw new Error(`Failed to refresh session: ${response.status}`)
    }

    const next = (await response.json()) as SessionSnapshot
    setState(next)
    return next
  }, [])

  const value = useMemo<SessionContextValue>(
    () => ({
      state,
      setState,
      update,
      refresh
    }),
    [state, update, refresh]
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSessionContext(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) {
    throw new Error("useSessionContext must be used within a SessionProvider")
  }
  return ctx
}

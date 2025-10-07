"use client"

import { useSessionContext } from "@/components/session/session-provider"
import type { SessionSnapshot } from "@/lib/session/types"

export function useSession(): {
  session: SessionSnapshot
  refresh: () => Promise<SessionSnapshot>
  setSession: (next: SessionSnapshot) => void
} {
  const ctx = useSessionContext()
  return {
    session: ctx.state,
    refresh: ctx.refresh,
    setSession: ctx.setState
  }
}

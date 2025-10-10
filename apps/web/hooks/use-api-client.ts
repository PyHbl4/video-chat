"use client"

import { useMemo } from "react"

import { ApiClient } from "@video-chat/contracts"
import { env } from "@video-chat/web-auth"
import { useSession } from "@video-chat/web-auth/hooks/use-session"

export function useApiClient(): ApiClient {
  const { session, refresh } = useSession()

  return useMemo(() => {
    return new ApiClient({
      baseUrl: env.client.apiBaseUrl,
      credentials: "include",
      getAccessToken: async () => session.tokens.accessToken,
      getCsrfToken: async () => session.csrfToken,
      refresh: async () => {
        const next = await refresh()
        return next.status === "authenticated"
      }
    })
  }, [session.tokens.accessToken, session.csrfToken, refresh])
}

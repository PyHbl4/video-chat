import { ApiError } from "@video-chat/contracts"
import { cookies } from "next/headers"

import { createServerAuthApi } from "../api/server"
import {
  ACCESS_TOKEN_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME
} from "../env"
import { createEmptySession, type SessionSnapshot, type SessionTokens } from "./types"

export async function getInitialSession(): Promise<SessionSnapshot> {
  const cookieStore = await cookies()
  const csrfToken = cookieStore.get(CSRF_COOKIE_NAME)?.value ?? null
  const baseSession = createEmptySession(csrfToken)
  const sessionWithCookies = mergeTokensFromCookies(baseSession, cookieStore)

  try {
    const auth = createServerAuthApi()
    const { data } = await auth.me()
    return {
      ...sessionWithCookies,
      status: "authenticated",
      user: data,
      fetchedAt: new Date().toISOString()
    }
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        return sessionWithCookies
      }

      return {
        ...sessionWithCookies,
        error: {
          message: error.message,
          code: error.body?.error
        },
        fetchedAt: new Date().toISOString()
      }
    }

    return {
      ...sessionWithCookies,
      error: {
        message: "Unexpected error while loading session"
      },
      fetchedAt: new Date().toISOString()
    }
  }
}

type CookieStore = Awaited<ReturnType<typeof cookies>>

function mergeTokensFromCookies(base: SessionSnapshot, cookieStore: CookieStore): SessionSnapshot {
  const tokensFromCookies: Pick<SessionTokens, "accessToken" | "refreshToken"> = {
    accessToken: cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value ?? null,
    refreshToken: cookieStore.get(REFRESH_TOKEN_COOKIE_NAME)?.value ?? null
  }

  if (!tokensFromCookies.accessToken && !tokensFromCookies.refreshToken) {
    return base
  }

  return {
    ...base,
    tokens: {
      ...base.tokens,
      ...tokensFromCookies
    }
  }
}

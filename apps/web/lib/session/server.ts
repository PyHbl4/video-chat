import { ApiError } from "@video-chat/contracts"
import { cookies } from "next/headers"

import { CSRF_COOKIE_NAME } from "../env"
import { createServerAuthApi } from "../api/server"
import { createEmptySession, type SessionSnapshot } from "./types"

export async function getInitialSession(): Promise<SessionSnapshot> {
  const cookieStore = await cookies()
  const csrfToken = cookieStore.get(CSRF_COOKIE_NAME)?.value ?? null
  const baseSession = createEmptySession(csrfToken)

  try {
    const auth = createServerAuthApi()
    const { data } = await auth.me()
    return {
      ...baseSession,
      status: "authenticated",
      user: data,
      fetchedAt: new Date().toISOString()
    }
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        return baseSession
      }

      return {
        ...baseSession,
        error: {
          message: error.message,
          code: error.body?.error
        },
        fetchedAt: new Date().toISOString()
      }
    }

    return {
      ...baseSession,
      error: {
        message: "Unexpected error while loading session"
      },
      fetchedAt: new Date().toISOString()
    }
  }
}

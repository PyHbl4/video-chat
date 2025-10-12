import {
  ApiClient,
  createAuthApi,
  createUsersApi,
  type UserPreferences,
  type UserPreferencesUpdate
} from "@video-chat/contracts"
import { cookies, headers } from "next/headers"

import { CSRF_COOKIE_NAME, env } from "../env"

export function createServerApiClient() {
  return new ApiClient({
    baseUrl: env.server.apiBaseUrl,
    defaultHeaders: async () => {
      const cookieStore = await cookies()
      const headerList = await headers()
      const headerMap: Record<string, string> = {
        accept: "application/json"
      }

      const cookieHeader = cookieStore
        .getAll()
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; ")

      if (cookieHeader) {
        headerMap.cookie = cookieHeader
      }

      const forwardedFor = headerList.get("x-forwarded-for")
      if (forwardedFor) {
        headerMap["x-forwarded-for"] = forwardedFor
      }

      const userAgent = headerList.get("user-agent")
      if (userAgent) {
        headerMap["user-agent"] = userAgent
      }

      return headerMap
    },
    getCsrfToken: async () => {
      const cookieStore = await cookies()
      return cookieStore.get(CSRF_COOKIE_NAME)?.value ?? null
    }
  })
}

export function createServerAuthApi() {
  const client = createServerApiClient()
  return createAuthApi(client)
}

export function createServerUsersApi() {
  const client = createServerApiClient()
  return createUsersApi(client)
}

export async function getPreferences(): Promise<UserPreferences> {
  const api = createServerUsersApi()
  const { data } = await api.getPreferences()
  return data
}

export async function updatePreferences(
  body: UserPreferencesUpdate
): Promise<UserPreferences> {
  const api = createServerUsersApi()
  const { data } = await api.updatePreferences(body)
  return data
}

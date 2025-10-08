import assert from "node:assert/strict"

import { loginActionWithDependencies, type LoginFields } from "@/lib/auth/actions"
import { createInitialFormState } from "@/lib/auth/types"
import { CSRF_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/lib/env"
import { applyResponseCookies } from "@/lib/server/set-cookie"
import type { SessionSnapshot } from "@/lib/session/types"
import type { createServerAuthApi } from "@/lib/api/server"

type CookieInput = {
  name: string
  value: string
  path?: string
  domain?: string
  httpOnly?: boolean
  sameSite?: "lax" | "strict" | "none"
  secure?: boolean
  expires?: Date
  maxAge?: number
}

type ActionCookieStore = NonNullable<Parameters<typeof applyResponseCookies>[1]>
type AuthApi = ReturnType<typeof createServerAuthApi>

type CookieStore = {
  set: (cookie: CookieInput) => void
  delete: (name: string) => void
  get: (name: string) => { name: string; value: string } | undefined
  getAll: () => Array<{ name: string; value: string }>
}

function createMockCookieStore(): CookieStore & { snapshot: Map<string, CookieInput> } {
  const jar = new Map<string, CookieInput>()

  return {
    set(cookie) {
      jar.set(cookie.name, { ...cookie })
    },
    delete(name) {
      jar.delete(name)
    },
    get(name) {
      const entry = jar.get(name)
      return entry ? { name: entry.name, value: entry.value } : undefined
    },
    getAll() {
      return Array.from(jar.values()).map((cookie) => ({ name: cookie.name, value: cookie.value }))
    },
    snapshot: jar
  }
}

async function run() {
  const cookieStore = createMockCookieStore()

  const loginResponseHeaders = new Headers()
  loginResponseHeaders.append(
    "set-cookie",
    `session=session-id; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600; Expires=Wed, 21 Oct 2025 07:28:00 GMT`
  )
  loginResponseHeaders.append(
    "set-cookie",
    `${CSRF_COOKIE_NAME}=csrf-cookie; Path=/; SameSite=Lax`
  )

  const loginResponse = new Response(null, { headers: loginResponseHeaders })
  ;(loginResponse.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie = undefined

  const deps = {
    getCookieStore: async () => cookieStore as unknown as ActionCookieStore,
    createAuthApi: () =>
      ({
        login: async () => ({
          data: {
            csrf_token: "csrf-token-from-api",
            access_token: "access-token",
            refresh_token: "refresh-token",
            expires_in: 900,
            refresh_expires_in: 2592000
          },
          response: loginResponse
        })
      } satisfies Pick<AuthApi, "login">) as unknown as AuthApi,
    getInitialSession: async () => ({
      status: "unauthenticated",
      user: null,
      csrfToken: null,
      tokens: {
        accessToken: null,
        refreshToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null
      },
      fetchedAt: new Date().toISOString()
    } satisfies SessionSnapshot),
    applyCookiesFromResponse: (response: Response) =>
      applyResponseCookies(response, cookieStore as unknown as ActionCookieStore)
  }

  const formData = new FormData()
  formData.set("identifier", "tester")
  formData.set("password", "password123")

  const result = await loginActionWithDependencies(deps, createInitialFormState<LoginFields>(), formData)

  assert.equal(result.status, "success", "login action should succeed")
  assert.ok(result.session, "session payload should be returned")

  const sessionCookie = cookieStore.snapshot.get(SESSION_COOKIE_NAME)
  assert.ok(sessionCookie, "session cookie should be set")
  assert.equal(sessionCookie?.httpOnly, true, "session cookie should be httpOnly")
  assert.equal(sessionCookie?.secure, true, "session cookie should preserve secure flag")
  assert.equal(sessionCookie?.sameSite, "lax", "session cookie should preserve SameSite")
  assert.equal(sessionCookie?.path, "/", "session cookie should keep path")
  assert.equal(sessionCookie?.maxAge, 3600, "session cookie should keep max-age")
  assert.ok(sessionCookie?.expires instanceof Date, "session cookie should have expires date")

  const csrfCookie = cookieStore.snapshot.get(CSRF_COOKIE_NAME)
  assert.ok(csrfCookie, "csrf cookie should be set")
  assert.equal(csrfCookie?.value, "csrf-token-from-api", "csrf cookie should use API token")
  assert.equal(csrfCookie?.httpOnly, false, "csrf cookie from action should be readable")

  console.log("Login action smoke test passed")
}

run().catch((error) => {
  console.error("Login action smoke test failed", error)
  process.exitCode = 1
})

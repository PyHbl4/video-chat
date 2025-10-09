"use server"

import { ApiError } from "@video-chat/contracts"

import { createServerAuthApi } from "../api/server"
import { CSRF_COOKIE_NAME, isProduction } from "../env"
import { authDebug, isAuthDebugEnabled } from "../server/debug-logger"
import { applyResponseCookies, deleteCookies } from "../server/set-cookie"
import { getInitialSession } from "../session/server"
import { createEmptySession, deriveTokensFromLogin, type SessionSnapshot } from "../session/types"
import type { FieldErrors, FormState } from "./types"

type CookieStore = Awaited<ReturnType<typeof import("next/headers").cookies>>

interface LoginActionDependencies {
  getCookieStore: () => Promise<CookieStore>
  createAuthApi: typeof createServerAuthApi
  getInitialSession: typeof getInitialSession
  applyCookiesFromResponse: (response: Response, store: CookieStore) => Promise<void>
}

const defaultLoginActionDependencies: LoginActionDependencies = {
  getCookieStore: async () => {
    const { cookies } = await import("next/headers")
    return cookies()
  },
  createAuthApi: createServerAuthApi,
  getInitialSession,
  applyCookiesFromResponse: (response, store) => applyResponseCookies(response, store)
}

export type LoginFields = "identifier" | "password"
export type RegisterFields = "email" | "username" | "password"

function normalizeString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : ""
}

function mergeFieldErrors<T extends string>(
  target: FieldErrors<T> = {},
  source: Record<string, string | undefined> | undefined
): FieldErrors<T> {
  if (!source) return target
  const result: FieldErrors<T> = { ...target }
  for (const [key, value] of Object.entries(source)) {
    if (value) {
      result[key as T] = value
    }
  }
  return result
}

function handleUnexpectedError<T extends string>(
  error: unknown,
  fallbackMessage: string
): FormState<T> {
  console.error("[auth] unexpected error", error)
  return {
    status: "error",
    message: fallbackMessage
  }
}

export async function loginAction(
  prevState: FormState<LoginFields>,
  formData: FormData
): Promise<FormState<LoginFields>> {
  return loginActionWithDependencies(defaultLoginActionDependencies, prevState, formData)
}

export async function loginActionWithDependencies(
  deps: LoginActionDependencies,
  _prevState: FormState<LoginFields>,
  formData: FormData
): Promise<FormState<LoginFields>> {
  const identifier = normalizeString(formData.get("identifier"))
  const password = normalizeString(formData.get("password"))

  const fieldErrors: FieldErrors<LoginFields> = {}

  if (identifier.length < 3) {
    fieldErrors.identifier = "Минимум 3 символа"
  }

  if (password.length < 8) {
    fieldErrors.password = "Минимум 8 символов"
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "validation",
      fieldErrors
    }
  }

  try {
    if (isAuthDebugEnabled()) {
      authDebug("loginAction: received form data", {
        identifierLength: identifier.length,
        hasPassword: password.length > 0
      })
    }

    const cookieStore = await deps.getCookieStore()
    const auth = deps.createAuthApi()

    if (isAuthDebugEnabled()) {
      authDebug("loginAction: sending login request", {
        identifierLength: identifier.length
      })
    }

    const { data, response } = await auth.login({
      identifier,
      password,
      device: {
        kind: "web"
      }
    })

    if (isAuthDebugEnabled()) {
      authDebug("loginAction: login response received", {
        status: response.status,
        hasSetCookieHeader: response.headers.has("set-cookie"),
        headerKeys: Array.from(response.headers.keys())
      })
    }

    await deps.applyCookiesFromResponse(response, cookieStore)

    const csrfToken = data.csrf_token ?? null
    if (csrfToken) {
      cookieStore.set({
        name: CSRF_COOKIE_NAME,
        value: csrfToken,
        httpOnly: false,
        sameSite: "lax",
        secure: isProduction,
        path: "/"
      })

      if (isAuthDebugEnabled()) {
        authDebug("loginAction: csrf token cookie stored", {
          present: true,
          length: csrfToken.length
        })
      }
    } else {
      try {
        cookieStore.delete(CSRF_COOKIE_NAME)
      } catch {
        // ignore
      }

      if (isAuthDebugEnabled()) {
        authDebug("loginAction: csrf token missing from response")
      }
    }

    const session = await deps.getInitialSession()
    const tokens = deriveTokensFromLogin(data)

    if (isAuthDebugEnabled()) {
      authDebug("loginAction: derived tokens snapshot", {
        hasAccessToken: Boolean(tokens.accessToken),
        hasRefreshToken: Boolean(tokens.refreshToken)
      })
    }

    const nextSession: SessionSnapshot = {
      ...session,
      csrfToken: csrfToken ?? session.csrfToken,
      tokens,
      fetchedAt: new Date().toISOString()
    }

    return {
      status: "success",
      session: nextSession
    }
  } catch (error) {
    if (error instanceof ApiError) {
      const body = error.body
      const mappedErrors = mergeFieldErrors<LoginFields>(fieldErrors, body?.fields as Record<string, string | undefined>)
      let message = body?.message ?? "Не удалось войти"

      if (error.status === 401) {
        message = "Неверные учетные данные"
      } else if (error.status === 403) {
        message = "Аккаунт заблокирован"
      }

      return {
        status: "error",
        message,
        fieldErrors: Object.keys(mappedErrors).length ? mappedErrors : undefined
      }
    }

    return handleUnexpectedError<LoginFields>(error, "Не удалось войти. Повторите попытку позже.")
  }
}

export async function registerAction(
  _prevState: FormState<RegisterFields>,
  formData: FormData
): Promise<FormState<RegisterFields>> {
  const email = normalizeString(formData.get("email"))
  const username = normalizeString(formData.get("username"))
  const password = normalizeString(formData.get("password"))

  const fieldErrors: FieldErrors<RegisterFields> = {}

  if (!email.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) {
    fieldErrors.email = "Введите корректный email"
  }

  if (username.length < 3) {
    fieldErrors.username = "Минимум 3 символа"
  }

  if (password.length < 8) {
    fieldErrors.password = "Минимум 8 символов"
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "validation",
      fieldErrors
    }
  }

  try {
    const auth = createServerAuthApi()
    await auth.register({
      email,
      username,
      password
    })

    return {
      status: "success",
      message: "Регистрация прошла успешно. Теперь вы можете войти."
    }
  } catch (error) {
    if (error instanceof ApiError) {
      const body = error.body
      const mappedErrors = mergeFieldErrors<RegisterFields>(fieldErrors, body?.fields as Record<string, string | undefined>)
      let message = body?.message ?? "Не удалось зарегистрироваться"

      if (error.status === 409) {
        message = "Пользователь с такими данными уже существует"
      }

      return {
        status: "error",
        message,
        fieldErrors: Object.keys(mappedErrors).length ? mappedErrors : undefined
      }
    }

    return handleUnexpectedError<RegisterFields>(
      error,
      "Не удалось зарегистрироваться. Попробуйте ещё раз позже."
    )
  }
}

export async function logoutAction(): Promise<SessionSnapshot> {
  try {
    const auth = createServerAuthApi()
    const result = await auth.logout()
    await applyResponseCookies(result.response)
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error
    }
  }

  await deleteCookies([CSRF_COOKIE_NAME])

  return createEmptySession(null)
}

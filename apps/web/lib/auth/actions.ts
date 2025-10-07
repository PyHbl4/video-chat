"use server"

import { ApiError } from "@video-chat/contracts"
import { cookies } from "next/headers"

import { CSRF_COOKIE_NAME, isProduction } from "@/lib/env"
import { applyResponseCookies, deleteCookies } from "@/lib/server/set-cookie"
import { createServerAuthApi } from "@/lib/api/server"
import { getInitialSession } from "@/lib/session/server"
import { createEmptySession, deriveTokensFromLogin, type SessionSnapshot } from "@/lib/session/types"

import type { FieldErrors, FormState } from "./types"
import { createInitialFormState } from "./types"

export type LoginFields = "identifier" | "password"
export type RegisterFields = "email" | "username" | "password"

export const initialLoginState = createInitialFormState<LoginFields>()
export const initialRegisterState = createInitialFormState<RegisterFields>()

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

export async function loginAction(
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
    const auth = createServerAuthApi()
    const { data, response } = await auth.login({
      identifier,
      password,
      device: {
        kind: "web"
      }
    })

    await applyResponseCookies(response)

    const csrfToken = data.csrf_token ?? null
    const cookieStore = await cookies()
    if (csrfToken) {
      cookieStore.set({
        name: CSRF_COOKIE_NAME,
        value: csrfToken,
        httpOnly: false,
        sameSite: "lax",
        secure: isProduction,
        path: "/"
      })
    } else {
      try {
        cookieStore.delete(CSRF_COOKIE_NAME)
      } catch {
        // ignore
      }
    }

    const session = await getInitialSession()
    const tokens = deriveTokensFromLogin(data)
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

    throw error
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

    throw error
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

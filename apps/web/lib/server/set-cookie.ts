import { cookies } from "next/headers"

import { isProduction } from "../env"
import { authDebug, isAuthDebugEnabled } from "./debug-logger"

type SameSite = "lax" | "strict" | "none"

type CookieStore = Awaited<ReturnType<typeof cookies>>

interface ParsedCookie {
  name: string
  value: string
  expires?: Date
  maxAge?: number
  domain?: string
  path?: string
  secure?: boolean
  httpOnly?: boolean
  sameSite?: SameSite
}

export async function applyResponseCookies(response: Response, store?: CookieStore) {
  const targetStore = store ?? (await cookies())
  const setCookieHeader = collectSetCookieHeaders(response.headers)
  if (setCookieHeader.length === 0) {
    if (isAuthDebugEnabled()) {
      authDebug("applyResponseCookies: no Set-Cookie headers detected", {
        responseHeaders: Array.from(response.headers.keys())
      })
    }
    return
  }

  const appliedCookies: Array<{ name: string; attributes: Partial<ParsedCookie> }> = []

  for (const entry of setCookieHeader) {
    const parsed = parseSetCookie(entry)
    if (!parsed) continue

    targetStore.set({
      name: parsed.name,
      value: parsed.value,
      path: parsed.path ?? "/",
      domain: parsed.domain,
      httpOnly: parsed.httpOnly ?? false,
      sameSite: parsed.sameSite,
      secure: parsed.secure ?? isProduction,
      expires: parsed.expires,
      maxAge: parsed.maxAge
    })

    if (isAuthDebugEnabled()) {
      const { name, value: _value, ...attributes } = parsed
      appliedCookies.push({ name, attributes })
    }
  }

  if (isAuthDebugEnabled()) {
    authDebug("applyResponseCookies: applied cookies", {
      count: appliedCookies.length,
      cookies: appliedCookies
    })
  }
}

export async function deleteCookies(names: string[]) {
  const store = await cookies()
  for (const name of names) {
    try {
      store.delete(name)
    } catch {
      // ignore
    }
  }
}

function collectSetCookieHeaders(headers: Headers): string[] {
  const values: string[] = []
  const seen = new Set<string>()

  const pushValue = (value: string | null | undefined) => {
    if (!value) return

    for (const entry of splitCookiesString(value)) {
      const normalized = entry.trim()
      if (!normalized || seen.has(normalized)) continue

      seen.add(normalized)
      values.push(normalized)
    }
  }

  const getSetCookie = (headers as unknown as { getSetCookie?: () => string[] | undefined }).getSetCookie
  if (typeof getSetCookie === "function") {
    for (const header of getSetCookie() ?? []) {
      pushValue(header)
    }
  }

  pushValue(headers.get("set-cookie"))

  headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      pushValue(value)
    }
  })

  return values
}

function splitCookiesString(input: string): string[] {
  const result: string[] = []
  let start = 0
  let position = 0
  let inExpires = false

  while (position < input.length) {
    const char = input[position]

    if ((char === "e" || char === "E") && input.slice(position, position + 8).toLowerCase() === "expires=") {
      inExpires = true
      position += 8
      continue
    }

    if (char === ";") {
      inExpires = false
    }

    if (char === "," && !inExpires) {
      const value = input.slice(start, position).trim()
      if (value) {
        result.push(value)
      }
      start = position + 1
    }

    position += 1
  }

  const last = input.slice(start).trim()
  if (last) {
    result.push(last)
  }

  return result
}

function parseSetCookie(cookie: string): ParsedCookie | null {
  const segments = cookie.split(/;\s*/)
  if (segments.length === 0) {
    return null
  }

  const [nameValue, ...attributeSegments] = segments
  const [rawName, ...rawValueParts] = nameValue.split("=")
  if (!rawName) {
    return null
  }

  const name = rawName.trim()
  const value = rawValueParts.join("=")

  const parsed: ParsedCookie = {
    name,
    value
  }

  for (const attribute of attributeSegments) {
    if (!attribute) continue
    const [attrNameRaw, ...attrValueParts] = attribute.split("=")
    const attrName = attrNameRaw.trim().toLowerCase()
    const attrValue = attrValueParts.join("=").trim()

    switch (attrName) {
      case "expires": {
        const date = new Date(attrValue)
        if (!Number.isNaN(date.getTime())) {
          parsed.expires = date
        }
        break
      }
      case "max-age": {
        const maxAge = Number(attrValue)
        if (!Number.isNaN(maxAge)) {
          parsed.maxAge = maxAge
        }
        break
      }
      case "domain": {
        parsed.domain = attrValue
        break
      }
      case "path": {
        parsed.path = attrValue
        break
      }
      case "samesite": {
        const valueLower = attrValue.toLowerCase() as SameSite
        if (valueLower === "lax" || valueLower === "none" || valueLower === "strict") {
          parsed.sameSite = valueLower
        }
        break
      }
      case "secure": {
        parsed.secure = true
        break
      }
      case "httponly": {
        parsed.httpOnly = true
        break
      }
      default:
        break
    }
  }

  return parsed
}

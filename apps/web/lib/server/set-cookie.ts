import { cookies } from "next/headers"

import { isProduction } from "../env"

type SameSite = "lax" | "strict" | "none"

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

export async function applyResponseCookies(response: Response) {
  const setCookieHeader = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : []
  if (!setCookieHeader || setCookieHeader.length === 0) {
    return
  }

  const store = await cookies()

  for (const entry of setCookieHeader) {
    const parsed = parseSetCookie(entry)
    if (!parsed) continue

    store.set({
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

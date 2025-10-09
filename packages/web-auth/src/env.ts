const DEFAULT_API_BASE_URL = "http://localhost:8000"

function normalizeUrl(raw: string | undefined, fallback: string): string {
  const value = raw && raw.trim().length > 0 ? raw.trim() : fallback
  try {
    const url = new URL(value)
    url.pathname = url.pathname.replace(/\/$/, "")
    return url.toString().replace(/\/$/, "")
  } catch {
    throw new Error(`Invalid API base URL provided: ${value}`)
  }
}

const serverBaseUrl = normalizeUrl(process.env.WEB_API_BASE_URL, DEFAULT_API_BASE_URL)
const clientBaseUrl = normalizeUrl(
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_API_BASE_URL : undefined,
  serverBaseUrl
)

export const env = {
  server: {
    apiBaseUrl: serverBaseUrl
  },
  client: {
    apiBaseUrl: clientBaseUrl
  },
  nodeEnv: typeof process !== "undefined" ? process.env.NODE_ENV ?? "development" : "development"
} as const

export const CSRF_COOKIE_NAME = "vc.csrf-token"
export const ACCESS_TOKEN_COOKIE_NAME = "vc.access-token"
export const REFRESH_TOKEN_COOKIE_NAME = "vc.refresh-token"
export const SESSION_COOKIE_NAME = "session"

export const isProduction = env.nodeEnv === "production"

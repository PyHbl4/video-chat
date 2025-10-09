const AUTH_DEBUG_FLAG =
  process.env.WEB_AUTH_DEBUG === "1" ||
  process.env.WEB_AUTH_DEBUG === "true" ||
  process.env.WEB_AUTH_DEBUG === "on"

export function isAuthDebugEnabled(): boolean {
  return AUTH_DEBUG_FLAG
}

export function authDebug(message: string, details?: Record<string, unknown>) {
  if (!AUTH_DEBUG_FLAG) return

  if (details) {
    console.info("[auth][debug]", message, details)
  } else {
    console.info("[auth][debug]", message)
  }
}

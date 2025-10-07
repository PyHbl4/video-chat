import type { AuthLoginResponse, AuthUser } from "@video-chat/contracts"

export type SessionStatus = "authenticated" | "unauthenticated"

export interface SessionTokens {
  accessToken: string | null
  refreshToken: string | null
  accessTokenExpiresAt: number | null
  refreshTokenExpiresAt: number | null
}

export interface SessionSnapshot {
  status: SessionStatus
  user: AuthUser | null
  csrfToken: string | null
  tokens: SessionTokens
  fetchedAt: string
  error?: {
    message: string
    code?: string
  }
}

export interface SessionContextValue {
  state: SessionSnapshot
  setState: (next: SessionSnapshot) => void
  update: (updater: (prev: SessionSnapshot) => SessionSnapshot) => void
  refresh: () => Promise<SessionSnapshot>
}

export type LoginSessionPayload = {
  user: AuthUser | null
  csrfToken: string | null
  tokens: SessionTokens
}

export function deriveTokensFromLogin(response: AuthLoginResponse | null | undefined): SessionTokens {
  if (!response) {
    return {
      accessToken: null,
      refreshToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null
    }
  }

  const now = Date.now()
  const accessTokenExpiresAt = typeof response.expires_in === "number" ? now + response.expires_in * 1000 : null
  const refreshTokenExpiresAt = typeof response.refresh_expires_in === "number" ? now + response.refresh_expires_in * 1000 : null

  return {
    accessToken: response.access_token ?? null,
    refreshToken: response.refresh_token ?? null,
    accessTokenExpiresAt,
    refreshTokenExpiresAt
  }
}

export function createEmptySession(csrfToken: string | null): SessionSnapshot {
  return {
    status: "unauthenticated",
    user: null,
    csrfToken,
    tokens: {
      accessToken: null,
      refreshToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null
    },
    fetchedAt: new Date().toISOString()
  }
}

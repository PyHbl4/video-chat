import type { ApiResponse } from "./http-client"
import { ApiClient } from "./http-client"
import type { components } from "./types"

export type AuthUser = components["schemas"]["AuthUser"]
export type AuthLogin = components["schemas"]["AuthLogin"]
export type AuthRegister = components["schemas"]["AuthRegister"]
export type AuthLoginResponse = components["schemas"]["AuthLoginResponse"]
export type AuthRefresh = components["schemas"]["AuthRefresh"]
export type AuthRefreshResponse = components["schemas"]["AuthRefreshResponse"]
export type AuthLogout = components["schemas"]["AuthLogout"]
export type ErrorResponse = components["schemas"]["Error"]

export class AuthApi {
  constructor(private readonly client: ApiClient) {}

  register(body: AuthRegister): Promise<ApiResponse<AuthUser>> {
    return this.client.request<AuthUser, AuthRegister>({
      method: "POST",
      path: "/auth/register",
      body
    })
  }

  login(body: AuthLogin): Promise<ApiResponse<AuthLoginResponse>> {
    return this.client.request<AuthLoginResponse, AuthLogin>({
      method: "POST",
      path: "/auth/login",
      body
    })
  }

  refresh(body: AuthRefresh): Promise<ApiResponse<AuthRefreshResponse>> {
    return this.client.request<AuthRefreshResponse, AuthRefresh>({
      method: "POST",
      path: "/auth/refresh",
      body
    })
  }

  logout(body?: AuthLogout): Promise<ApiResponse<void>> {
    return this.client.request<void, AuthLogout | undefined>({
      method: "POST",
      path: "/auth/logout",
      body,
      expectJson: false
    })
  }

  me(): Promise<ApiResponse<AuthUser>> {
    return this.client.request<AuthUser>({
      method: "GET",
      path: "/auth/me"
    })
  }
}

export function createAuthApi(client: ApiClient): AuthApi {
  return new AuthApi(client)
}

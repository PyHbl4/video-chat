import type { ApiResponse } from "./http-client"
import { ApiClient } from "./http-client"
import type { components, operations } from "./types"

export type User = components["schemas"]["User"]
export type SearchUsersResponse = operations["searchUsers"]["responses"]["200"]["content"]["application/json"]
export type UserPreferences = components["schemas"]["UserPreferences"]
export type UserPreferencesUpdate = components["schemas"]["UserPreferencesUpdate"]

export class UsersApi {
  constructor(private readonly client: ApiClient) {}

  search(query: { q: string; limit?: number }): Promise<ApiResponse<SearchUsersResponse>> {
    return this.client.request<SearchUsersResponse>({
      method: "GET",
      path: "/users/search",
      query
    })
  }

  getPreferences(): Promise<ApiResponse<UserPreferences>> {
    return this.client.request<UserPreferences>({
      method: "GET",
      path: "/users/preferences"
    })
  }

  updatePreferences(body: UserPreferencesUpdate): Promise<ApiResponse<UserPreferences>> {
    return this.client.request<UserPreferences, UserPreferencesUpdate>({
      method: "PUT",
      path: "/users/preferences",
      body
    })
  }
}

export function createUsersApi(client: ApiClient): UsersApi {
  return new UsersApi(client)
}

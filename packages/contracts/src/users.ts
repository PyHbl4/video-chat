import type { ApiResponse } from "./http-client"
import { ApiClient } from "./http-client"
import type { components, operations } from "./types"

export type User = components["schemas"]["User"]
export type SearchUsersResponse = operations["searchUsers"]["responses"]["200"]["content"]["application/json"]

export class UsersApi {
  constructor(private readonly client: ApiClient) {}

  search(query: { q: string; limit?: number }): Promise<ApiResponse<SearchUsersResponse>> {
    return this.client.request<SearchUsersResponse>({
      method: "GET",
      path: "/users/search",
      query
    })
  }
}

export function createUsersApi(client: ApiClient): UsersApi {
  return new UsersApi(client)
}

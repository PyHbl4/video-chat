import type { ApiResponse } from "./http-client"
import { ApiClient } from "./http-client"
import type { components, operations } from "./types"

export type Friend = components["schemas"]["Friend"]
export type FriendStatus = Friend["status"]
export type FriendRequestPayload = components["schemas"]["FriendRequestPayload"]
export type FriendDecisionPayload = components["schemas"]["FriendDecisionPayload"]
export type ListFriendsResponse = operations["listFriends"]["responses"]["200"]["content"]["application/json"]

export class FriendsApi {
  constructor(private readonly client: ApiClient) {}

  list(params?: { status?: FriendStatus }): Promise<ApiResponse<ListFriendsResponse>> {
    return this.client.request<ListFriendsResponse>({
      method: "GET",
      path: "/friends",
      query: params?.status ? { status: params.status } : undefined
    })
  }

  request(payload: FriendRequestPayload): Promise<ApiResponse<Friend>> {
    return this.client.request<Friend, FriendRequestPayload>({
      method: "POST",
      path: "/friends/request",
      body: payload
    })
  }

  accept(payload: FriendDecisionPayload): Promise<ApiResponse<Friend>> {
    return this.client.request<Friend, FriendDecisionPayload>({
      method: "POST",
      path: "/friends/accept",
      body: payload
    })
  }

  decline(payload: FriendDecisionPayload): Promise<ApiResponse<Friend>> {
    return this.client.request<Friend, FriendDecisionPayload>({
      method: "POST",
      path: "/friends/decline",
      body: payload
    })
  }
}

export function createFriendsApi(client: ApiClient): FriendsApi {
  return new FriendsApi(client)
}

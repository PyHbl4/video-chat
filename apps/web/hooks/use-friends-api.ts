"use client"

import { useMemo } from "react"

import { createFriendsApi, createUsersApi, type FriendsApi, type UsersApi } from "@video-chat/contracts"

import { useApiClient } from "./use-api-client"

export function useFriendsApi(): { friends: FriendsApi; users: UsersApi } {
  const client = useApiClient()

  return useMemo(() => {
    return {
      friends: createFriendsApi(client),
      users: createUsersApi(client)
    }
  }, [client])
}

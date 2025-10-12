"use client"

import { useMemo } from "react"

import { createUsersApi, type UsersApi } from "@video-chat/contracts"

import { useApiClient } from "./use-api-client"

export function useUsersApi(): UsersApi {
  const client = useApiClient()

  return useMemo(() => {
    return createUsersApi(client)
  }, [client])
}

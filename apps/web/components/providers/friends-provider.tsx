"use client"

import { useEffect, useRef } from "react"
import type { ReactNode } from "react"

import { useAppUser } from "@/components/app/app-user-context"
import { useFriendsApi } from "@/hooks/use-friends-api"
import { useFriendsRealtime } from "@/hooks/use-friends-realtime"
import { useFriendsToasts } from "@/hooks/use-friends-toasts"
import { useFriendsStore } from "@/stores/friends-store"

export interface FriendsProviderProps {
  children: ReactNode
}

export function FriendsProvider({ children }: FriendsProviderProps) {
  const user = useAppUser()
  const initialize = useFriendsStore((state) => state.initialize)
  const loadRelationships = useFriendsStore((state) => state.loadRelationships)
  const hasLoaded = useFriendsStore((state) => state.hasLoaded)
  const { friends } = useFriendsApi()
  const initializedUserRef = useRef<string | null>(null)

  useEffect(() => {
    if (!user?.username) {
      initializedUserRef.current = null
      return
    }

    if (initializedUserRef.current === user.username) {
      return
    }

    initializedUserRef.current = user.username
    initialize(user.username)
  }, [initialize, user?.username])

  useEffect(() => {
    if (!user?.username || hasLoaded) {
      return
    }

    void loadRelationships(friends)
  }, [friends, hasLoaded, loadRelationships, user?.username])

  useFriendsRealtime({ enabled: Boolean(user?.id) })
  useFriendsToasts()

  return <>{children}</>
}

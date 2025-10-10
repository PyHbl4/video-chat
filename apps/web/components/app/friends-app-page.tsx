"use client"

import { useEffect } from "react"

import type { SessionSnapshot } from "@video-chat/web-auth"

import { FriendsList } from "@/components/friends/friends-list"
import { FriendsSidebar } from "@/components/friends/friends-sidebar"
import { AppShell } from "@/components/layout/app-shell"
import { useFriendsApi } from "@/hooks/use-friends-api"
import { useFriendsRealtime } from "@/hooks/use-friends-realtime"
import { useFriendsToasts } from "@/hooks/use-friends-toasts"
import { useFriendsStore } from "@/stores/friends-store"

export interface FriendsAppPageProps {
  user: SessionSnapshot["user"]
}

export function FriendsAppPage({ user }: FriendsAppPageProps) {
  const initialize = useFriendsStore((state) => state.initialize)
  const loadRelationships = useFriendsStore((state) => state.loadRelationships)
  const hasLoaded = useFriendsStore((state) => state.hasLoaded)
  const { friends, users } = useFriendsApi()

  useFriendsRealtime({ enabled: Boolean(user) })
  useFriendsToasts()

  useEffect(() => {
    if (user?.username) {
      initialize(user.username)
    }
  }, [initialize, user?.username])

  useEffect(() => {
    if (!user?.username || hasLoaded) {
      return
    }

    void loadRelationships(friends)
  }, [friends, hasLoaded, loadRelationships, user?.username])

  return (
    <AppShell
      user={user}
      sidebar={<FriendsSidebar friendsApi={friends} usersApi={users} />}
    >
      <FriendsList />
    </AppShell>
  )
}

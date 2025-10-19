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

const isLoggingEnabled = process.env.NODE_ENV !== "production"

function logFriendsProvider(...args: unknown[]) {
  if (!isLoggingEnabled) {
    return
  }

  console.debug("[FriendsProvider]", ...args)
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
      if (initializedUserRef.current) {
        logFriendsProvider("сбрасываем инициализацию: пользователь отсутствует", {
          previousUser: initializedUserRef.current
        })
      }

      initializedUserRef.current = null
      return
    }

    if (initializedUserRef.current === user.username) {
      logFriendsProvider("пропускаем инициализацию: пользователь уже инициализирован", {
        username: user.username
      })
      return
    }

    logFriendsProvider("инициализируем стор друзей", {
      username: user.username
    })
    initializedUserRef.current = user.username
    initialize(user.username)
  }, [initialize, user?.username])

  useEffect(() => {
    if (!user?.username || hasLoaded) {
      logFriendsProvider("пропускаем загрузку отношений", {
        reason: !user?.username ? "нет пользователя" : "уже загружено",
        username: user?.username,
        hasLoaded
      })
      return
    }

    logFriendsProvider("загружаем отношения", {
      username: user.username
    })
    void loadRelationships(friends)
  }, [friends, hasLoaded, loadRelationships, user?.username])

  const realtimeEnabled = Boolean(user?.id)

  useEffect(() => {
    logFriendsProvider("обновляем флаг realtime", {
      enabled: realtimeEnabled,
      userId: user?.id
    })
  }, [realtimeEnabled, user?.id])

  useFriendsRealtime({ enabled: realtimeEnabled })
  useFriendsToasts()

  return <>{children}</>
}

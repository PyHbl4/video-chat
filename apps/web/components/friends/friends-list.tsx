"use client"

import { useMemo } from "react"

import { Button, ButtonGroup, Skeleton } from "@video-chat/ui"

import {
  selectFilteredAccepted,
  selectOfflineCount,
  selectOnlineCount,
  useFriendsStore
} from "@/stores/friends-store"

import { FriendListItem } from "./friend-list-item"

const FILTER_LABELS = {
  all: "Все",
  online: "Онлайн",
  offline: "Оффлайн"
}

export function FriendsList() {
  const filter = useFriendsStore((state) => state.filter)
  const setFilter = useFriendsStore((state) => state.setFilter)
  const isLoading = useFriendsStore((state) => state.isLoading)
  const hasLoaded = useFriendsStore((state) => state.hasLoaded)
  const friends = useFriendsStore(selectFilteredAccepted)
  const onlineCount = useFriendsStore(selectOnlineCount)
  const offlineCount = useFriendsStore(selectOfflineCount)

  const totals = useMemo(
    () => ({
      all: friends.length,
      online: onlineCount,
      offline: offlineCount
    }),
    [friends.length, offlineCount, onlineCount]
  )

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Список друзей</h2>
          <p className="text-sm text-muted-foreground">
            Управляйте контактами и приглашайте друзей в звонки
          </p>
        </div>
        <ButtonGroup size="sm" variant="outline" className="shrink-0">
          {(Object.keys(FILTER_LABELS) as Array<keyof typeof FILTER_LABELS>).map((key) => (
            <Button
              key={key}
              variant={filter === key ? "default" : "outline"}
              onClick={() => setFilter(key)}
            >
              {FILTER_LABELS[key]}
              <span className="ml-2 text-xs text-muted-foreground">
                {totals[key] ?? 0}
              </span>
            </Button>
          ))}
        </ButtonGroup>
      </div>

      {isLoading && !hasLoaded ? (
        <div className="space-y-3" aria-busy>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : friends.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-base font-medium">Пока здесь пусто</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Найдите друзей через поиск слева или отправьте приглашение по имени пользователя
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {friends.map((friend) => (
            <FriendListItem key={friend.id} friend={friend} />
          ))}
        </div>
      )}
    </div>
  )
}

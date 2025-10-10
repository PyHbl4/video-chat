"use client"

import { useEffect, useMemo, useState } from "react"

import {
  Badge,
  Button,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarSeparator,
  Skeleton
} from "@video-chat/ui"
import { SearchIcon, UserPlusIcon } from "lucide-react"

import {
  selectIncomingRequests,
  selectOutgoingRequests,
  selectHasPending,
  useFriendsStore
} from "@/stores/friends-store"

import type { FriendsApi, UsersApi } from "@video-chat/contracts"

interface FriendsSidebarProps {
  friendsApi: FriendsApi
  usersApi: UsersApi
}

export function FriendsSidebar({ friendsApi, usersApi }: FriendsSidebarProps) {
  const [localQuery, setLocalQuery] = useState("")
  const search = useFriendsStore((state) => state.search)
  const searchResults = useFriendsStore((state) => state.searchResults)
  const isSearching = useFriendsStore((state) => state.isSearching)
  const outgoing = useFriendsStore(selectOutgoingRequests)
  const incoming = useFriendsStore(selectIncomingRequests)
  const hasPending = useFriendsStore(selectHasPending)
  const sendRequest = useFriendsStore((state) => state.sendRequest)
  const acceptRequest = useFriendsStore((state) => state.acceptRequest)
  const declineRequest = useFriendsStore((state) => state.declineRequest)

  useEffect(() => {
    const handle = setTimeout(() => {
      void search(usersApi, localQuery)
    }, 350)

    return () => clearTimeout(handle)
  }, [localQuery, search, usersApi])

  const isEmpty = useMemo(() => incoming.length === 0 && outgoing.length === 0, [incoming.length, outgoing.length])

  return (
    <SidebarContent className="gap-4">
      <SidebarHeader>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Поиск друзей</h2>
          <p className="text-xs text-muted-foreground">Введите имя пользователя или отображаемое имя</p>
        </div>
        <div className="relative">
          <SearchIcon className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" aria-hidden />
          <SidebarInput
            value={localQuery}
            onChange={(event) => setLocalQuery(event.target.value)}
            placeholder="Найти пользователя..."
            className="pl-9"
            aria-label="Поиск друзей"
          />
        </div>
      </SidebarHeader>

      {localQuery.trim().length >= 2 && (
        <SidebarGroup>
          <SidebarGroupLabel>Результаты поиска</SidebarGroupLabel>
          <SidebarGroupContent>
            {isSearching ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-10" />
                ))}
              </div>
            ) : searchResults.length === 0 ? (
              <p className="text-xs text-muted-foreground">Ничего не найдено. Попробуйте другой запрос.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {searchResults.map((user) => (
                  <Button
                    key={user.id}
                    variant="ghost"
                    className="justify-start gap-3"
                    onClick={() =>
                      void sendRequest(friendsApi, {
                        targetUserId: user.id
                      })
                    }
                  >
                    <UserPlusIcon className="size-4" aria-hidden />
                    <span className="flex-1 truncate text-left">
                      {user.displayName ?? user.username}
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      )}

      <SidebarSeparator />

      <SidebarGroup>
        <SidebarGroupLabel>
          Заявки в друзья
          {hasPending && <Badge variant="secondary" className="ml-2">{incoming.length + outgoing.length}</Badge>}
        </SidebarGroupLabel>
        <SidebarGroupContent className="space-y-3">
          {isEmpty ? (
            <p className="text-xs text-muted-foreground">
              Новых заявок нет. Отправьте приглашение через поиск или дождитесь, пока друзья добавят вас.
            </p>
          ) : (
            <div className="space-y-3">
              {incoming.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Входящие</p>
                  <div className="space-y-2">
                    {incoming.map((friend) => (
                      <div key={friend.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                        <div className="flex flex-1 flex-col">
                          <span className="text-sm font-medium">
                            {friend.user.displayName ?? friend.user.username}
                          </span>
                          <span className="text-xs text-muted-foreground">{friend.user.username}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              void acceptRequest(friendsApi, {
                                requestId: friend.relationship.id
                              })
                            }
                          >
                            Принять
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void declineRequest(friendsApi, {
                                requestId: friend.relationship.id
                              })
                            }
                          >
                            Отклонить
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {outgoing.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Исходящие</p>
                  <div className="space-y-2">
                    {outgoing.map((friend) => (
                      <div key={friend.id} className="flex items-center justify-between gap-3 rounded-md border border-dashed p-3">
                        <div className="flex flex-1 flex-col">
                          <span className="text-sm font-medium">
                            {friend.user.displayName ?? friend.user.username}
                          </span>
                          <span className="text-xs text-muted-foreground">Ожидает подтверждения</span>
                        </div>
                        <Badge variant="outline">Отправлено</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  )
}

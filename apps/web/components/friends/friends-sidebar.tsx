
"use client"

import { useEffect, useMemo, useState } from "react"

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Separator,
  Skeleton
} from "@video-chat/ui"
import { SearchIcon, UserPlusIcon, UsersIcon } from "lucide-react"

import {
  selectHasPending,
  selectIncomingRequests,
  selectOutgoingRequests,
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
    }, 300)

    return () => clearTimeout(handle)
  }, [localQuery, search, usersApi])

  const isEmpty = useMemo(
    () => incoming.length === 0 && outgoing.length === 0,
    [incoming.length, outgoing.length]
  )

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Найдите друзей</CardTitle>
          <CardDescription>
            Введите ник или отображаемое имя, чтобы отправить приглашение в друзья.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={localQuery}
              onChange={(event) => setLocalQuery(event.target.value)}
              placeholder="Найти пользователя..."
              className="pl-9"
              aria-label="Поиск друзей"
            />
          </div>

          {localQuery.trim().length >= 2 ? (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Результаты поиска
              </p>
              {isSearching ? (
                <div className="space-y-2" aria-busy>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-10 w-full rounded-lg" />
                  ))}
                </div>
              ) : searchResults.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
                  Мы не нашли пользователей по этому запросу. Попробуйте другое имя или уточните запрос.
                </div>
              ) : (
                <div className="grid gap-2">
                  {searchResults.map((user) => (
                    <Button
                      key={user.id}
                      variant="outline"
                      className="justify-between gap-3 text-left"
                      onClick={() =>
                        void sendRequest(friendsApi, {
                          targetUserId: user.id
                        })
                      }
                    >
                      <span className="truncate text-sm">{user.displayName ?? user.username}</span>
                      <UserPlusIcon className="size-4" aria-hidden />
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
              Введите минимум две буквы, чтобы начать поиск по каталогу пользователей.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Заявки в друзья</CardTitle>
            <CardDescription>
              Управляйте входящими и исходящими запросами, чтобы не потерять контакты.
            </CardDescription>
          </div>
          <Badge variant={hasPending ? "default" : "outline"} className="shrink-0">
            {incoming.length + outgoing.length}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {isEmpty ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center text-muted-foreground">
              <UsersIcon className="size-6" aria-hidden />
              <p className="text-sm">
                Новых заявок пока нет. Отправьте приглашение через поиск или поделитесь ссылкой на профиль.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {incoming.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Входящие</p>
                  <div className="space-y-2">
                    {incoming.map((friend) => (
                      <div key={friend.id} className="rounded-lg border bg-card px-4 py-3 shadow-sm">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-medium">{friend.user.displayName ?? friend.user.username}</p>
                            <p className="text-xs text-muted-foreground">{friend.user.username}</p>
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row">
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
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {outgoing.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Исходящие</p>
                  <div className="space-y-2">
                    {outgoing.map((friend) => (
                      <div key={friend.id} className="flex flex-col gap-2 rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium">{friend.user.displayName ?? friend.user.username}</p>
                          <p className="text-xs text-muted-foreground">Ожидает подтверждения</p>
                        </div>
                        <Badge variant="outline">Отправлено</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
          <Separator />
          <p className="text-xs text-muted-foreground">
            Подсказка: скоро появятся смарт-фильтры и напоминания, если заявка висит без ответа.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

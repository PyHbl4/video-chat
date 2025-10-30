"use client"

import * as React from "react"

import type { FriendSummary } from "@/lib/types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export function FriendsView({ friends }: { friends: FriendSummary[] }) {
  const [query, setQuery] = React.useState("")

  const filtered = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return friends
    }

    return friends.filter((friend) => {
      const combined = `${friend.name} ${friend.title}`.toLowerCase()
      return combined.includes(normalizedQuery)
    })
  }, [friends, query])

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Друзья</h2>
        <p className="text-muted-foreground">
          Управляйте контактами, создавайте чаты и планируйте звонки.
        </p>
      </header>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex w-full flex-1 items-center gap-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по имени или роли"
            className="w-full md:max-w-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button>Новый чат</Button>
          <Button variant="outline">Запланировать звонок</Button>
        </div>
      </div>
      <FriendsTabs friends={filtered} original={friends} />
    </section>
  )
}

function FriendsTabs({ friends, original }: { friends: FriendSummary[]; original: FriendSummary[] }) {
  const hasFriends = original.length > 0

  if (!hasFriends) {
    return (
      <EmptyState>
        <p className="text-sm text-muted-foreground">
          У вас пока нет друзей. Добавьте коллег, чтобы начать общение.
        </p>
      </EmptyState>
    )
  }

  return (
    <Tabs defaultValue="all" className="space-y-4">
      <TabsList>
        <TabsTrigger value="all">Все</TabsTrigger>
        <TabsTrigger value="online">Онлайн</TabsTrigger>
        <TabsTrigger value="offline">Оффлайн</TabsTrigger>
      </TabsList>
      <TabsContent value="all" className="space-y-4">
        <FriendGrid friends={friends} emptyLabel="Ничего не найдено" />
      </TabsContent>
      <TabsContent value="online" className="space-y-4">
        <FriendGrid
          friends={friends.filter((friend) => friend.status === "online")}
          emptyLabel="Никто не в сети"
        />
      </TabsContent>
      <TabsContent value="offline" className="space-y-4">
        <FriendGrid
          friends={friends.filter((friend) => friend.status === "offline")}
          emptyLabel="Нет оффлайн-друзей"
        />
      </TabsContent>
    </Tabs>
  )
}

function FriendGrid({ friends, emptyLabel }: { friends: FriendSummary[]; emptyLabel: string }) {
  if (friends.length === 0) {
    return (
      <EmptyState>
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      </EmptyState>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {friends.map((friend) => (
        <Card key={friend.id} className="border-border/60">
          <CardContent className="flex items-start gap-4 py-6">
            <Avatar className="h-12 w-12">
              <AvatarFallback>{friend.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <div>
                <p className="text-base font-semibold text-foreground">{friend.name}</p>
                <p className="text-sm text-muted-foreground">{friend.title}</p>
              </div>
              <Badge variant={friend.status === "online" ? "default" : "outline"} className="w-fit">
                {friend.status === "online" ? "В сети" : "Не в сети"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/40 p-6 text-center">
      {children}
    </div>
  )
}

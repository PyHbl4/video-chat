"use client"

import * as React from "react"

import type { FriendSummary } from "@/lib/types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"

import { cn } from "@/lib/utils"

import { CalendarClock, Phone, Search, Trash2, UserRound } from "lucide-react"

type ListState = "idle" | "loading" | "error"

const TAB_CONFIG = [
  {
    value: "all" as const,
    label: "Все",
    emptyLabel: "Ничего не найдено",
    filter: (friends: FriendSummary[]) => friends
  },
  {
    value: "online" as const,
    label: "Онлайн",
    emptyLabel: "Никто не в сети",
    filter: (friends: FriendSummary[]) => friends.filter((friend) => friend.status === "online")
  },
  {
    value: "offline" as const,
    label: "Оффлайн",
    emptyLabel: "Нет оффлайн-друзей",
    filter: (friends: FriendSummary[]) => friends.filter((friend) => friend.status === "offline")
  }
]

export function FriendsView({ friends }: { friends: FriendSummary[] }) {
  const [query, setQuery] = React.useState("")
  const [activeTab, setActiveTab] = React.useState<(typeof TAB_CONFIG)[number]["value"]>("all")
  const [listState, setListState] = React.useState<ListState>("idle")
  const loadingTimeoutRef = React.useRef<number | null>(null)
  const shouldSimulateError = React.useMemo(
    () => query.trim().toLowerCase() === "ошибка",
    [query]
  )

  const normalizedFriends = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return friends
    }

    return friends.filter((friend) => {
      const combined = `${friend.name} ${friend.title}`.toLowerCase()
      return combined.includes(normalizedQuery)
    })
  }, [friends, query])

  const isFirstRender = React.useRef(true)

  const simulateLoading = React.useCallback((shouldFail: boolean) => {
    if (loadingTimeoutRef.current) {
      window.clearTimeout(loadingTimeoutRef.current)
    }

    setListState("loading")
    loadingTimeoutRef.current = window.setTimeout(() => {
      setListState(shouldFail ? "error" : "idle")
    }, shouldFail ? 420 : 320)
  }, [])

  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    simulateLoading(shouldSimulateError)

    return () => {
      if (loadingTimeoutRef.current) {
        window.clearTimeout(loadingTimeoutRef.current)
      }
    }
  }, [activeTab, query, shouldSimulateError, simulateLoading])

  React.useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        window.clearTimeout(loadingTimeoutRef.current)
      }
    }
  }, [])

  const handleRetry = React.useCallback(() => {
    simulateLoading(shouldSimulateError)
  }, [simulateLoading, shouldSimulateError])

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-10">
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex max-w-2xl flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Друзья</h1>
            <p className="text-base text-muted-foreground">
              Управляйте контактами команды, инициируйте чаты и быстро планируйте звонки прямо из единого списка.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <Button size="lg" className="h-11 min-w-[180px] justify-center gap-2 w-full sm:w-auto">
              <Phone className="h-4 w-4" aria-hidden="true" />
              Новый чат
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 min-w-[220px] justify-center gap-2 w-full sm:w-auto"
            >
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              Запланировать звонок
            </Button>
          </div>
        </header>

        <div className="flex flex-col gap-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск по имени, роли или статусу"
              aria-label="Поиск по друзьям"
              className="h-12 w-full rounded-xl border-border/60 bg-background pl-11 pr-4 text-base shadow-sm transition-colors focus-visible:border-primary focus-visible:ring-0"
            />
          </div>

          <Separator className="hidden sm:block" />

          <FriendsTabs
            friends={normalizedFriends}
            original={friends}
            activeTab={activeTab}
            listState={listState}
            onTabChange={setActiveTab}
            onRetry={handleRetry}
          />
        </div>
      </div>
    </section>
  )
}

function FriendsTabs({
  friends,
  original,
  activeTab,
  listState,
  onTabChange,
  onRetry
}: {
  friends: FriendSummary[]
  original: FriendSummary[]
  activeTab: (typeof TAB_CONFIG)[number]["value"]
  listState: ListState
  onTabChange: (tab: (typeof TAB_CONFIG)[number]["value"]) => void
  onRetry: () => void
}) {
  const hasFriends = original.length > 0

  if (!hasFriends && listState !== "loading") {
    return (
      <EmptyState>
        <p className="max-w-sm text-sm text-muted-foreground">
          У вас пока нет друзей. Добавьте коллег, чтобы начать общение и планировать звонки.
        </p>
      </EmptyState>
    )
  }

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="flex flex-col gap-6">
      <TabsList className="grid w-full grid-cols-3 gap-1 rounded-xl bg-muted/40 p-1 shadow-inner">
        {TAB_CONFIG.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="rounded-lg px-3 py-2 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow data-[state=inactive]:text-muted-foreground"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {TAB_CONFIG.map((tab) => {
        const tabFriends = tab.filter(friends)

        return (
          <TabsContent key={tab.value} value={tab.value} className="outline-none">
            <FriendList
              friends={tabFriends}
              emptyLabel={tab.emptyLabel}
              state={listState}
              onRetry={onRetry}
            />
          </TabsContent>
        )
      })}
    </Tabs>
  )
}

function FriendList({
  friends,
  emptyLabel,
  state,
  onRetry
}: {
  friends: FriendSummary[]
  emptyLabel: string
  state: ListState
  onRetry: () => void
}) {
  if (state === "loading") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <FriendCardSkeleton key={index} />
        ))}
      </div>
    )
  }

  if (state === "error") {
    return (
      <EmptyState>
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm font-medium text-foreground">Не удалось загрузить список друзей</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Проверьте подключение к сети и попробуйте обновить данные.
          </p>
          <Button size="sm" onClick={onRetry} variant="outline">
            Повторить
          </Button>
        </div>
      </EmptyState>
    )
  }

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
        <FriendCard key={friend.id} friend={friend} />
      ))}
    </div>
  )
}

function FriendCard({ friend }: { friend: FriendSummary }) {
  const statusLabel = friend.status === "online" ? "В сети" : "Не в сети"

  return (
    <Card className="h-full border-border/60 transition-shadow hover:shadow-md focus-within:shadow-md">
      <CardContent className="flex h-full flex-col gap-6 p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex w-full items-start gap-4">
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarFallback>{friend.name.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col gap-3">
            <div className="space-y-1">
              <p className="text-base font-semibold leading-tight text-foreground">{friend.name}</p>
              <p className="text-sm text-muted-foreground">{friend.title}</p>
            </div>
            <Badge
              variant="secondary"
              className={cn(
                "w-fit border-0 px-3 py-1 text-xs font-medium",
                friend.status === "online"
                  ? "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {statusLabel}
            </Badge>
          </div>
        </div>

        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
          <Button size="sm" className="h-9 gap-2">
            <Phone className="h-4 w-4" aria-hidden="true" />
            Позвонить
          </Button>
          <Button size="sm" variant="outline" className="h-9 gap-2">
            <UserRound className="h-4 w-4" aria-hidden="true" />
            Профиль
          </Button>
          <Button size="sm" variant="destructive" className="h-9 gap-2">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Удалить
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function FriendCardSkeleton() {
  return (
    <Card className="h-full border-border/60">
      <CardContent className="flex h-full flex-col gap-6 p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex w-full items-start gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex flex-1 flex-col gap-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-muted-foreground/40 bg-muted/10 p-8 text-center">
      {children}
    </div>
  )
}

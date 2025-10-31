"use client"

import * as React from "react"

import type { FriendSummary } from "@/lib/types"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

import { Phone, Trash2, UserRound } from "lucide-react"

interface FriendListItemProps {
  friend: FriendSummary
}

export function FriendListItem({ friend }: FriendListItemProps) {
  const initials = React.useMemo(() => getInitials(friend.name), [friend.name])
  const statusLabel = friend.status === "online" ? "В сети" : "Не в сети"
  const statusVariant = friend.status === "online" ? "default" : "secondary"

  return (
    <Card className="h-full border-border/60 transition-shadow hover:shadow-md focus-within:shadow-md">
      <CardContent className="flex flex-col gap-4 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0 rounded-full" role="img" aria-label={friend.name} title={friend.name}>
              {/* TODO: Добавить AvatarImage, когда у FriendSummary появится avatarUrl */}
              <AvatarFallback className="flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium uppercase text-foreground/80">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <p className="text-base font-medium leading-tight text-foreground">{friend.name}</p>
              <p className="text-sm leading-tight text-muted-foreground">{friend.title}</p>
              <Badge
                variant={statusVariant}
                className="mt-0.5 w-fit whitespace-nowrap border-0 px-2 py-0.5 text-xs font-medium"
              >
                {statusLabel}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:flex-nowrap sm:justify-end">
          <Button size="sm" className="h-9 gap-2" aria-label="Позвонить другу">
            <Phone className="h-4 w-4" aria-hidden="true" />
            Позвонить
          </Button>
          <Button size="sm" variant="outline" className="h-9 gap-2" aria-label="Открыть профиль друга">
            <UserRound className="h-4 w-4" aria-hidden="true" />
            Профиль
          </Button>
          <Button size="sm" variant="destructive" className="h-9 gap-2" aria-label="Удалить друга">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Удалить
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function FriendListItemSkeleton() {
  return (
    <Card className="h-full border-border/60">
      <CardContent className="flex flex-col gap-4 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        </div>
        <div className="flex w-full flex-wrap justify-start gap-2 sm:w-auto sm:flex-nowrap sm:justify-end">
          <Skeleton className="h-9 w-full sm:w-24" />
          <Skeleton className="h-9 w-full sm:w-24" />
          <Skeleton className="h-9 w-full sm:w-24" />
        </div>
      </CardContent>
    </Card>
  )
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

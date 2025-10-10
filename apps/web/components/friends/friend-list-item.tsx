"use client"

import { UserRoundIcon, VideoIcon } from "lucide-react"
import { useCallback } from "react"

import { Badge, Button, Card, CardContent } from "@video-chat/ui"
import { toast } from "sonner"

import type { FriendViewModel } from "@/stores/friends-store"

import { PresenceDot } from "./presence-dot"

export interface FriendListItemProps {
  friend: FriendViewModel
  onInvite?: (friend: FriendViewModel) => void
}

export function FriendListItem({ friend, onInvite }: FriendListItemProps) {
  const statusText = friend.presence === "online" ? "В сети" : "Не в сети"

  const handleInvite = useCallback(() => {
    if (onInvite) {
      onInvite(friend)
      return
    }

    toast.info("Звонки скоро будут доступны", {
      description: `${friend.user.displayName ?? friend.user.username} получит уведомление, когда мы подключим комнаты`
    })
  }, [friend, onInvite])

  return (
    <Card className="shadow-sm transition hover:border-primary/50">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="relative flex size-12 items-center justify-center rounded-full bg-muted">
          {friend.user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={friend.user.avatarUrl}
              alt={friend.user.displayName ?? friend.user.username ?? "Пользователь"}
              className="size-full rounded-full object-cover"
            />
          ) : (
            <UserRoundIcon className="size-5 text-muted-foreground" aria-hidden />
          )}
          <PresenceDot status={friend.presence} className="absolute bottom-0 right-0" />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium leading-none">
              {friend.user.displayName ?? friend.user.username}
            </span>
            {friend.relationship.status === "pending" && (
              <Badge variant="outline">Ожидает подтверждения</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{statusText}</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="gap-2"
          disabled={friend.presence !== "online"}
          onClick={handleInvite}
        >
          <VideoIcon className="size-4" aria-hidden />
          Позвонить
        </Button>
      </CardContent>
    </Card>
  )
}

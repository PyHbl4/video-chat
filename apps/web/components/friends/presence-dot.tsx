"use client"

import { cn } from "@video-chat/ui"

export interface PresenceDotProps {
  status: "online" | "offline"
  className?: string
}

const STATUS_COLOR: Record<PresenceDotProps["status"], string> = {
  online: "bg-emerald-500",
  offline: "bg-muted"
}

const STATUS_LABEL: Record<PresenceDotProps["status"], string> = {
  online: "В сети",
  offline: "Не в сети"
}

export function PresenceDot({ status, className }: PresenceDotProps) {
  return (
    <span
      aria-hidden
      data-status={status}
      title={STATUS_LABEL[status]}
      className={cn(
        "size-2.5 rounded-full border border-background shadow-sm transition-colors",
        STATUS_COLOR[status],
        className
      )}
    />
  )
}

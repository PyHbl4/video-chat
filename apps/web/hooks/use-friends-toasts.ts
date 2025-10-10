"use client"

import { useEffect } from "react"

import { toast } from "sonner"

import { useFriendsStore } from "@/stores/friends-store"

export function useFriendsToasts() {
  const notifications = useFriendsStore((state) => state.notifications)
  const acknowledge = useFriendsStore((state) => state.acknowledgeNotification)

  useEffect(() => {
    for (const notification of notifications) {
      const { id, kind, title, description } = notification

      switch (kind) {
        case "success":
          toast.success(title, { description, id })
          break
        case "error":
          toast.error(title, { description, id })
          break
        case "warning":
          toast.warning(title, { description, id })
          break
        default:
          toast.info(title, { description, id })
      }

      acknowledge(id)
    }
  }, [acknowledge, notifications])
}

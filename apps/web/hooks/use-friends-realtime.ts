"use client"

import { useEffect, useRef } from "react"

import { env } from "@video-chat/web-auth"
import { useSession } from "@video-chat/web-auth/hooks/use-session"
import { io, type Socket } from "socket.io-client"

import {
  type FriendRealtimePayload,
  type PresenceUpdatePayload,
  useFriendsStore
} from "@/stores/friends-store"

type ServerToClientEvents = {
  "presence:update": (payload: PresenceUpdatePayload) => void
  "friends:accepted": (payload: FriendRealtimePayload) => void
  "friends:request": (payload: FriendRealtimePayload) => void
  "friends:declined": (payload: FriendRealtimePayload) => void
  "friends:removed": (payload: FriendRealtimePayload) => void
}

type ClientToServerEvents = {
  "friends:ack": (payload: { friendId: string }) => void
}

interface UseFriendsRealtimeOptions {
  enabled?: boolean
}

const isLoggingEnabled = process.env.NODE_ENV !== "production"

function logFriendsRealtime(...args: unknown[]) {
  if (!isLoggingEnabled) {
    return
  }

  console.debug("[FriendsRealtime]", ...args)
}

export function useFriendsRealtime(options: UseFriendsRealtimeOptions = {}) {
  const { enabled = true } = options
  const { session } = useSession()
  const setSocketStatus = useFriendsStore((state) => state.setSocketStatus)
  const handlePresenceUpdate = useFriendsStore((state) => state.handlePresenceUpdate)
  const handleAccepted = useFriendsStore((state) => state.handleRealtimeAccept)
  const handleRequest = useFriendsStore((state) => state.handleRealtimeRequest)
  const handleDecline = useFriendsStore((state) => state.handleRealtimeDecline)
  const pushNotification = useFriendsStore((state) => state.pushNotification)
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null)

  useEffect(() => {
    if (!enabled) {
      logFriendsRealtime("реалтайм отключен, не подключаем сокет")
      return
    }

    logFriendsRealtime("инициализируем подключение сокета", {
      hasAccessToken: Boolean(session.tokens.accessToken),
      hasCsrfToken: Boolean(session.csrfToken)
    })
    const token = session.tokens.accessToken
    const csrf = session.csrfToken

    setSocketStatus("connecting")
    logFriendsRealtime("устанавливаем статус сокета", "connecting")

    const socket = io(env.client.apiBaseUrl, {
      transports: ["websocket"],
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      auth: token
        ? (cb) => cb({ token, csrf })
        : csrf
          ? (cb) => cb({ csrf })
          : undefined
    }) as Socket<ServerToClientEvents, ClientToServerEvents>

    socketRef.current = socket

    const handleConnect = () => {
      logFriendsRealtime("сокет подключен")
      setSocketStatus("connected")
      pushNotification({
        kind: "success",
        title: "Соединение установлено"
      })
    }

    const handleDisconnect = () => {
      logFriendsRealtime("сокет отключен")
      setSocketStatus("disconnected")
    }

    const handleError = (error: Error) => {
      console.error("[friends] socket error", error)
      logFriendsRealtime("ошибка сокета", error.message)
      setSocketStatus("error")
      pushNotification({
        kind: "error",
        title: "Проблема с realtime",
        description: "Пытаемся переподключиться..."
      })
    }

    socket.on("connect", handleConnect)
    socket.on("disconnect", handleDisconnect)
    socket.on("connect_error", handleError)

    socket.on("presence:update", (payload) => {
      handlePresenceUpdate(payload)
    })

    socket.on("friends:accepted", (payload) => {
      handleAccepted(payload)
    })

    socket.on("friends:request", (payload) => {
      handleRequest(payload)
    })

    socket.on("friends:declined", (payload) => {
      handleDecline(payload)
    })

    socket.on("friends:removed", (payload) => {
      handleDecline(payload)
    })

    return () => {
      logFriendsRealtime("отключаем сокет и снимаем обработчики")
      socket.off("connect", handleConnect)
      socket.off("disconnect", handleDisconnect)
      socket.off("connect_error", handleError)
      socket.off("presence:update")
      socket.off("friends:accepted")
      socket.off("friends:request")
      socket.off("friends:declined")
      socket.off("friends:removed")
      socket.disconnect()
      socketRef.current = null
    }
  }, [
    enabled,
    session.tokens.accessToken,
    session.csrfToken,
    setSocketStatus,
    handlePresenceUpdate,
    handleAccepted,
    handleRequest,
    handleDecline,
    pushNotification
  ])
}

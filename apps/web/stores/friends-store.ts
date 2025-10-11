"use client"

import { create } from "zustand"

import { ApiError } from "@video-chat/contracts"
import type {
  Friend,
  FriendDecisionPayload,
  FriendRequestPayload,
  FriendsApi,
  ListFriendsResponse,
  UsersApi,
  User
} from "@video-chat/contracts"

type PresenceStatus = "online" | "offline"

type FriendDirection = "incoming" | "outgoing" | "accepted"

type SocketStatus = "idle" | "connecting" | "connected" | "disconnected" | "error"

export interface FriendViewModel {
  id: string
  relationship: Friend
  user: User
  direction: FriendDirection
  presence: PresenceStatus
  optimistic?: boolean
}

export interface PresenceUpdatePayload {
  userId: string
  status: PresenceStatus
  updatedAt?: string
}

export interface FriendRealtimePayload {
  friend: Friend
  reason?: string
}

export type FriendsFilter = "all" | "online" | "offline"

export interface FriendsNotification {
  id: string
  kind: "info" | "success" | "warning" | "error"
  title: string
  description?: string
}

const baseDataState = {
  currentUsername: null as string | null,
  relationships: {} as Record<string, FriendViewModel>,
  presenceByUserId: {} as Record<string, PresenceStatus>,
  filter: "all" as FriendsFilter,
  isLoading: false,
  isSearching: false,
  hasLoaded: false,
  searchQuery: "",
  searchResults: [] as User[],
  error: null as string | null,
  socketStatus: "idle" as SocketStatus,
  notifications: [] as FriendsNotification[]
}

interface FriendsState {
  currentUsername: string | null
  relationships: Record<string, FriendViewModel>
  presenceByUserId: Record<string, PresenceStatus>
  filter: FriendsFilter
  isLoading: boolean
  isSearching: boolean
  hasLoaded: boolean
  searchQuery: string
  searchResults: User[]
  error: string | null
  socketStatus: SocketStatus
  notifications: FriendsNotification[]
  initialize(username: string): void
  setFilter(filter: FriendsFilter): void
  setSocketStatus(status: FriendsState["socketStatus"]): void
  acknowledgeNotification(id: string): void
  pushNotification(notification: Omit<FriendsNotification, "id">): void
  loadRelationships(api: FriendsApi): Promise<void>
  applyFriendList(payload: ListFriendsResponse): void
  handlePresenceUpdate(update: PresenceUpdatePayload): void
  upsertRelationship(entry: Friend, options?: { optimisticId?: string; reason?: string }): void
  removeRelationship(id: string, reason?: string): void
  search(api: UsersApi, query: string): Promise<void>
  sendRequest(api: FriendsApi, payload: FriendRequestPayload): Promise<void>
  acceptRequest(api: FriendsApi, payload: FriendDecisionPayload): Promise<void>
  declineRequest(api: FriendsApi, payload: FriendDecisionPayload): Promise<void>
  handleRealtimeAccept(payload: FriendRealtimePayload): void
  handleRealtimeRequest(payload: FriendRealtimePayload): void
  handleRealtimeDecline(payload: FriendRealtimePayload): void
}

function sortUsersByDisplayName(a: User, b: User): number {
  const nameA = (a.displayName ?? a.username ?? "").toLowerCase()
  const nameB = (b.displayName ?? b.username ?? "").toLowerCase()
  if (nameA < nameB) return -1
  if (nameA > nameB) return 1
  return 0
}

function resolveDirection(friend: Friend, currentUsername: string | null): FriendDirection {
  if (!currentUsername) {
    return friend.status === "pending" ? "outgoing" : "accepted"
  }

  const requesterName = friend.requester?.username
  const addresseeName = friend.addressee?.username

  if (friend.status === "pending") {
    if (requesterName === currentUsername) {
      return "outgoing"
    }
    if (addresseeName === currentUsername) {
      return "incoming"
    }
  }

  return "accepted"
}

function extractCounterpart(friend: Friend, currentUsername: string | null): User | null {
  const direction = resolveDirection(friend, currentUsername)

  if (direction === "outgoing") {
    return friend.addressee ?? null
  }

  if (direction === "incoming") {
    return friend.requester ?? null
  }

  if (friend.requester?.username === currentUsername) {
    return friend.addressee ?? null
  }

  return friend.requester ?? friend.addressee ?? null
}

function toViewModel(friend: Friend, state: FriendsState): FriendViewModel | null {
  const user = extractCounterpart(friend, state.currentUsername)
  if (!user) {
    return null
  }

  const presence = state.presenceByUserId[user.id] ?? "offline"
  return {
    id: friend.id,
    relationship: friend,
    user,
    direction: resolveDirection(friend, state.currentUsername),
    presence
  }
}

export const useFriendsStore = create<FriendsState>((set, get) => ({
  ...baseDataState,
  initialize(username) {
    set({ currentUsername: username })
  },
  setFilter(filter) {
    set({ filter })
  },
  setSocketStatus(status) {
    set({ socketStatus: status })
  },
  acknowledgeNotification(id) {
    set((state) => ({
      notifications: state.notifications.filter((item) => item.id !== id)
    }))
  },
  pushNotification(notification) {
    set((state) => ({
      notifications: [
        ...state.notifications,
        {
          id: generateNotificationId(),
          ...notification
        }
      ]
    }))
  },
  async loadRelationships(api) {
    const state = get()
    if (!state.currentUsername) {
      return
    }

    set({ isLoading: true, error: null })

    try {
      const { data } = await api.list()
      get().applyFriendList(data)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        console.warn("[friends] list returned 404, assuming empty relationships")
        set({
          relationships: {},
          error: null
        })
        return
      }

      console.error("[friends] failed to load relationships", error)
      set({ error: "Не удалось загрузить список друзей" })
      get().pushNotification({
        kind: "error",
        title: "Ошибка загрузки",
        description: "Проверьте соединение с сервером и обновите страницу"
      })
    } finally {
      set({ isLoading: false, hasLoaded: true })
    }
  },
  applyFriendList(payload) {
    set((state) => {
      const nextRelationships: Record<string, FriendViewModel> = {}

      for (const friend of payload.items ?? []) {
        const view = toViewModel(friend, state)
        if (!view) continue
        nextRelationships[view.id] = view
      }

      return {
        relationships: nextRelationships,
        error: null
      }
    })
  },
  handlePresenceUpdate(update) {
    set((state) => {
      const nextPresence = { ...state.presenceByUserId, [update.userId]: update.status }
      const relationships = { ...state.relationships }

      for (const relationship of Object.values(relationships)) {
        if (relationship.user.id === update.userId) {
          relationship.presence = update.status
        }
      }

      return {
        presenceByUserId: nextPresence,
        relationships
      }
    })
  },
  upsertRelationship(friend, options) {
    set((state) => {
      const view = toViewModel(friend, state)
      if (!view) {
        return {}
      }

      if (options?.optimisticId) {
        view.id = options.optimisticId
        view.optimistic = true
      }

      return {
        relationships: {
          ...state.relationships,
          [view.id]: view
        }
      }
    })

    if (options?.reason) {
      get().pushNotification({
        kind: "info",
        title: "Обновление друзей",
        description: options.reason
      })
    }
  },
  removeRelationship(id, reason) {
    set((state) => {
      const { [id]: _removed, ...rest } = state.relationships
      void _removed
      return {
        relationships: rest
      }
    })

    if (reason) {
      get().pushNotification({
        kind: "warning",
        title: "Заявка обновлена",
        description: reason
      })
    }
  },
  async search(api, query) {
    const trimmed = query.trim()
    set({ searchQuery: trimmed, isSearching: true })

    if (trimmed.length < 2) {
      set({ searchResults: [], isSearching: false })
      return
    }

    try {
      const { data } = await api.search({ q: trimmed, limit: 20 })
      const results = [...(data.items ?? [])]
      results.sort(sortUsersByDisplayName)

      const relationships = get().relationships
      const knownUserIds = new Set(
        Object.values(relationships).map((relationship) => relationship.user.id)
      )

      const filtered = results.filter((user) => !knownUserIds.has(user.id))
      set({ searchResults: filtered, isSearching: false })
    } catch (error) {
      console.error("[friends] search failed", error)
      set({ isSearching: false })
      get().pushNotification({
        kind: "error",
        title: "Не удалось выполнить поиск",
        description: "Попробуйте повторить запрос чуть позже"
      })
    }
  },
  async sendRequest(api, payload) {
    const optimisticId = `optimistic-${nanoid()}`
    const now = new Date().toISOString()
    const optimisticFriend: Friend = {
      id: optimisticId,
      requesterId: "optimistic",
      addresseeId: payload.targetUserId,
      status: "pending",
      createdAt: now,
      respondedAt: null,
      requester: {
        id: "optimistic",
        username: get().currentUsername ?? "",
        displayName: get().currentUsername ?? "",
        avatarUrl: null,
        bio: null,
        createdAt: now
      },
      addressee: {
        id: payload.targetUserId,
        username: payload.targetUserId,
        displayName: payload.targetUserId,
        avatarUrl: null,
        bio: null,
        createdAt: now
      }
    }

    get().upsertRelationship(optimisticFriend, { optimisticId })

    try {
      const { data } = await api.request(payload)
      set((state) => {
        const { [optimisticId]: _removed, ...rest } = state.relationships
        void _removed
        return { relationships: rest }
      })
      get().upsertRelationship(data)
      get().pushNotification({
        kind: "success",
        title: "Заявка отправлена"
      })
    } catch (error) {
      console.error("[friends] request failed", error)
      get().removeRelationship(optimisticId)
      get().pushNotification({
        kind: "error",
        title: "Не удалось отправить заявку",
        description: "Проверьте соединение и попробуйте ещё раз"
      })
      throw error
    }
  },
  async acceptRequest(api, payload) {
    try {
      const { data } = await api.accept(payload)
      get().upsertRelationship(data)
      get().pushNotification({
        kind: "success",
        title: "Друг добавлен",
        description: `${data.requester?.displayName ?? data.requester?.username ?? "Пользователь"} теперь в списке друзей`
      })
    } catch (error) {
      console.error("[friends] accept failed", error)
      get().pushNotification({
        kind: "error",
        title: "Не удалось принять заявку",
        description: "Попробуйте ещё раз позже"
      })
      throw error
    }
  },
  async declineRequest(api, payload) {
    try {
      const { data } = await api.decline(payload)
      get().removeRelationship(data.id)
      get().pushNotification({
        kind: "info",
        title: "Заявка отклонена"
      })
    } catch (error) {
      console.error("[friends] decline failed", error)
      get().pushNotification({
        kind: "error",
        title: "Не удалось отклонить заявку"
      })
      throw error
    }
  },
  handleRealtimeAccept({ friend, reason }) {
    get().upsertRelationship(friend, { reason })
  },
  handleRealtimeRequest({ friend, reason }) {
    get().upsertRelationship(friend, { reason })
  },
  handleRealtimeDecline({ friend, reason }) {
    get().removeRelationship(friend.id, reason)
  }
}))

export function resetFriendsStore() {
  useFriendsStore.setState((state) => ({
    ...state,
    ...baseDataState,
    relationships: {},
    presenceByUserId: {},
    searchResults: [],
    notifications: []
  }))
}

function generateNotificationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `note-${Math.random().toString(36).slice(2, 10)}`
}

type RelationshipsSelector = (state: FriendsState) => FriendViewModel[]

function createRelationshipsSelector(
  predicate: (friend: FriendViewModel) => boolean
): RelationshipsSelector {
  let lastRelationships: FriendsState["relationships"] | null = null
  let lastResult: FriendViewModel[] = []

  return (state) => {
    if (state.relationships === lastRelationships) {
      return lastResult
    }

    lastRelationships = state.relationships
    lastResult = Object.values(state.relationships)
      .filter(predicate)
      .sort((a, b) => sortUsersByDisplayName(a.user, b.user))

    return lastResult
  }
}

export const selectAcceptedFriends: RelationshipsSelector = createRelationshipsSelector(
  (friend) => friend.relationship.status === "accepted" && friend.direction === "accepted"
)

export const selectIncomingRequests: RelationshipsSelector = createRelationshipsSelector(
  (friend) => friend.relationship.status === "pending" && friend.direction === "incoming"
)

export const selectOutgoingRequests: RelationshipsSelector = createRelationshipsSelector(
  (friend) => friend.relationship.status === "pending" && friend.direction === "outgoing"
)

export const selectFilteredAccepted = (() => {
  let lastFilter: FriendsFilter | null = null
  let lastAccepted: FriendViewModel[] | null = null
  let lastResult: FriendViewModel[] = []

  return (state: FriendsState): FriendViewModel[] => {
    const accepted = selectAcceptedFriends(state)

    if (state.filter === "all") {
      lastFilter = state.filter
      lastAccepted = accepted
      lastResult = accepted
      return accepted
    }

    if (lastFilter === state.filter && lastAccepted === accepted) {
      return lastResult
    }

    lastFilter = state.filter
    lastAccepted = accepted
    lastResult = accepted.filter((friend) => friend.presence === state.filter)

    return lastResult
  }
})()

export const selectOnlineCount = (() => {
  let lastAccepted: FriendViewModel[] | null = null
  let lastCount = 0

  return (state: FriendsState): number => {
    const accepted = selectAcceptedFriends(state)
    if (accepted === lastAccepted) {
      return lastCount
    }

    lastAccepted = accepted
    lastCount = accepted.filter((friend) => friend.presence === "online").length
    return lastCount
  }
})()

export const selectOfflineCount = (() => {
  let lastAccepted: FriendViewModel[] | null = null
  let lastCount = 0

  return (state: FriendsState): number => {
    const accepted = selectAcceptedFriends(state)
    if (accepted === lastAccepted) {
      return lastCount
    }

    lastAccepted = accepted
    lastCount = accepted.filter((friend) => friend.presence === "offline").length
    return lastCount
  }
})()

export const selectHasPending = (() => {
  let lastIncoming: FriendViewModel[] | null = null
  let lastOutgoing: FriendViewModel[] | null = null
  let lastValue = false

  return (state: FriendsState): boolean => {
    const incoming = selectIncomingRequests(state)
    const outgoing = selectOutgoingRequests(state)

    if (incoming === lastIncoming && outgoing === lastOutgoing) {
      return lastValue
    }

    lastIncoming = incoming
    lastOutgoing = outgoing
    lastValue = incoming.length > 0 || outgoing.length > 0
    return lastValue
  }
})()

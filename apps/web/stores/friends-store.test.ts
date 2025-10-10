import { describe, expect, beforeEach, it } from "vitest"

import type { Friend, User } from "@video-chat/contracts"

import {
  resetFriendsStore,
  selectIncomingRequests,
  selectOutgoingRequests,
  selectFilteredAccepted,
  useFriendsStore
} from "./friends-store"

function createUser(partial: Partial<User> & { id: string }): User {
  return {
    username: partial.username ?? `user-${partial.id}`,
    displayName: partial.displayName ?? `User ${partial.id}`,
    avatarUrl: partial.avatarUrl ?? null,
    bio: partial.bio ?? null,
    createdAt: partial.createdAt ?? new Date().toISOString(),
    ...partial
  }
}

function createFriend(partial: Partial<Friend> & { id: string; requester: User; addressee: User }): Friend {
  return {
    requesterId: partial.requesterId ?? partial.requester.id,
    addresseeId: partial.addresseeId ?? partial.addressee.id,
    status: partial.status ?? "pending",
    createdAt: partial.createdAt ?? new Date().toISOString(),
    respondedAt: partial.respondedAt ?? null,
    ...partial
  }
}

describe("friends-store", () => {
  beforeEach(() => {
    resetFriendsStore()
  })

  it("initializes current username", () => {
    const initialize = useFriendsStore.getState().initialize
    initialize("alice")

    expect(useFriendsStore.getState().currentUsername).toBe("alice")
  })

  it("resolves outgoing and incoming requests", () => {
    const requester = createUser({ id: "user-1", username: "alice" })
    const addressee = createUser({ id: "user-2", username: "bob" })

    const outgoing = createFriend({ id: "friend-1", requester, addressee, status: "pending" })
    const incoming = createFriend({
      id: "friend-2",
      requester: addressee,
      addressee: requester,
      status: "pending"
    })

    const state = useFriendsStore.getState()
    state.initialize("alice")
    state.applyFriendList({ items: [outgoing, incoming] })

    const outgoingRequests = selectOutgoingRequests(useFriendsStore.getState())
    const incomingRequests = selectIncomingRequests(useFriendsStore.getState())

    expect(outgoingRequests).toHaveLength(1)
    expect(outgoingRequests[0].user.username).toBe("bob")
    expect(incomingRequests).toHaveLength(1)
    expect(incomingRequests[0].user.username).toBe("bob")
  })

  it("updates presence status", () => {
    const requester = createUser({ id: "user-1", username: "alice" })
    const addressee = createUser({ id: "user-2", username: "bob" })
    const friend = createFriend({
      id: "friend-1",
      requester,
      addressee,
      status: "accepted"
    })

    const state = useFriendsStore.getState()
    state.initialize("alice")
    state.applyFriendList({ items: [friend] })
    state.handlePresenceUpdate({ userId: addressee.id, status: "online" })

    const [accepted] = selectFilteredAccepted(useFriendsStore.getState())
    expect(accepted.presence).toBe("online")
  })
})

export interface FriendSummary {
  id: string
  name: string
  status: "online" | "offline"
  title: string
}

export interface FriendRequest {
  id: string
  name: string
  mutualFriends: number
  requestedAt: string
  type: "incoming" | "outgoing"
}

const FRIENDS: FriendSummary[] = [
  { id: "1", name: "Анна Петрова", status: "online", title: "Product Designer" },
  { id: "2", name: "Илья Новиков", status: "offline", title: "DevOps Engineer" },
  { id: "3", name: "Мария Степанова", status: "online", title: "Frontend Developer" },
  { id: "4", name: "Кирилл Лебедев", status: "offline", title: "QA Specialist" }
]

const FRIEND_REQUESTS: FriendRequest[] = [
  {
    id: "5",
    name: "Лиза Морозова",
    mutualFriends: 3,
    requestedAt: "2024-11-28T12:40:00.000Z",
    type: "incoming"
  },
  {
    id: "6",
    name: "Григорий Денисов",
    mutualFriends: 1,
    requestedAt: "2024-11-27T18:10:00.000Z",
    type: "incoming"
  },
  {
    id: "7",
    name: "Александр Фролов",
    mutualFriends: 6,
    requestedAt: "2024-11-20T09:30:00.000Z",
    type: "outgoing"
  }
]

export async function getFriends(): Promise<FriendSummary[]> {
  return FRIENDS
}

export async function getFriendRequests(): Promise<{
  incoming: FriendRequest[]
  outgoing: FriendRequest[]
}> {
  return {
    incoming: FRIEND_REQUESTS.filter((request) => request.type === "incoming"),
    outgoing: FRIEND_REQUESTS.filter((request) => request.type === "outgoing")
  }
}

export interface RoomSummary {
  id: string
  title: string
  scheduledAt?: string
}

const ROOMS: RoomSummary[] = [
  { id: "alpha", title: "Стендап команды", scheduledAt: "2024-12-02T09:00:00.000Z" },
  { id: "beta", title: "Продакт-ревью" }
]

export async function getRooms(): Promise<RoomSummary[]> {
  return ROOMS
}

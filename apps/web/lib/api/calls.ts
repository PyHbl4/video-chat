export interface CallDetails {
  id: string
  topic: string
  scheduledAt: string
  participants: Array<{ name: string; role: string }>
  agenda: string[]
}

const CALLS: CallDetails[] = [
  {
    id: "alpha",
    topic: "Синхронизация по инфраструктуре",
    scheduledAt: "2024-11-30T15:00:00.000Z",
    participants: [
      { name: "Анна Петрова", role: "Дизайнер" },
      { name: "Илья Новиков", role: "DevOps" },
      { name: "Мария Степанова", role: "Фронтенд" }
    ],
    agenda: [
      "Прогресс по развёртыванию VDS",
      "Проверка сетевых политик",
      "Следующие шаги"
    ]
  }
]

export async function getCallDetails(id: string): Promise<CallDetails | null> {
  return CALLS.find((call) => call.id === id) ?? null
}

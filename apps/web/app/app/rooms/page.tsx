import { getRooms } from "@/lib/api/rooms"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function RoomsPage() {
  const rooms = await getRooms()

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Комнаты</h2>
        <p className="text-muted-foreground">
          Раздел в разработке — пока можно ознакомиться с планом.
        </p>
      </header>
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Комнаты скоро появятся</CardTitle>
          <CardDescription>
            Мы готовим шаблоны для быстрой организации встреч и стендапов.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button disabled className="w-full md:w-auto">
            Создать комнату
          </Button>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {rooms.map((room) => (
              <li key={room.id}>
                {room.title}
                {room.scheduledAt
                  ? ` — следующая встреча ${new Intl.DateTimeFormat("ru-RU", {
                      dateStyle: "medium",
                      timeStyle: "short"
                    }).format(new Date(room.scheduledAt))}`
                  : " — расписание уточняется"}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  )
}

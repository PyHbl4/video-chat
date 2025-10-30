import { notFound } from "next/navigation"

import { getCallDetails } from "@/lib/api/calls"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default async function CallDetailsPage({ params }: { params: { id: string } }) {
  const call = await getCallDetails(params.id)

  if (!call) {
    notFound()
  }

  const scheduledAt = new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(call.scheduledAt))

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Информация о звонке</h2>
        <p className="text-muted-foreground">Подробности предстоящей сессии.</p>
      </header>
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>{call.topic}</CardTitle>
          <CardDescription>Запланировано на {scheduledAt}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Участники</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {call.participants.map((participant) => (
                <li key={participant.name} className="flex items-center justify-between">
                  <span>{participant.name}</span>
                  <Badge variant="outline">{participant.role}</Badge>
                </li>
              ))}
            </ul>
          </div>
          <Separator />
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Повестка</h3>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              {call.agenda.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ol>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

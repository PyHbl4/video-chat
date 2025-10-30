import { Children, type ReactNode } from "react"

import { getFriendRequests } from "@/lib/api/friends"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default async function InboxPage() {
  const { incoming, outgoing } = await getFriendRequests()

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Заявки в друзья</h2>
        <p className="text-muted-foreground">
          Управляйте входящими и исходящими запросами.
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-2">
        <RequestsList title="Входящие" description="Новые приглашения от коллег" emptyLabel="Нет входящих заявок">
          {incoming.map((request) => (
            <RequestCard
              key={request.id}
              name={request.name}
              mutualFriends={request.mutualFriends}
              requestedAt={request.requestedAt}
              primaryActionLabel="Принять"
              secondaryActionLabel="Отклонить"
            />
          ))}
        </RequestsList>
        <RequestsList title="Исходящие" description="Заявки, отправленные вами" emptyLabel="Нет исходящих заявок">
          {outgoing.map((request) => (
            <RequestCard
              key={request.id}
              name={request.name}
              mutualFriends={request.mutualFriends}
              requestedAt={request.requestedAt}
              primaryActionLabel="Отозвать"
            />
          ))}
        </RequestsList>
      </div>
    </section>
  )
}

function RequestsList({
  title,
  description,
  emptyLabel,
  children
}: {
  title: string
  description: string
  emptyLabel: string
  children: ReactNode
}) {
  const isEmpty = Children.count(children) === 0

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {isEmpty ? (
        <EmptyState>{emptyLabel}</EmptyState>
      ) : (
        <div className="space-y-4">{children}</div>
      )}
    </div>
  )
}

function RequestCard({
  name,
  mutualFriends,
  requestedAt,
  primaryActionLabel,
  secondaryActionLabel
}: {
  name: string
  mutualFriends: number
  requestedAt: string
  primaryActionLabel: string
  secondaryActionLabel?: string
}) {
  const formattedDate = new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(requestedAt))

  return (
    <Card className="border-border/60">
      <CardHeader className="flex items-start gap-3 @container/card-header">
        <div className="flex-1 space-y-1">
          <CardTitle className="text-base font-semibold text-foreground">{name}</CardTitle>
          <CardDescription>{mutualFriends} общих коллег</CardDescription>
        </div>
        <Badge variant="outline" className="shrink-0">
          {formattedDate}
        </Badge>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        После подтверждения заявка появится в списке друзей.
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button size="sm">{primaryActionLabel}</Button>
        {secondaryActionLabel ? (
          <Button variant="outline" size="sm">
            {secondaryActionLabel}
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  )
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[120px] flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/40 p-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}

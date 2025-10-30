import { getCurrentProfile } from "@/lib/api/profile"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function ProfilePage() {
  const profile = await getCurrentProfile()

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Профиль</h2>
        <p className="text-muted-foreground">Редактируйте данные аккаунта и статус.</p>
      </header>
      <Card className="max-w-xl border-border/60">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar className="h-16 w-16">
            <AvatarFallback>{profile.name.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl font-semibold text-foreground">{profile.name}</CardTitle>
            <CardDescription>{profile.role}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Email:</span>
            <span>{profile.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Статус:</span>
            <Badge variant={profile.status === "online" ? "default" : "outline"}>
              {profile.status === "online" ? "В сети" : "Не в сети"}
            </Badge>
          </div>
          <Button>Редактировать</Button>
        </CardContent>
      </Card>
    </section>
  )
}

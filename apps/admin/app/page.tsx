import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@video-chat/ui"
import { getInitialSession } from "@video-chat/web-auth/session/server"

import { LogoutButton } from "@/components/auth/logout-button"

export const metadata: Metadata = {
  title: "Панель администратора — Self-Hosted Video Chat"
}

export default async function AdminHomePage() {
  const session = await getInitialSession()

  if (session.status !== "authenticated" || !session.user) {
    redirect("/auth/login")
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-12">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Здравствуйте, {session.user.username}</CardTitle>
            <CardDescription>
              В ближайших релизах здесь появятся графики нагрузки, списки пользователей и инструменты модерации.
            </CardDescription>
          </div>
          <LogoutButton className="sm:self-center" />
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Сейчас вы можете проверить корректность авторизации через общую систему входа. После логина все запросы к API
            выполняются от имени администратора.
          </p>
          <p>
            Когда появится разграничение прав, кнопка выхода останется прежней — мы просто добавим проверку ролей на сервере.
          </p>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          Сессия обновлена: {new Date(session.fetchedAt).toLocaleString("ru-RU")}
        </CardFooter>
      </Card>
    </main>
  )
}

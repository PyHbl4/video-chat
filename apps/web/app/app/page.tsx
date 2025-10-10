import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@video-chat/ui"

import { getInitialSession } from "@video-chat/web-auth/session/server"
import { LogoutButton } from "@/components/auth/logout-button"

export const metadata: Metadata = {
  title: "Приложение — Self-Hosted Video Chat"
}

export default async function AppHomePage() {
  const session = await getInitialSession()

  if (session.status !== "authenticated" || !session.user) {
    redirect("/auth/login")
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-12">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Добро пожаловать, {session.user.username}!</CardTitle>
            <CardDescription>
              Здесь появится ваша лента контактов и активных комнат. Команда уже работает над интерфейсом звонков.
            </CardDescription>
          </div>
          <LogoutButton className="sm:self-center" />
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Пока что это только каркас приложения. Вы можете зарегистрироваться, войти и убедиться, что авторизация работает
            корректно.
          </p>
          <p>
            Следующие шаги включают список друзей, приглашения в звонок и интерфейс комнаты со стримами WebRTC.
          </p>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          Сессия обновлена: {new Date(session.fetchedAt).toLocaleString("ru-RU")}
        </CardFooter>
      </Card>
    </div>
  )
}

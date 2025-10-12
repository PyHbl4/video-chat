
"use client"

import { useEffect } from "react"

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator
} from "@video-chat/ui"
import { CalendarIcon, SparklesIcon, VideoIcon } from "lucide-react"

import { useAppUser } from "@/components/app/app-user-context"
import { AppPageHeader } from "@/components/app/page-header"
import { FriendsList } from "@/components/friends/friends-list"
import { FriendsSidebar } from "@/components/friends/friends-sidebar"
import { useFriendsApi } from "@/hooks/use-friends-api"
import { useFriendsRealtime } from "@/hooks/use-friends-realtime"
import { useFriendsToasts } from "@/hooks/use-friends-toasts"
import { useFriendsStore } from "@/stores/friends-store"

export function FriendsAppPage() {
  const user = useAppUser()
  const initialize = useFriendsStore((state) => state.initialize)
  const loadRelationships = useFriendsStore((state) => state.loadRelationships)
  const hasLoaded = useFriendsStore((state) => state.hasLoaded)
  const { friends, users } = useFriendsApi()

  useFriendsRealtime({ enabled: Boolean(user?.id) })
  useFriendsToasts()

  useEffect(() => {
    if (user?.username) {
      initialize(user.username)
    }
  }, [initialize, user?.username])

  useEffect(() => {
    if (!user?.username || hasLoaded) {
      return
    }

    void loadRelationships(friends)
  }, [friends, hasLoaded, loadRelationships, user?.username])

  return (
    <div className="space-y-6">
      <AppPageHeader
        title="Друзья"
        description="Отслеживайте активность контактов, отправляйте приглашения и планируйте совместные звонки"
        actions={
          <Button className="gap-2" disabled>
            <VideoIcon className="size-4" aria-hidden />
            Быстрый звонок
          </Button>
        }
      >
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <SparklesIcon className="size-4" aria-hidden />
          <span>Горячие клавиши доступны для быстрого перехода между разделами: ⌘/Ctrl + P, M, V, E, S, A.</span>
        </div>
      </AppPageHeader>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <section className="space-y-6" aria-label="Панель управления друзьями">
          <FriendsSidebar friendsApi={friends} usersApi={users} />

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Планы на ближайшее время</CardTitle>
              <CardDescription>
                Мы готовим комнатные звонки, групповые списки и смарт-поиск по статусам.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2">
                <span className="font-medium text-foreground">Гибкие статусы</span>
                <Badge variant="secondary">В работе</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2">
                <span className="font-medium text-foreground">Групповые звонки</span>
                <Badge variant="outline">Следом</Badge>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6" aria-label="Список друзей">
          <FriendsList />
        </section>

        <aside className="hidden flex-col gap-6 xl:flex" aria-label="Советы и расписание">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Расписание звонков</CardTitle>
              <CardDescription>
                Планировщик появится вместе с релизом комнат. Пока что создайте напоминание в календаре.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full gap-2" disabled>
                <CalendarIcon className="size-4" aria-hidden />
                Добавить в календарь
              </Button>
              <Separator />
              <p className="text-xs text-muted-foreground">
                После запуска комнат здесь появятся предстоящие встречи, а также быстрый доступ к заметкам по звонку.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Совет по онбордингу</CardTitle>
              <CardDescription>
                Расскажите коллегам про раздел «Входящие», чтобы не пропустить приглашения в комнаты и запросы в друзья.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Мы также добавим совместный просмотр файлов и заметки по звонку, чтобы команда быстрее синхронизировалась.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

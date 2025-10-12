
import { BellRingIcon, CheckCircle2Icon, ClockIcon, FilterIcon, InboxIcon } from "lucide-react"

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@video-chat/ui"

import { EmptyState } from "@/components/app/empty-state"
import { AppPageHeader } from "@/components/app/page-header"

export default function InboxPage() {
  return (
    <div className="space-y-6">
      <AppPageHeader
        title="Входящие"
        description="Следите за приглашениями, напоминаниями о звонках и изменениях статусов"
        actions={
          <Button className="gap-2" disabled>
            <FilterIcon className="size-4" aria-hidden />
            Настроить фильтры
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <section className="space-y-6" aria-label="Типы уведомлений">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Категории</CardTitle>
              <CardDescription>Выберите, какие уведомления показывать в первую очередь.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span>Приглашения</span>
                <Badge variant="secondary">В разработке</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span>Напоминания о звонках</span>
                <Badge variant="outline">Скоро</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span>Системные события</span>
                <Badge variant="outline">Скоро</Badge>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6" aria-label="Лента входящих">
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="all">Все</TabsTrigger>
              <TabsTrigger value="calls">Звонки</TabsTrigger>
              <TabsTrigger value="requests">Заявки</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="space-y-4">
              <EmptyState
                icon={InboxIcon}
                title="Уведомлений нет"
                description="Когда появятся новые события, мы покажем их здесь и отправим toast-уведомление."
              />
            </TabsContent>
            <TabsContent value="calls" className="space-y-4">
              <EmptyState
                icon={ClockIcon}
                title="Напоминания будут позже"
                description="Планировщик звонков будет автоматически создавать уведомления за 5 минут до начала."
              />
            </TabsContent>
            <TabsContent value="requests" className="space-y-4">
              <EmptyState
                icon={BellRingIcon}
                title="Запросы в друзья"
                description="Все приглашения отображаются в разделе 'Друзья'. Здесь появится сводка и быстрые действия."
              />
            </TabsContent>
          </Tabs>
        </section>

        <aside className="hidden flex-col gap-6 xl:flex" aria-label="Политика уведомлений">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Как мы фильтруем уведомления</CardTitle>
              <CardDescription>
                Планируем внедрить приоритизацию по важности и часовому поясу.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                <CheckCircle2Icon className="size-4" aria-hidden />
                <span>Не больше двух активных уведомлений одновременно</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                <BellRingIcon className="size-4" aria-hidden />
                <span>Уведомления автоматически скрываются через 3 секунды</span>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

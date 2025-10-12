
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
import { BroadcastIcon, CalendarClockIcon, NetworkIcon, ScreenShareIcon, VideoIcon } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"
import { AppPageHeader } from "@/components/app/page-header"

export default function CallsPage() {
  return (
    <div className="space-y-6">
      <AppPageHeader
        title="Звонки"
        description="Управляйте комнатами, отслеживайте качество связи и готовьте устройства"
        actions={
          <Button className="gap-2" disabled>
            <VideoIcon className="size-4" aria-hidden />
            Создать комнату
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <section className="space-y-6" aria-label="Быстрые действия">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Преднастройки</CardTitle>
              <CardDescription>
                Сценарии звонка сохранятся, когда подключим API комнат.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span>Общий созвон команды</span>
                <BroadcastIcon className="size-4" aria-hidden />
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span>Демострация экрана</span>
                <ScreenShareIcon className="size-4" aria-hidden />
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span>Только аудио</span>
                <VideoIcon className="size-4" aria-hidden />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">Состояние сети</CardTitle>
                <CardDescription>В разработке: будем измерять задержку и пакет-лосс.</CardDescription>
              </div>
              <Badge variant="outline" className="shrink-0">beta</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Перед звонком запустите тест сети, чтобы убедиться, что устройство готово. Мы добавим автоматические проверки и
                рекомендации по качеству связи.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6" aria-label="Состояния звонков">
          <Tabs defaultValue="active" className="space-y-4">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="active">Активные</TabsTrigger>
              <TabsTrigger value="scheduled">Запланированные</TabsTrigger>
              <TabsTrigger value="history">История</TabsTrigger>
            </TabsList>
            <TabsContent value="active" className="space-y-4">
              <EmptyState
                icon={VideoIcon}
                title="Нет активных звонков"
                description="Как только вы подключитесь к комнате, здесь появится статус подключения и панель устройств."
                action={{ label: "Открыть комнату", disabled: true }}
              />
            </TabsContent>
            <TabsContent value="scheduled" className="space-y-4">
              <EmptyState
                icon={CalendarClockIcon}
                title="Звонки на будущее"
                description="Мы подключим синхронизацию с календарями и отправку приглашений по e-mail."
              />
            </TabsContent>
            <TabsContent value="history" className="space-y-4">
              <EmptyState
                icon={NetworkIcon}
                title="История появится позже"
                description="Здесь будет список завершённых звонков, оценка качества и быстрый экспорт отчётов."
              />
            </TabsContent>
          </Tabs>
        </section>

        <aside className="hidden flex-col gap-6 xl:flex" aria-label="Подготовка к созвону">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Чек-лист устройств</CardTitle>
              <CardDescription>
                Проверьте камеру, микрофон и динамики перед звонком. Мы добавим авто-проверку позднее.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-lg bg-muted/50 px-3 py-2">Тест камеры</div>
              <div className="rounded-lg bg-muted/50 px-3 py-2">Тест микрофона</div>
              <div className="rounded-lg bg-muted/50 px-3 py-2">Тест динамиков</div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

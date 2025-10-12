import {
  Badge,
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
import { BarChart2Icon, LineChartIcon, NetworkIcon, PhoneCallIcon, SignalHighIcon } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { AdminPageHeader } from "@/components/page-header"

export default function AdminCallsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Мониторинг звонков"
        description="Собирайте аналитику по комнатам, качеству связи и инцидентам"
        actions={<Badge variant="secondary">beta</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" aria-label="Отчёты и статистика">
        <section className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="flex items-center gap-3">
              <PhoneCallIcon className="size-5 text-primary" aria-hidden />
              <div>
                <CardTitle className="text-base">Сводка по комнатам</CardTitle>
                <CardDescription>Отслеживайте активные и завершённые звонки.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="active" className="space-y-4">
                <TabsList className="w-full justify-start overflow-x-auto">
                  <TabsTrigger value="active">Активные</TabsTrigger>
                  <TabsTrigger value="scheduled">Запланированные</TabsTrigger>
                  <TabsTrigger value="completed">Завершённые</TabsTrigger>
                </TabsList>
                <TabsContent value="active" className="space-y-4">
                  <EmptyState
                    icon={SignalHighIcon}
                    title="Нет активных комнат"
                    description="После подключения WebRTC сюда попадут все текущие звонки с их параметрами."
                    action={{ label: "Открыть комнату", disabled: true }}
                  />
                </TabsContent>
                <TabsContent value="scheduled" className="space-y-4">
                  <EmptyState
                    icon={NetworkIcon}
                    title="Запланированные звонки"
                    description="Синхронизация с календарями находится в разработке."
                  />
                </TabsContent>
                <TabsContent value="completed" className="space-y-4">
                  <EmptyState
                    icon={BarChart2Icon}
                    title="Отчёты появятся позже"
                    description="После релиза аналитики вы сможете выгружать статистику и записи."
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Качество связи</CardTitle>
              <CardDescription>Скоро появятся тепловые карты задержек и потерь пакетов.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-lg bg-muted/50 px-3 py-2">Средний битрейт — 3.5 Мбит/с</div>
              <div className="rounded-lg bg-muted/50 px-3 py-2">Средняя задержка — 42 мс</div>
              <div className="rounded-lg bg-muted/50 px-3 py-2">Средний packet loss — 0.2%</div>
              <p className="text-xs">
                Значения статичны и будут заменены реальными данными после интеграции с сервисом мониторинга.
              </p>
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="flex items-center gap-3">
              <LineChartIcon className="size-5 text-primary" aria-hidden />
              <div>
                <CardTitle className="text-base">Экспорт аналитики</CardTitle>
                <CardDescription>Готовим выгрузку в CSV и интеграцию с BI.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-lg bg-muted/50 px-3 py-2">CSV-экспорт — в разработке</div>
              <div className="rounded-lg bg-muted/50 px-3 py-2">Webhook для алёртов — запланировано</div>
              <div className="rounded-lg bg-muted/50 px-3 py-2">Интеграция с Grafana — обсуждается</div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Чек-лист SLO</CardTitle>
              <CardDescription>Контроль целевых показателей качества.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                <span>Доступность 99.9%</span>
                <Badge variant="secondary">в планах</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                <span>Средняя задержка &lt; 80 мс</span>
                <Badge variant="outline">черновик</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                <span>Доля успешных соединений 98%</span>
                <Badge variant="secondary">в планах</Badge>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

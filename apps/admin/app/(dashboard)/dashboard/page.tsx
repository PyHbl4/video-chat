import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator
} from "@video-chat/ui"
import { ActivityIcon, AlertTriangleIcon, ClockIcon, GaugeIcon, ServerIcon } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { AdminPageHeader } from "@/components/page-header"

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Обзор платформы"
        description="Следите за ключевыми метриками и статусом инфраструктуры"
        actions={<Badge variant="outline">MVP</Badge>}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Ключевые показатели">
        {["Активные пользователи", "Пиковые звонки", "Средний пинг", "Ошибки за час"].map((title, index) => (
          <Card key={title} className="shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              <CardDescription className="text-2xl font-semibold text-foreground">
                {index === 0 ? "128" : index === 1 ? "18" : index === 2 ? "42 мс" : "0"}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Данные будут поступать после подключения реального мониторинга.
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" aria-label="Сводка и уведомления">
        <section className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="flex items-center gap-3">
              <GaugeIcon className="size-5 text-primary" aria-hidden />
              <div>
                <CardTitle className="text-base">Состояние кластеров</CardTitle>
                <CardDescription>Здесь появится распределение нагрузки по узлам.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                Мы собираем требования к мониторингу: латентность, количество участников в комнатах, скорость передачи данных.
                После запуска метрик вы сможете отслеживать отклонения в реальном времени.
              </p>
              <Separator />
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span>Автоскейлинг</span>
                <Badge variant="secondary">В очереди</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex items-center gap-3">
              <AlertTriangleIcon className="size-5 text-destructive" aria-hidden />
              <div>
                <CardTitle className="text-base">Инциденты</CardTitle>
                <CardDescription>Пока нет открытых инцидентов.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={ServerIcon}
                title="История инцидентов появится позже"
                description="После подключения логов и алёртов вы сможете отслеживать RCA и назначать ответственных."
                action={{ label: "Настроить алёрты", disabled: true }}
              />
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="flex items-center gap-3">
              <ClockIcon className="size-5 text-primary" aria-hidden />
              <div>
                <CardTitle className="text-base">Ближайшие задачи</CardTitle>
                <CardDescription>Планируемые улучшения админ-панели.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-lg bg-muted/50 px-3 py-2">Интеграция с Storybook</div>
              <div className="rounded-lg bg-muted/50 px-3 py-2">Экспорт статистики по звонкам</div>
              <div className="rounded-lg bg-muted/50 px-3 py-2">Гранулярные роли доступа</div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex items-center gap-3">
              <ActivityIcon className="size-5 text-primary" aria-hidden />
              <div>
                <CardTitle className="text-base">Статус обновления</CardTitle>
                <CardDescription>Последнее обновление 2 часа назад.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Мы подключим автоматическое обновление статуса после релиза CI/CD пайплайнов для админ-панели.
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

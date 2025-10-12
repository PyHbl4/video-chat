import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Label,
  Separator,
  Switch
} from "@video-chat/ui"
import { FileTextIcon, LockIcon, ShieldCheckIcon, ShieldQuestionIcon } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { AdminPageHeader } from "@/components/page-header"

export default function AdminPoliciesPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Политики и безопасность"
        description="Настраивайте доступ, retention и контроль конфиденциальности"
        actions={<Badge variant="outline">draft</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]" aria-label="Политики и отчёты">
        <section className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="flex items-center gap-3">
              <ShieldCheckIcon className="size-5 text-primary" aria-hidden />
              <div>
                <CardTitle className="text-base">Контроль доступа</CardTitle>
                <CardDescription>Задайте базовые правила для модераторов и администраторов.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span>Требовать 2FA для всех администраторов</span>
                <Switch checked readOnly disabled />
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span>Ограничить вход по IP</span>
                <Switch readOnly disabled />
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span>Заблокировать удаление звонков без роли Owner</span>
                <Switch checked readOnly disabled />
              </div>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground">
              Функциональность будет активирована после подключения сервисов авторизации и логирования.
            </CardFooter>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex items-center gap-3">
              <LockIcon className="size-5 text-primary" aria-hidden />
              <div>
                <CardTitle className="text-base">Политика хранения данных</CardTitle>
                <CardDescription>Определите срок жизни записей и логов.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                <Checkbox id="retention" disabled defaultChecked />
                <Label htmlFor="retention">Хранить записи звонков 30 дней</Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox id="logs" disabled />
                <Label htmlFor="logs">Собирать детализированные логи WebRTC</Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox id="privacy" disabled defaultChecked />
                <Label htmlFor="privacy">Анонимизировать персональные данные в аналитике</Label>
              </div>
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="flex items-center gap-3">
              <FileTextIcon className="size-5 text-primary" aria-hidden />
              <div>
                <CardTitle className="text-base">Отчёты и аудит</CardTitle>
                <CardDescription>Скоро можно будет выгружать протоколы действий.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={FileTextIcon}
                title="Архив ещё пуст"
                description="После подключения аудита вы сможете экспортировать отчёты в PDF или JSON."
                secondaryAction={{ label: "Подключить S3", disabled: true }}
              />
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex items-center gap-3">
              <ShieldQuestionIcon className="size-5 text-primary" aria-hidden />
              <div>
                <CardTitle className="text-base">Чек-лист безопасности</CardTitle>
                <CardDescription>Пункты для запуска self-hosted инсталляции.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-lg bg-muted/40 px-3 py-2">Сегментация сети — настройка</div>
              <div className="rounded-lg bg-muted/40 px-3 py-2">Регулярные бэкапы — в процессе</div>
              <div className="rounded-lg bg-muted/40 px-3 py-2">Обновление сертификатов — ежемесячно</div>
              <Separator />
              <p className="text-xs">Полный чек-лист появится в документации после согласования с безопасностью.</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

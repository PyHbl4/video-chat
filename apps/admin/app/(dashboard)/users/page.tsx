import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  ScrollArea,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@video-chat/ui"
import { BanIcon, CheckIcon, FilterIcon, UserPlusIcon, UsersIcon } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { AdminPageHeader } from "@/components/page-header"

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Управление пользователями"
        description="Просматривайте активность, роли и заявки на приглашение"
        actions={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="gap-2" disabled>
              <UserPlusIcon className="size-4" aria-hidden />
              Пригласить
            </Button>
            <Button variant="outline" className="gap-2" disabled>
              <FilterIcon className="size-4" aria-hidden />
              Фильтры
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" aria-label="Списки и действия">
        <section className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-base">Список пользователей</CardTitle>
                <CardDescription>Фильтруйте участников и просматривайте статус аккаунта.</CardDescription>
              </div>
              <div className="relative w-full max-w-xs">
                <Input placeholder="Поиск по имени или e-mail" disabled className="pe-12" />
                <Badge className="absolute right-2 top-2">⌘K</Badge>
              </div>
            </CardHeader>
            <CardContent className="rounded-lg border bg-card/50 p-0">
              <ScrollArea className="h-[360px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Пользователь</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Роль</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {["Алексей", "Марина", "Павел"].map((name, index) => (
                      <TableRow key={name}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{name} Иванов</span>
                            <span className="text-xs text-muted-foreground">{name.toLowerCase()}@example.com</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={index === 0 ? "default" : index === 1 ? "secondary" : "outline"}>
                            {index === 0 ? "online" : index === 1 ? "pending" : "offline"}
                          </Badge>
                        </TableCell>
                        <TableCell>{index === 2 ? "viewer" : "admin"}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">Скоро</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground">Поддержка фильтров появится после интеграции с API.</CardFooter>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex items-center gap-3">
              <UsersIcon className="size-5 text-primary" aria-hidden />
              <div>
                <CardTitle className="text-base">Заявки на приглашение</CardTitle>
                <CardDescription>Следите за статусом приглашений.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={UsersIcon}
                title="Новых заявок нет"
                description="Как только появятся запросы, вы сможете одобрять или отклонять их прямо здесь."
                secondaryAction={{ label: "Открыть аудит", disabled: true }}
              />
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="flex items-center gap-3">
              <CheckIcon className="size-5 text-primary" aria-hidden />
              <div>
                <CardTitle className="text-base">Быстрые действия</CardTitle>
                <CardDescription>Управление ролями и статусом.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span>Назначить модератора</span>
                <Button size="sm" variant="outline" disabled>
                  <CheckIcon className="size-4" aria-hidden />
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span>Заблокировать пользователя</span>
                <Button size="sm" variant="outline" disabled>
                  <BanIcon className="size-4" aria-hidden />
                </Button>
              </div>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground">
              Экшены станут активными после подключения административного API.
            </CardFooter>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Журнал событий</CardTitle>
              <CardDescription>Последние операции над аккаунтами.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                <span>Роль изменена — Марина</span>
                <span className="text-xs">5 мин назад</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                <span>Приглашение отправлено — Павел</span>
                <span className="text-xs">10 мин назад</span>
              </div>
              <Separator />
              <p className="text-xs">
                Источник данных — будущий сервис аудита. Пока записи статичны и служат примерами.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

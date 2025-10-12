
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Tabs, TabsContent, TabsList, TabsTrigger } from "@video-chat/ui"
import { MessageSquareIcon, PencilIcon, PinIcon } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"
import { AppPageHeader } from "@/components/app/page-header"

export default function ChatsPage() {
  return (
    <div className="space-y-6">
      <AppPageHeader
        title="Чаты"
        description="Общайтесь с командой и друзьями в личных и групповых переписках"
        actions={
          <Button className="gap-2" disabled>
            <PencilIcon className="size-4" aria-hidden />
            Новый чат
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <section className="space-y-6" aria-label="Фильтры и быстрые списки">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Каталоги</CardTitle>
              <CardDescription>
                После запуска бэкенда здесь появятся закреплённые диалоги и смарт-папки.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-lg bg-muted/50 px-4 py-3">Закреплённые чаты</div>
              <div className="rounded-lg bg-muted/50 px-4 py-3">Группы проекта</div>
              <div className="rounded-lg bg-muted/50 px-4 py-3">Чаты с файлами</div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Что будет дальше</CardTitle>
              <CardDescription>
                Планируем добавить быструю разбивку по непрочитанным и шаринг файлов прямо из чата.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span>Умные темы</span>
                <PinIcon className="size-4" aria-hidden />
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span>Заметки по обсуждению</span>
                <MessageSquareIcon className="size-4" aria-hidden />
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6" aria-label="История чатов">
          <Tabs defaultValue="direct" className="space-y-4">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="direct">Личные</TabsTrigger>
              <TabsTrigger value="groups">Группы</TabsTrigger>
              <TabsTrigger value="files">Файлы</TabsTrigger>
            </TabsList>
            <TabsContent value="direct" className="space-y-4">
              <EmptyState
                icon={MessageSquareIcon}
                title="Здесь пока пусто"
                description="Как только появятся активные переписки, мы отобразим их историю и быстрые ответы."
                action={{ label: "Создать чат", disabled: true }}
              />
            </TabsContent>
            <TabsContent value="groups" className="space-y-4">
              <EmptyState
                icon={MessageSquareIcon}
                title="Группы в разработке"
                description="Скоро появится поддержка групповых обсуждений, синхронизированных с комнатами звонков."
              />
            </TabsContent>
            <TabsContent value="files" className="space-y-4">
              <EmptyState
                icon={MessageSquareIcon}
                title="Файлы появятся позже"
                description="Храните документы и ссылки, связанные с чатом. Мы добавим фильтры и предпросмотр файлов."
              />
            </TabsContent>
          </Tabs>
        </section>

        <aside className="hidden flex-col gap-6 xl:flex" aria-label="Подсказки и контроль качества">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Политика уведомлений</CardTitle>
              <CardDescription>
                Мы ограничим пуши одним уведомлением в минуту, чтобы не отвлекать команду.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Здесь появится переключатель режима «Не беспокоить» и расписание рабочих часов. Пока что используйте раздел
                «Настройки» для изменения статуса.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

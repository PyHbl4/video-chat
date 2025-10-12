
import { LaptopIcon, LockIcon, MoonIcon, UserCogIcon } from "lucide-react"

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea
} from "@video-chat/ui"

import { AppPageHeader } from "@/components/app/page-header"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <AppPageHeader
        title="Настройки"
        description="Настройте профиль, устройства и предпочтения для звонков"
      />

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <section className="space-y-6" aria-label="Общие настройки">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Профиль</CardTitle>
              <CardDescription>Скоро добавим синхронизацию с реальным бекэндом.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="rounded-lg bg-muted/50 px-3 py-2">Имя и аватар</div>
              <div className="rounded-lg bg-muted/50 px-3 py-2">Контакты</div>
              <div className="rounded-lg bg-muted/50 px-3 py-2">Уведомления</div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6" aria-label="Редактирование настроек">
          <Tabs defaultValue="profile" className="space-y-4">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="profile">Профиль</TabsTrigger>
              <TabsTrigger value="devices">Устройства</TabsTrigger>
              <TabsTrigger value="privacy">Приватность</TabsTrigger>
              <TabsTrigger value="theme">Тема</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4">
              <Card className="shadow-sm">
                <CardHeader className="flex items-center gap-2">
                  <UserCogIcon className="size-4" aria-hidden />
                  <div>
                    <CardTitle className="text-base">Данные профиля</CardTitle>
                    <CardDescription>Измените имя и описание профиля. Сохранение пока не активно.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Отображаемое имя</Label>
                    <Input id="displayName" placeholder="Иван Иванов" disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">О себе</Label>
                    <Textarea id="bio" placeholder="Расскажите команде о себе" disabled rows={3} />
                  </div>
                  <Button disabled>Сохранить</Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="devices" className="space-y-4">
              <Card className="shadow-sm">
                <CardHeader className="flex items-center gap-2">
                  <LaptopIcon className="size-4" aria-hidden />
                  <div>
                    <CardTitle className="text-base">Устройства</CardTitle>
                    <CardDescription>Выбор камеры, микрофона и динамиков появится после интеграции WebRTC.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="rounded-lg bg-muted/40 px-3 py-2">Камера: скоро</div>
                  <div className="rounded-lg bg-muted/40 px-3 py-2">Микрофон: скоро</div>
                  <div className="rounded-lg bg-muted/40 px-3 py-2">Динамики: скоро</div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="privacy" className="space-y-4">
              <Card className="shadow-sm">
                <CardHeader className="flex items-center gap-2">
                  <LockIcon className="size-4" aria-hidden />
                  <div>
                    <CardTitle className="text-base">Приватность</CardTitle>
                    <CardDescription>Управляйте отображением статуса и доступностью для звонков.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                    <span className="text-sm">Показывать онлайн-статус</span>
                    <Switch checked readOnly disabled />
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                    <span className="text-sm">Разрешить входящие звонки от всех</span>
                    <Switch checked readOnly disabled />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="theme" className="space-y-4">
              <Card className="shadow-sm">
                <CardHeader className="flex items-center gap-2">
                  <MoonIcon className="size-4" aria-hidden />
                  <div>
                    <CardTitle className="text-base">Тема</CardTitle>
                    <CardDescription>Светлый, тёмный или системный режим — появится вместе с переключателем тем.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="rounded-lg bg-muted/40 px-3 py-2">Светлая тема — скоро</div>
                  <div className="rounded-lg bg-muted/40 px-3 py-2">Тёмная тема — скоро</div>
                  <div className="rounded-lg bg-muted/40 px-3 py-2">Системная тема — скоро</div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>

        <aside className="hidden flex-col gap-6 xl:flex" aria-label="Советы по безопасности">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Планы по настройкам</CardTitle>
              <CardDescription>Мы добавим синхронизацию с user_preferences и хранение в localStorage.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Пока что настройки сохраняются только в рамках текущей сессии. Следите за обновлениями в документации.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

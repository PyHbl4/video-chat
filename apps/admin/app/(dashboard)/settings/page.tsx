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
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea
} from "@video-chat/ui"
import { CogIcon, GlobeIcon, PaletteIcon, ShieldIcon, ZapIcon } from "lucide-react"

import { AdminPageHeader } from "@/components/page-header"

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Настройки админ-панели"
        description="Определите интеграции, уведомления и оформление интерфейса"
        actions={<Badge variant="secondary">preview</Badge>}
      />

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="general">Общие</TabsTrigger>
          <TabsTrigger value="notifications">Уведомления</TabsTrigger>
          <TabsTrigger value="appearance">Оформление</TabsTrigger>
          <TabsTrigger value="integrations">Интеграции</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="flex items-center gap-3">
              <CogIcon className="size-5 text-primary" aria-hidden />
              <div>
                <CardTitle className="text-base">Общие параметры</CardTitle>
                <CardDescription>Базовые настройки приложения.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="instanceName">Название инсталляции</Label>
                <Input id="instanceName" placeholder="Команда Product" disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="locale">Язык по умолчанию</Label>
                <Select disabled>
                  <SelectTrigger id="locale">
                    <SelectValue placeholder="Русский" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ru">Русский</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="supportEmail">E-mail поддержки</Label>
                <Input id="supportEmail" type="email" placeholder="support@example.com" disabled />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="flex items-center gap-3">
              <ZapIcon className="size-5 text-primary" aria-hidden />
              <div>
                <CardTitle className="text-base">Системные уведомления</CardTitle>
                <CardDescription>Управляйте алертами для администраторов.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span>Отправлять письма при инцидентах</span>
                <Switch checked readOnly disabled />
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span>Push в браузер при деградации SLO</span>
                <Switch readOnly disabled />
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span>Еженедельный дайджест</span>
                <Switch checked readOnly disabled />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="flex items-center gap-3">
              <PaletteIcon className="size-5 text-primary" aria-hidden />
              <div>
                <CardTitle className="text-base">Оформление</CardTitle>
                <CardDescription>Настройте брендовые цвета и логотип.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Основной цвет</Label>
                <Input id="primaryColor" type="color" value="#10B981" readOnly disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo">Ссылка на логотип</Label>
                <Input id="logo" placeholder="https://..." disabled />
              </div>
              <Textarea rows={4} placeholder="Описание брендбука" disabled />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="flex items-center gap-3">
              <GlobeIcon className="size-5 text-primary" aria-hidden />
              <div>
                <CardTitle className="text-base">Внешние сервисы</CardTitle>
                <CardDescription>Подключите хранилища и аналитические инструменты.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-lg bg-muted/50 px-3 py-2">S3-бакет для записей — настройка</div>
              <div className="rounded-lg bg-muted/50 px-3 py-2">Webhook для алёртов — запланировано</div>
              <div className="rounded-lg bg-muted/50 px-3 py-2">Стриминг в BigQuery — оценка</div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex items-center gap-3">
              <ShieldIcon className="size-5 text-primary" aria-hidden />
              <div>
                <CardTitle className="text-base">Вебхуки безопасности</CardTitle>
                <CardDescription>Настройте события для SIEM.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <Textarea rows={5} placeholder="JSON-конфигурация webhook" disabled />
              <Separator />
              <p className="text-xs">Экспорт и импорты настроек появятся в одном из следующих релизов.</p>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button disabled>Сохранить</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

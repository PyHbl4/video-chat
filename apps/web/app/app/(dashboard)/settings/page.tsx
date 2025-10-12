"use client"

import { useMemo } from "react"

import type { LucideIcon } from "lucide-react"
import { LaptopIcon, LockIcon, MoonIcon, SunIcon, UserCogIcon } from "lucide-react"

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
  Textarea,
  ToggleGroup,
  ToggleGroupItem
} from "@video-chat/ui"

import { AppPageHeader } from "@/components/app/page-header"
import { useUserPreferences } from "@/components/providers/user-preferences-provider"

type ThemeOption = "system" | "light" | "dark"

const THEME_OPTIONS: Array<{
  value: ThemeOption
  label: string
  icon: LucideIcon
}> = [
  { value: "system", label: "Системная", icon: LaptopIcon },
  { value: "light", label: "Светлая", icon: SunIcon },
  { value: "dark", label: "Тёмная", icon: MoonIcon }
]

export default function SettingsPage() {
  const { preferences, updatePreferences, isLoading, isSaving } = useUserPreferences()

  const lastUpdatedLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("ru-RU", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(preferences.updatedAt))
    } catch (error) {
      console.warn("Не удалось форматировать дату обновления настроек", error)
      return preferences.updatedAt
    }
  }, [preferences.updatedAt])

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
              <CardDescription>Редактирование профиля появится вместе с синхронизацией аккаунта.</CardDescription>
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
                    <CardTitle className="text-base">Параметры звонков</CardTitle>
                    <CardDescription>
                      Настройте поведение микрофона и камеры перед подключением к встрече.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <PreferenceToggle
                    title="Выключать микрофон при входе"
                    description="Удобно, если вы подключаетесь в шумной обстановке."
                    checked={preferences.audio.muteMicrophoneOnJoin}
                    onCheckedChange={(next) =>
                      updatePreferences({ audio: { muteMicrophoneOnJoin: next } })
                    }
                    disabled={isLoading}
                  />
                  <PreferenceToggle
                    title="Включать камеру автоматически"
                    description="Если отключить, камера останется выключенной до ручного включения."
                    checked={preferences.video.startWithCamera}
                    onCheckedChange={(next) =>
                      updatePreferences({ video: { startWithCamera: next } })
                    }
                    disabled={isLoading}
                  />
                  <PreferenceToggle
                    title="Зеркалить собственное видео"
                    description="Полезно, если привычнее видеть зеркальное отражение в превью."
                    checked={preferences.video.mirrorVideo}
                    onCheckedChange={(next) =>
                      updatePreferences({ video: { mirrorVideo: next } })
                    }
                    disabled={isLoading}
                  />
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
                    <CardDescription>
                      Выберите оформление интерфейса. Изменения синхронизируются между устройствами.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    value={preferences.theme.mode as ThemeOption}
                    onValueChange={(value) => {
                      if (!value) return
                      updatePreferences({ theme: { mode: value as ThemeOption } })
                    }}
                    disabled={isLoading}
                  >
                    {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                      <ToggleGroupItem
                        key={value}
                        value={value}
                        className="flex flex-1 items-center gap-2 px-3 py-2"
                      >
                        <Icon className="size-4" aria-hidden />
                        <span className="text-sm font-medium">{label}</span>
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  <p className="text-xs text-muted-foreground">
                    {isSaving ? "Сохраняем изменения…" : `Последнее обновление: ${lastUpdatedLabel}`}
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="flex items-center gap-2">
                  <LaptopIcon className="size-4" aria-hidden />
                  <div>
                    <CardTitle className="text-base">Интерфейс</CardTitle>
                    <CardDescription>Настройте отображение боковой панели и уведомлений.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <PreferenceToggle
                    title="Всегда показывать боковую панель"
                    description="Выключите, чтобы на широких экранах sidebar сворачивался до иконок."
                    checked={!preferences.sidebar.collapsed}
                    onCheckedChange={(next) =>
                      updatePreferences({ sidebar: { collapsed: !next } })
                    }
                    disabled={isLoading}
                  />
                  <PreferenceToggle
                    title="Звуковые уведомления"
                    description="Воспроизводить звук при входящих звонках и новых сообщениях."
                    checked={preferences.notifications.playSounds}
                    onCheckedChange={(next) =>
                      updatePreferences({ notifications: { playSounds: next } })
                    }
                    disabled={isLoading}
                  />
                  <PreferenceToggle
                    title="Показывать всплывающие уведомления"
                    description="Отображать toast-уведомления о событиях внутри приложения."
                    checked={preferences.notifications.showToasts}
                    onCheckedChange={(next) =>
                      updatePreferences({ notifications: { showToasts: next } })
                    }
                    disabled={isLoading}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>

        <aside className="hidden flex-col gap-6 xl:flex" aria-label="Советы по безопасности">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Синхронизация настроек</CardTitle>
              <CardDescription>
                Тема, уведомления и поведение интерфейса сохраняются в user_preferences и локальном кеше.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Для гостей настройки остаются в браузере. После входа данные автоматически объединяются с сервером.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

interface PreferenceToggleProps {
  title: string
  description: string
  checked: boolean
  onCheckedChange: (value: boolean) => void
  disabled?: boolean
}

function PreferenceToggle({ title, description, checked, onCheckedChange, disabled }: PreferenceToggleProps) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2">
      <div className="space-y-1">
        <p className="text-sm font-medium leading-snug">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  )
}

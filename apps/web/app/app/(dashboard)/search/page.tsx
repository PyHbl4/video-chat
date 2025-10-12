"use client"

import { useState, type ChangeEvent } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Tabs, TabsContent, TabsList, TabsTrigger } from "@video-chat/ui"
import { FilesIcon, SearchIcon, UsersIcon } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"
import { AppPageHeader } from "@/components/app/page-header"

export default function SearchPage() {
  const [query, setQuery] = useState("")

  return (
    <div className="space-y-6">
      <AppPageHeader
        title="Поиск"
        description="Ищите пользователей, чаты и файлы. Умные результаты появятся позже."
      />

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <section className="space-y-6" aria-label="Фильтры поиска">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Шаблоны запросов</CardTitle>
              <CardDescription>Попробуйте искать по имени, статусу или участникам звонка.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-lg bg-muted/50 px-3 py-2">status:online</div>
              <div className="rounded-lg bg-muted/50 px-3 py-2">room:daily-sync</div>
              <div className="rounded-lg bg-muted/50 px-3 py-2">user:@alex</div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6" aria-label="Результаты поиска">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Поисковый запрос</CardTitle>
              <CardDescription>Уточните запрос, чтобы подготовить данные для будущего API.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  value={query}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
                  placeholder="Например, @username или room:daily-sync"
                  className="pl-9"
                />
              </div>
              <Tabs defaultValue="users" className="space-y-4">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="users">Пользователи</TabsTrigger>
                  <TabsTrigger value="chats">Чаты</TabsTrigger>
                  <TabsTrigger value="files">Файлы</TabsTrigger>
                </TabsList>
                <TabsContent value="users" className="space-y-4">
                  <EmptyState
                    icon={UsersIcon}
                    title="Пока нет результатов"
                    description="Поиск заработает, как только мы подключим API. Сейчас запрос сохраняется локально."
                    action={{ label: "Отправить запрос", disabled: true }}
                  />
                </TabsContent>
                <TabsContent value="chats" className="space-y-4">
                  <EmptyState
                    icon={UsersIcon}
                    title="Чаты не найдены"
                    description="Мы добавим подсказки по популярным каналам и истории сообщений."
                  />
                </TabsContent>
                <TabsContent value="files" className="space-y-4">
                  <EmptyState
                    icon={FilesIcon}
                    title="Файлы появятся позже"
                    description="Здесь будут документы, записи звонков и расшифровки."
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </section>

        <aside className="hidden flex-col gap-6 xl:flex" aria-label="История запросов">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">История запросов</CardTitle>
              <CardDescription>Мы сохраним последние запросы и позволим закреплять избранные.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="rounded-lg bg-muted/40 px-3 py-2">call:design-review</div>
              <div className="rounded-lg bg-muted/40 px-3 py-2">user:@maria</div>
              <div className="rounded-lg bg-muted/40 px-3 py-2">status:offline</div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@video-chat/ui"
import { SearchIcon } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { AdminPageHeader } from "@/components/page-header"

export default function AdminSearchPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Глобальный поиск"
        description="Ищите пользователей, комнаты и события"
      />

      <Card className="shadow-sm">
        <CardHeader className="flex items-center gap-3">
          <SearchIcon className="size-5 text-primary" aria-hidden />
          <div>
            <CardTitle className="text-base">Поисковая выдача</CardTitle>
            <CardDescription>Поиск станет доступен после подключения индекса.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={SearchIcon}
            title="Нужна интеграция"
            description="Подключите поиск в админке, чтобы просматривать активность и логи."
            action={{ label: "Настроить поиск", disabled: true }}
          />
        </CardContent>
      </Card>
    </div>
  )
}

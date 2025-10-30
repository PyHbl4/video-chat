"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { PhoneIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

const TITLES: Record<string, string> = {
  "/app/friends": "Друзья",
  "/app/rooms": "Комнаты",
  "/app/inbox": "Входящие",
  "/app/settings": "Настройки",
  "/app/profile": "Профиль"
}

export function Topbar() {
  const pathname = usePathname()

  const title = React.useMemo(() => {
    if (!pathname) {
      return "ownSpace"
    }

    if (pathname.startsWith("/app/calls")) {
      return "Звонок"
    }

    return TITLES[pathname] ?? "ownSpace"
  }, [pathname])

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-background/80 px-4 backdrop-blur md:px-8">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Раздел</p>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button asChild size="sm" variant="outline" className="hidden md:inline-flex">
          <Link href="/app/rooms">
            <PlusIcon className="mr-2 h-4 w-4" />Создать комнату
          </Link>
        </Button>
        <Button asChild size="sm" className="inline-flex">
          <Link href="/app/calls/alpha">
            <PhoneIcon className="mr-2 h-4 w-4" />Начать звонок
          </Link>
        </Button>
      </div>
    </header>
  )
}

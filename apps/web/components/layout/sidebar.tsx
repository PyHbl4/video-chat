"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import clsx from "clsx"
import {
  LogOutIcon,
  MessageSquareIcon,
  SettingsIcon,
  SunIcon,
  MoonIcon,
  UserRoundIcon,
  UsersIcon,
  VideoIcon
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

const navigation = [
  { href: "/app/friends", label: "Друзья", icon: UsersIcon },
  { href: "/app/rooms", label: "Комнаты", icon: VideoIcon },
  { href: "/app/inbox", label: "Входящие", icon: MessageSquareIcon },
  { href: "/app/settings", label: "Настройки", icon: SettingsIcon },
  { href: "/app/profile", label: "Профиль", icon: UserRoundIcon }
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = resolvedTheme === "dark"
  const toggleLabel = mounted
    ? isDark
      ? "Включить светлую тему"
      : "Включить тёмную тему"
    : "Переключить тему"
  const ThemeIcon = !mounted ? MoonIcon : isDark ? SunIcon : MoonIcon

  return ( 
    <aside className="hidden w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center justify-between px-6 text-xl font-semibold">
        <Link href="/app/friends" className="transition hover:opacity-80">
          ownSpace
        </Link>
        <Button
          variant="ghost"
          size="icon"
          aria-label={toggleLabel}
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="text-sidebar-foreground hover:text-sidebar-accent-foreground"
          disabled={!mounted}
        >
          <ThemeIcon className="h-5 w-5" />
        </Button>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <Separator className="mx-4" />
      <div className="px-4 py-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={() => router.push("/auth/login")}
        >
          <LogOutIcon className="h-4 w-4" />
          Выйти
        </Button>
        <p className="mt-2 text-xs text-sidebar-foreground/70">
          Для второй итерации здесь появится интеграция с аккаунтом.
        </p>
      </div>
    </aside>
  )
}

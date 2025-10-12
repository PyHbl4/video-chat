"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo } from "react"

import {
  Avatar,
  AvatarFallback,
  Button,
  Input,
  Kbd,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  cn
} from "@video-chat/ui"
import type { SessionSnapshot } from "@video-chat/web-auth"
import { BarChart2Icon, LifeBuoyIcon, SearchIcon } from "lucide-react"
import { toast } from "sonner"

import { ADMIN_NAVIGATION } from "@/components/navigation"
import { LogoutButton } from "@/components/auth/logout-button"

export interface AdminShellProps {
  user: SessionSnapshot["user"]
  children: React.ReactNode
}

export function AdminShell({ user, children }: AdminShellProps) {
  const router = useRouter()
  const pathname = usePathname()

  const shortcuts = useMemo(() => {
    return Object.fromEntries(
      ADMIN_NAVIGATION.map((item) => [`meta+${item.shortcut}`, item.href]).concat(
        ADMIN_NAVIGATION.map((item) => [`ctrl+${item.shortcut}`, item.href])
      )
    )
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return
      const key = event.key.toLowerCase()
      const prefix = event.metaKey ? "meta" : event.ctrlKey ? "ctrl" : null
      if (!prefix || event.altKey) {
        return
      }
      const target = shortcuts[`${prefix}+${key}`]
      if (!target) {
        return
      }

      event.preventDefault()
      router.push(`/admin${target}`)
      const current = ADMIN_NAVIGATION.find((item) => item.href === target)
      if (current) {
        toast("Переключение раздела", {
          description: `Вы открыли «${current.title}»`
        })
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [router, shortcuts])

  return (
    <SidebarProvider>
      <div className="relative flex min-h-screen w-full bg-muted/10">
        <AdminDesktopSidebar pathname={pathname} user={user} />
        <SidebarInset className="flex flex-1 flex-col">
          <AdminTopBar user={user} onOpenSearch={() => router.push("/admin/search")} />
          <main className="flex-1 space-y-6 px-4 pb-24 pt-6 transition-colors duration-200 md:px-6 md:pb-10 lg:px-8">
            {children}
          </main>
          <AdminMobileNav pathname={pathname} />
          <div aria-live="polite" className="sr-only">
            Комбинации клавиш: ⌘/Ctrl + 1 — Обзор, 2 — Пользователи, 3 — Звонки, 4 — Политики, 5 — Настройки.
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

interface AdminDesktopSidebarProps {
  pathname: string
  user: SessionSnapshot["user"] | null
}

function AdminDesktopSidebar({ pathname, user }: AdminDesktopSidebarProps) {
  const sectionLabels = {
    overview: "Мониторинг",
    operations: "Операционные разделы"
  } as const

  const sections = Object.entries(sectionLabels) as [keyof typeof sectionLabels, string][]

  return (
    <Sidebar variant="inset" className="border-r bg-background">
      <SidebarHeader className="gap-4 border-b p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 rounded-xl border bg-card/60 px-3 py-2 shadow-sm">
            <Avatar className="size-9 border">
              <AvatarFallback>{user?.username?.slice(0, 2).toUpperCase() ?? "AD"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium leading-tight">
                {user?.displayName ?? user?.username ?? "Администратор"}
              </p>
              {user?.email ? (
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              ) : null}
            </div>
          </div>
          <SidebarTrigger className="md:hidden" aria-label="Открыть меню" />
        </div>
      </SidebarHeader>
      <SidebarContent className="space-y-4 px-2 py-3">
        {sections.map(([section, label]) => {
          const items = ADMIN_NAVIGATION.filter((item) => item.section === section)
          if (!items.length) return null

          return (
            <SidebarGroup key={section}>
              <SidebarGroupLabel>{label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const href = `/admin${item.href}`
                    const isActive = pathname === href || pathname.startsWith(`${href}/`)
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link href={href} className="flex items-center gap-3">
                            <item.icon className="size-4" aria-hidden />
                            <span className="flex-1 truncate">{item.title}</span>
                            <Kbd className="hidden text-xs font-normal text-muted-foreground lg:flex">{item.shortcut}</Kbd>
                          </Link>
                        </SidebarMenuButton>
                        {item.status ? (
                          <SidebarMenuBadge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100">
                            {item.status === "beta" ? "Beta" : "New"}
                          </SidebarMenuBadge>
                        ) : null}
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>
      <SidebarFooter className="mt-auto gap-3 border-t p-4">
        <Button variant="secondary" className="w-full gap-2" disabled>
          <BarChart2Icon className="size-4" aria-hidden />
          Экспорт отчёта
        </Button>
        <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <LifeBuoyIcon className="size-4" aria-hidden />
            Поддержка
          </span>
          <span className="font-medium">⌘ + /</span>
        </div>
        <LogoutButton className="w-full" />
      </SidebarFooter>
      <SidebarSeparator className="md:hidden" />
    </Sidebar>
  )
}

interface AdminTopBarProps {
  user: SessionSnapshot["user"] | null
  onOpenSearch: () => void
}

function AdminTopBar({ user, onOpenSearch }: AdminTopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="flex flex-col gap-4 px-4 py-4 transition-colors duration-200 md:flex-row md:items-center md:justify-between md:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="hidden md:inline-flex" aria-label="Свернуть меню" />
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Self-Hosted Video Chat</p>
            <h2 className="text-lg font-semibold leading-tight">Админ-панель</h2>
          </div>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <div className="relative w-full sm:w-72">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              placeholder="Искать пользователей и звонки"
              className="cursor-pointer pl-9"
              role="combobox"
              onFocus={onOpenSearch}
              readOnly
            />
          </div>
          <Avatar className="size-9 border">
            <AvatarFallback>{user?.username?.slice(0, 2).toUpperCase() ?? "AD"}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}

interface AdminMobileNavProps {
  pathname: string
}

function AdminMobileNav({ pathname }: AdminMobileNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-2 py-2 shadow-xl backdrop-blur md:hidden">
      <div className="grid grid-cols-3 gap-2">
        {ADMIN_NAVIGATION.filter((item) => ["/dashboard", "/users", "/calls"].includes(item.href)).map((item) => {
          const href = `/admin${item.href}`
          const isActive = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition-colors",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/60"
              )}
            >
              <item.icon className="size-5" aria-hidden />
              <span>{item.title}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

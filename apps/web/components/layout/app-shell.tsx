"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useRef } from "react"

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
  SidebarRail,
  SidebarTrigger,
  cn
} from "@video-chat/ui"
import type { SessionSnapshot } from "@video-chat/web-auth"
import { CalendarPlusIcon, MessageSquarePlusIcon, SearchIcon } from "lucide-react"
import { toast } from "sonner"

import { AppUserProvider } from "@/components/app/app-user-context"
import type { MainNavItem } from "@/components/app/navigation"
import { MAIN_NAV } from "@/components/app/navigation"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { LogoutButton } from "@/components/auth/logout-button"
import { useUIStore } from "@/stores/ui-store"

export interface AppShellProps {
  user: SessionSnapshot["user"]
  children: React.ReactNode
}

export function AppShell({ user, children }: AppShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const inboxCount = useUIStore((state) => state.inboxCount)
  const missedCalls = useUIStore((state) => state.missedCalls)

  const shortcutMap = useMemo(() => {
    return new Map(
      MAIN_NAV.filter((item) => item.shortcut).map((item) => [
        item.shortcut.toLowerCase(),
        item
      ])
    )
  }, [])

  const awaitingSecondKeyRef = useRef(false)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) {
        return
      }

      const key = event.key.toLowerCase()

      if (event.metaKey || event.ctrlKey || event.altKey) {
        awaitingSecondKeyRef.current = false
        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
        return
      }

      if (!awaitingSecondKeyRef.current) {
        if (key === "g") {
          awaitingSecondKeyRef.current = true
          if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current)
          }
          timeoutRef.current = window.setTimeout(() => {
            awaitingSecondKeyRef.current = false
            timeoutRef.current = null
          }, 1200)
        }
        return
      }

      awaitingSecondKeyRef.current = false
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      const targetItem = shortcutMap.get(key)
      if (!targetItem) {
        return
      }

      event.preventDefault()
      router.push(targetItem.href)
      toast("Переключение", {
        description: `Вы перешли в раздел «${targetItem.label}»`
      })
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [router, shortcutMap])

  const currentNav = useMemo(() => {
    return MAIN_NAV.find((item) => pathname.startsWith(item.href))
  }, [pathname])

  const getBadgeValue = (item: MainNavItem) => {
    if (item.badgeKey === "inboxCount") {
      return inboxCount
    }
    if (item.badgeKey === "missedCalls") {
      return missedCalls
    }
    return 0
  }

  return (
    <AppUserProvider user={user}>
      <SidebarProvider>
        <div className="relative flex min-h-screen w-full bg-muted/10">
          <AppSidebar pathname={pathname} user={user} getBadgeValue={getBadgeValue} />
          <SidebarInset className="flex flex-1 flex-col">
            <AppTopBar
              user={user}
              currentNav={currentNav}
              pathname={pathname}
              getBadgeValue={getBadgeValue}
              onOpenSearch={() => router.push("/app/search")}
            />
            <main className="flex-1 space-y-6 px-4 pb-24 pt-6 transition-colors duration-200 md:px-6 md:pb-10 lg:px-8">
              {children}
            </main>
            <AppMobileNav pathname={pathname} getBadgeValue={getBadgeValue} />
            <div aria-live="polite" className="sr-only">
              Доступные сочетания клавиш: G затем F — Друзья, G затем C — Чаты, G затем L — Звонки,
              G затем I — Входящие, G затем S — Настройки, G затем K — Поиск.
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AppUserProvider>
  )
}

interface AppSidebarProps {
  pathname: string
  user: SessionSnapshot["user"]
  getBadgeValue: (item: MainNavItem) => number
}

function AppSidebar({ pathname, user, getBadgeValue }: AppSidebarProps) {
  return (
    <Sidebar
      variant="sidebar"
      collapsible="icon"
      className="border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75"
    >
      <SidebarHeader className="border-b px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              ownSpace
            </p>
            <p className="text-sm font-semibold leading-tight">Self-Hosted Video Chat</p>
          </div>
          <SidebarTrigger className="md:hidden" aria-label="Открыть меню" />
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wide text-muted-foreground">
            Навигация
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {MAIN_NAV.map((item) => {
                const isActive = pathname.startsWith(item.href)
                const badgeValue = getBadgeValue(item)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={`G затем ${item.shortcut}`}
                    >
                      <Link href={item.href} className="flex items-center gap-3">
                        <item.icon className="size-4" aria-hidden />
                        <span className="flex-1 truncate">{item.label}</span>
                        <div className="hidden items-center gap-1 text-[11px] text-muted-foreground lg:flex">
                          <Kbd className="px-1 py-0.5 text-[10px]">G</Kbd>
                          <Kbd className="px-1 py-0.5 text-[10px]">{item.shortcut}</Kbd>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                    {badgeValue > 0 ? (
                      <SidebarMenuBadge className="bg-primary/15 text-primary">
                        {badgeValue > 99 ? "99+" : badgeValue}
                      </SidebarMenuBadge>
                    ) : item.status ? (
                      <SidebarMenuBadge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                        {item.status === "beta" ? "Beta" : "New"}
                      </SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="mt-auto gap-4 border-t px-4 py-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-9 border">
            <AvatarFallback>{user?.username?.slice(0, 2).toUpperCase() ?? "??"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-tight">
              {user?.displayName ?? user?.username ?? "Аноним"}
            </p>
            {user?.email ? (
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <ThemeToggle />
          <LogoutButton className="justify-start" />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

interface AppTopBarProps {
  user: SessionSnapshot["user"]
  currentNav: MainNavItem | undefined
  pathname: string
  getBadgeValue: (item: MainNavItem) => number
  onOpenSearch: () => void
}

function AppTopBar({ user, currentNav, pathname, getBadgeValue, onOpenSearch }: AppTopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="flex flex-col gap-4 px-4 py-4 transition-colors duration-200 md:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3 md:items-center">
            <SidebarTrigger className="md:hidden" aria-label="Открыть меню" />
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Раздел
              </p>
              <h2 className="text-lg font-semibold leading-tight">
                {currentNav?.label ?? "Приложение"}
              </h2>
              {currentNav?.description ? (
                <p className="hidden text-sm text-muted-foreground sm:block">
                  {currentNav.description}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="relative w-full sm:w-72">
              <SearchIcon
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                placeholder="Искать людей, чаты и файлы"
                className="cursor-pointer pl-9"
                role="combobox"
                onFocus={onOpenSearch}
                onClick={onOpenSearch}
                readOnly
              />
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button className="gap-2 shadow-sm" variant="outline" disabled>
                <MessageSquarePlusIcon className="size-4" aria-hidden />
                Новый чат
              </Button>
              <Button className="gap-2 shadow-sm" variant="default" disabled>
                <CalendarPlusIcon className="size-4" aria-hidden />
                Запланировать звонок
              </Button>
            </div>
            <Avatar className="size-9 border">
              <AvatarFallback>{user?.username?.slice(0, 2).toUpperCase() ?? "??"}</AvatarFallback>
            </Avatar>
          </div>
        </div>
        <AppMainMenu pathname={pathname} getBadgeValue={getBadgeValue} />
      </div>
    </header>
  )
}

interface AppMobileNavProps {
  pathname: string
  getBadgeValue: (item: MainNavItem) => number
}

function AppMobileNav({ pathname, getBadgeValue }: AppMobileNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-2 py-2 shadow-xl backdrop-blur md:hidden">
      <div className="grid grid-cols-5 gap-2">
        {MAIN_NAV.filter((item) => item.mobile).map((item) => {
          const isActive = pathname.startsWith(item.href)
          const badgeValue = getBadgeValue(item)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition-colors",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/60"
              )}
            >
              <item.icon className="size-5" aria-hidden />
              <span>{item.label}</span>
              {badgeValue > 0 ? (
                <span className="absolute right-2 top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  {badgeValue > 99 ? "99+" : badgeValue}
                </span>
              ) : null}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

interface AppMainMenuProps {
  pathname: string
  getBadgeValue: (item: MainNavItem) => number
}

function AppMainMenu({ pathname, getBadgeValue }: AppMainMenuProps) {
  return (
    <nav
      className="hidden items-center gap-1 overflow-x-auto pb-1 md:flex"
      aria-label="Основное меню"
    >
      {MAIN_NAV.map((item) => {
        const isActive = pathname.startsWith(item.href)
        const badgeValue = getBadgeValue(item)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group relative flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <span>{item.label}</span>
            {badgeValue > 0 ? (
              <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary-foreground/20 px-1 text-[11px] font-semibold text-primary-foreground">
                {badgeValue > 99 ? "99+" : badgeValue}
              </span>
            ) : item.status ? (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-100">
                {item.status === "beta" ? "Beta" : "New"}
              </span>
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}

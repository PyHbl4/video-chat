import type { LucideIcon } from "lucide-react"
import { ActivityIcon, NetworkIcon, SettingsIcon, ShieldCheckIcon, UsersIcon } from "lucide-react"

export type AdminNavigationSection = "overview" | "operations"

export interface AdminNavigationItem {
  title: string
  description: string
  href: string
  icon: LucideIcon
  section: AdminNavigationSection
  shortcut: string
  status?: "beta" | "new"
}

export const ADMIN_NAVIGATION: AdminNavigationItem[] = [
  {
    title: "Обзор",
    description: "Ключевые показатели и состояние платформы",
    href: "/dashboard",
    icon: ActivityIcon,
    section: "overview",
    shortcut: "1"
  },
  {
    title: "Пользователи",
    description: "Модерация, роли и статистика",
    href: "/users",
    icon: UsersIcon,
    section: "operations",
    shortcut: "2"
  },
  {
    title: "Звонки",
    description: "Мониторинг качества и комнат",
    href: "/calls",
    icon: NetworkIcon,
    section: "operations",
    shortcut: "3",
    status: "beta"
  },
  {
    title: "Политики",
    description: "Безопасность и управление доступом",
    href: "/policies",
    icon: ShieldCheckIcon,
    section: "operations",
    shortcut: "4"
  },
  {
    title: "Настройки",
    description: "Интеграции и параметры админ-панели",
    href: "/settings",
    icon: SettingsIcon,
    section: "overview",
    shortcut: "5"
  }
]

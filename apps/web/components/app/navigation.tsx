import type { LucideIcon } from "lucide-react"
import {
  BellRingIcon,
  MessageCircleIcon,
  PhoneCallIcon,
  SearchIcon,
  SettingsIcon,
  Users2Icon
} from "lucide-react"

export type AppNavigationSection = "communication" | "organization"

export interface AppNavigationItem {
  title: string
  description: string
  href: string
  icon: LucideIcon
  shortcut: string
  section: AppNavigationSection
  pinned?: boolean
  status?: "beta" | "new"
}

export const APP_NAVIGATION: AppNavigationItem[] = [
  {
    title: "Друзья",
    description: "Управление контактами и приглашениями",
    href: "/app/friends",
    icon: Users2Icon,
    shortcut: "P",
    section: "communication",
    pinned: true
  },
  {
    title: "Чаты",
    description: "Личные и групповые переписки",
    href: "/app/chats",
    icon: MessageCircleIcon,
    shortcut: "M",
    section: "communication",
    pinned: true
  },
  {
    title: "Звонки",
    description: "История и запланированные созвоны",
    href: "/app/calls",
    icon: PhoneCallIcon,
    shortcut: "V",
    section: "communication",
    pinned: true,
    status: "beta"
  },
  {
    title: "Входящие",
    description: "Уведомления и события в реальном времени",
    href: "/app/inbox",
    icon: BellRingIcon,
    shortcut: "E",
    section: "organization"
  },
  {
    title: "Поиск",
    description: "Глобальный поиск по пользователям и контенту",
    href: "/app/search",
    icon: SearchIcon,
    shortcut: "S",
    section: "organization",
    pinned: true
  },
  {
    title: "Настройки",
    description: "Профиль, устройства и конфиденциальность",
    href: "/app/settings",
    icon: SettingsIcon,
    shortcut: "A",
    section: "organization"
  }
]

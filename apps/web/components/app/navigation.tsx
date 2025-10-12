import type { LucideIcon } from "lucide-react"
import {
  BellRingIcon,
  MessageCircleIcon,
  PhoneCallIcon,
  SearchIcon,
  SettingsIcon,
  Users2Icon
} from "lucide-react"

export interface AppNavigationItem {
  title: string
  description: string
  href: string
  icon: LucideIcon
  shortcut: string
  status?: "beta" | "new"
}

export const APP_NAVIGATION: AppNavigationItem[] = [
  {
    title: "Друзья",
    description: "Управление контактами и приглашениями",
    href: "/app/friends",
    icon: Users2Icon,
    shortcut: "P"
  },
  {
    title: "Чаты",
    description: "Личные и групповые переписки",
    href: "/app/chats",
    icon: MessageCircleIcon,
    shortcut: "M"
  },
  {
    title: "Звонки",
    description: "История и запланированные созвоны",
    href: "/app/calls",
    icon: PhoneCallIcon,
    shortcut: "V",
    status: "beta"
  },
  {
    title: "Входящие",
    description: "Уведомления и события в реальном времени",
    href: "/app/inbox",
    icon: BellRingIcon,
    shortcut: "E"
  },
  {
    title: "Поиск",
    description: "Глобальный поиск по пользователям и контенту",
    href: "/app/search",
    icon: SearchIcon,
    shortcut: "S"
  },
  {
    title: "Настройки",
    description: "Профиль, устройства и конфиденциальность",
    href: "/app/settings",
    icon: SettingsIcon,
    shortcut: "A"
  }
]

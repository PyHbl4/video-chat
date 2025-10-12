import type { LucideIcon } from "lucide-react"
import {
  BellRingIcon,
  MessageCircleIcon,
  PhoneCallIcon,
  SearchIcon,
  SettingsIcon,
  Users2Icon
} from "lucide-react"

export type MainRoute = "friends" | "chats" | "calls" | "inbox" | "search" | "settings"

export type NavBadgeKey = "inboxCount" | "missedCalls"

export interface MainNavItem {
  key: MainRoute
  label: string
  description: string
  href: string
  icon: LucideIcon
  shortcut: string
  badgeKey?: NavBadgeKey
  status?: "beta" | "new"
  mobile?: boolean
}

export const MAIN_NAV: MainNavItem[] = [
  {
    key: "friends",
    label: "Друзья",
    description: "Управление контактами и приглашениями",
    href: "/app/friends",
    icon: Users2Icon,
    shortcut: "F",
    mobile: true
  },
  {
    key: "chats",
    label: "Чаты",
    description: "Личные и групповые переписки",
    href: "/app/chats",
    icon: MessageCircleIcon,
    shortcut: "C",
    mobile: true
  },
  {
    key: "calls",
    label: "Звонки",
    description: "История и запланированные созвоны",
    href: "/app/calls",
    icon: PhoneCallIcon,
    shortcut: "L",
    badgeKey: "missedCalls",
    status: "beta",
    mobile: true
  },
  {
    key: "inbox",
    label: "Входящие",
    description: "Уведомления и события в реальном времени",
    href: "/app/inbox",
    icon: BellRingIcon,
    shortcut: "I",
    badgeKey: "inboxCount",
    mobile: true
  },
  {
    key: "search",
    label: "Поиск",
    description: "Глобальный поиск по пользователям и контенту",
    href: "/app/search",
    icon: SearchIcon,
    shortcut: "K"
  },
  {
    key: "settings",
    label: "Настройки",
    description: "Профиль, устройства и конфиденциальность",
    href: "/app/settings",
    icon: SettingsIcon,
    shortcut: "S",
    mobile: true
  }
]

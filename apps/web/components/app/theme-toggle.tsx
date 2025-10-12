"use client"

import { useEffect, useMemo, useState } from "react"

import { Button } from "@video-chat/ui"
import { LaptopIcon, MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { useUserPreferences } from "@/components/providers/user-preferences-provider"

const THEME_ORDER = ["system", "light", "dark"] as const

type ThemeMode = (typeof THEME_ORDER)[number]

const ICONS: Record<ThemeMode, typeof SunIcon> = {
  system: LaptopIcon,
  light: SunIcon,
  dark: MoonIcon
}

const LABELS: Record<ThemeMode, string> = {
  system: "Системная",
  light: "Светлая",
  dark: "Тёмная"
}

export function ThemeToggle() {
  const { resolvedTheme } = useTheme()
  const { preferences, updatePreferences, isLoading } = useUserPreferences()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentMode: ThemeMode = useMemo(() => {
    if (!mounted) {
      return "system"
    }

    return (preferences.theme.mode as ThemeMode) ?? "system"
  }, [mounted, preferences.theme.mode])

  const displayMode: ThemeMode = useMemo(() => {
    if (!mounted) {
      return "system"
    }

    if (currentMode === "system") {
      return (resolvedTheme as ThemeMode) ?? "system"
    }

    return currentMode
  }, [currentMode, mounted, resolvedTheme])

  const Icon = ICONS[displayMode]

  const handleToggle = () => {
    const currentIndex = THEME_ORDER.indexOf(currentMode)
    const nextMode = THEME_ORDER[(currentIndex + 1) % THEME_ORDER.length]
    updatePreferences({ theme: { mode: nextMode } })
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      className="w-full justify-start gap-2 text-left font-medium"
      aria-label={`Переключить тему. Сейчас: ${LABELS[currentMode]}`}
      disabled={isLoading}
    >
      <Icon className="size-4" aria-hidden />
      <span>{mounted ? LABELS[currentMode] : "Тема"}</span>
    </Button>
  )
}

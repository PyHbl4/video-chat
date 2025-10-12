"use client"

import { useEffect, useMemo, useState } from "react"

import { Button } from "@video-chat/ui"
import { LaptopIcon, MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"

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
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentMode: ThemeMode = useMemo(() => {
    if (!mounted) {
      return "system"
    }

    if (theme === "system") {
      return "system"
    }

    return (theme as ThemeMode) ?? "system"
  }, [mounted, theme])

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
    setTheme(nextMode)
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      className="w-full justify-start gap-2 text-left font-medium"
      aria-label={`Переключить тему. Сейчас: ${LABELS[currentMode]}`}
    >
      <Icon className="size-4" aria-hidden />
      <span>{mounted ? LABELS[currentMode] : "Тема"}</span>
    </Button>
  )
}

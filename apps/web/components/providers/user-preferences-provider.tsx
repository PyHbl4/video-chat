"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react"

import type { UserPreferences, UserPreferencesUpdate } from "@video-chat/contracts"
import { SidebarProvider } from "@video-chat/ui"
import { useTheme } from "next-themes"

import { useAppUser } from "@/components/app/app-user-context"
import { useUsersApi } from "@/hooks/use-users-api"

const LOCAL_STORAGE_KEY = "ownspace.preferences.v1"

type PreferencesPatch = {
  theme?: Partial<UserPreferences["theme"]>
  sidebar?: Partial<UserPreferences["sidebar"]>
  audio?: Partial<UserPreferences["audio"]>
  video?: Partial<UserPreferences["video"]>
  notifications?: Partial<UserPreferences["notifications"]>
}

interface UserPreferencesContextValue {
  preferences: UserPreferences
  isLoading: boolean
  isSaving: boolean
  error: string | null
  updatePreferences: (patch: PreferencesPatch) => void
}

const UserPreferencesContext = createContext<UserPreferencesContextValue | undefined>(
  undefined
)

function createDefaultPreferences(): UserPreferences {
  return {
    theme: { mode: "system" },
    sidebar: { collapsed: false },
    audio: { muteMicrophoneOnJoin: false },
    video: { startWithCamera: true, mirrorVideo: true },
    notifications: { playSounds: true, showToasts: true },
    updatedAt: new Date(0).toISOString()
  }
}

function mergePreferences(base: UserPreferences, patch: PreferencesPatch): UserPreferences {
  return {
    ...base,
    theme: patch.theme ? { ...base.theme, ...patch.theme } : base.theme,
    sidebar: patch.sidebar ? { ...base.sidebar, ...patch.sidebar } : base.sidebar,
    audio: patch.audio ? { ...base.audio, ...patch.audio } : base.audio,
    video: patch.video ? { ...base.video, ...patch.video } : base.video,
    notifications: patch.notifications
      ? { ...base.notifications, ...patch.notifications }
      : base.notifications
  }
}

function mergePatch(target: PreferencesPatch | null, patch: PreferencesPatch): PreferencesPatch {
  if (!target) {
    return { ...patch }
  }

  return {
    theme: patch.theme ? { ...(target.theme ?? {}), ...patch.theme } : target.theme,
    sidebar: patch.sidebar
      ? { ...(target.sidebar ?? {}), ...patch.sidebar }
      : target.sidebar,
    audio: patch.audio ? { ...(target.audio ?? {}), ...patch.audio } : target.audio,
    video: patch.video ? { ...(target.video ?? {}), ...patch.video } : target.video,
    notifications: patch.notifications
      ? { ...(target.notifications ?? {}), ...patch.notifications }
      : target.notifications
  }
}

function patchToUpdate(patch: PreferencesPatch): UserPreferencesUpdate {
  const update: UserPreferencesUpdate = {}

  if (patch.theme) {
    update.theme = { ...patch.theme }
  }
  if (patch.sidebar) {
    update.sidebar = { ...patch.sidebar }
  }
  if (patch.audio) {
    update.audio = { ...patch.audio }
  }
  if (patch.video) {
    update.video = { ...patch.video }
  }
  if (patch.notifications) {
    update.notifications = { ...patch.notifications }
  }

  return update
}

function hasPatchChanges(base: UserPreferences, patch: PreferencesPatch): boolean {
  if (patch.theme) {
    for (const [key, value] of Object.entries(patch.theme)) {
      if (value !== undefined && base.theme[key as keyof typeof base.theme] !== value) {
        return true
      }
    }
  }

  if (patch.sidebar) {
    for (const [key, value] of Object.entries(patch.sidebar)) {
      if (
        value !== undefined &&
        base.sidebar[key as keyof typeof base.sidebar] !== value
      ) {
        return true
      }
    }
  }

  if (patch.audio) {
    for (const [key, value] of Object.entries(patch.audio)) {
      if (value !== undefined && base.audio[key as keyof typeof base.audio] !== value) {
        return true
      }
    }
  }

  if (patch.video) {
    for (const [key, value] of Object.entries(patch.video)) {
      if (value !== undefined && base.video[key as keyof typeof base.video] !== value) {
        return true
      }
    }
  }

  if (patch.notifications) {
    for (const [key, value] of Object.entries(patch.notifications)) {
      if (
        value !== undefined &&
        base.notifications[key as keyof typeof base.notifications] !== value
      ) {
        return true
      }
    }
  }

  return false
}

function readStoredPreferences(): UserPreferences | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<UserPreferences>
    if (!parsed || typeof parsed !== "object") {
      return null
    }

    const base = createDefaultPreferences()
    const merged = mergePreferences(base, {
      theme: parsed.theme,
      sidebar: parsed.sidebar,
      audio: parsed.audio,
      video: parsed.video,
      notifications: parsed.notifications
    })
    if (typeof parsed.updatedAt === "string") {
      merged.updatedAt = parsed.updatedAt
    }

    return merged
  } catch (error) {
    console.warn("Не удалось прочитать пользовательские настройки из localStorage", error)
    return null
  }
}

function storePreferences(preferences: UserPreferences) {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(preferences))
  } catch (error) {
    console.warn("Не удалось сохранить пользовательские настройки", error)
  }
}

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const { setTheme } = useTheme()
  const user = useAppUser()
  const usersApi = useUsersApi()

  const [preferences, setPreferences] = useState<UserPreferences>(createDefaultPreferences)
  const preferencesRef = useRef(preferences)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  const pendingPatchRef = useRef<PreferencesPatch | null>(null)
  const flushTimeoutRef = useRef<number | undefined>()
  const serverSyncedAtRef = useRef<string | null>(null)

  useEffect(() => {
    preferencesRef.current = preferences
  }, [preferences])

  useEffect(() => {
    if (!isInitialized) {
      return
    }
    storePreferences(preferences)
  }, [preferences, isInitialized])

  useEffect(() => {
    setTheme(preferences.theme.mode)
  }, [preferences.theme.mode, setTheme])

  const flushPending = useCallback(async () => {
    const patch = pendingPatchRef.current
    if (!patch) {
      return
    }

    pendingPatchRef.current = null

    if (!user?.id) {
      return
    }

    setIsSaving(true)
    try {
      const updateBody: UserPreferencesUpdate = {
        updatedAt: serverSyncedAtRef.current ?? preferencesRef.current.updatedAt,
        ...patchToUpdate(patch)
      }
      const { data } = await usersApi.updatePreferences(updateBody)
      serverSyncedAtRef.current = data.updatedAt
      setPreferences(data)
      setError(null)
    } catch (updateError) {
      console.error("Не удалось сохранить настройки", updateError)
      setError("Не удалось сохранить настройки")
      pendingPatchRef.current = mergePatch(pendingPatchRef.current, patch)
      flushTimeoutRef.current = window.setTimeout(() => {
        flushPending().catch(() => {
          /* swallow, ошибка уже залогирована выше */
        })
      }, 2000)
    } finally {
      setIsSaving(false)
    }
  }, [user?.id, usersApi])

  const scheduleFlush = useCallback(() => {
    if (flushTimeoutRef.current) {
      window.clearTimeout(flushTimeoutRef.current)
    }

    flushTimeoutRef.current = window.setTimeout(() => {
      flushPending().catch(() => {
        /* Ошибка обработана в flushPending */
      })
    }, 500)
  }, [flushPending])

  const updatePreferences = useCallback(
    (patch: PreferencesPatch) => {
      if (!hasPatchChanges(preferencesRef.current, patch)) {
        return
      }

      setPreferences((prev) => {
        const merged = mergePreferences(prev, patch)
        return { ...merged, updatedAt: new Date().toISOString() }
      })

      pendingPatchRef.current = mergePatch(pendingPatchRef.current, patch)
      scheduleFlush()
    },
    [scheduleFlush]
  )

  useEffect(() => {
    let cancelled = false

    async function run() {
      setIsLoading(true)
      setError(null)

      if (flushTimeoutRef.current) {
        window.clearTimeout(flushTimeoutRef.current)
        flushTimeoutRef.current = undefined
      }
      pendingPatchRef.current = null

      const stored = readStoredPreferences()

      if (!user?.id) {
        const initial = stored ?? createDefaultPreferences()
        serverSyncedAtRef.current = stored?.updatedAt ?? null
        if (!cancelled) {
          setPreferences(initial)
          setIsInitialized(true)
          setIsLoading(false)
        }
        return
      }

      try {
        const { data } = await usersApi.getPreferences()
        if (cancelled) {
          return
        }

        let resolved = data
        serverSyncedAtRef.current = data.updatedAt

        if (stored) {
          const storedTime = Date.parse(stored.updatedAt)
          const serverTime = Date.parse(data.updatedAt)

          if (!Number.isNaN(storedTime) && !Number.isNaN(serverTime) && storedTime > serverTime) {
            try {
              const { data: merged } = await usersApi.updatePreferences({
                updatedAt: data.updatedAt,
                theme: stored.theme,
                sidebar: stored.sidebar,
                audio: stored.audio,
                video: stored.video,
                notifications: stored.notifications
              })
              resolved = merged
              serverSyncedAtRef.current = merged.updatedAt
            } catch (syncError) {
              console.warn("Не удалось синхронизировать локальные настройки", syncError)
              resolved = mergePreferences(data, {
                theme: stored.theme,
                sidebar: stored.sidebar,
                audio: stored.audio,
                video: stored.video,
                notifications: stored.notifications
              })
              resolved.updatedAt = data.updatedAt
            }
          }
        }

        setPreferences(resolved)
        setIsInitialized(true)
        setError(null)
      } catch (loadError) {
        console.error("Не удалось загрузить настройки", loadError)
        const fallback = stored ?? createDefaultPreferences()
        serverSyncedAtRef.current = stored?.updatedAt ?? null
        setPreferences(fallback)
        setIsInitialized(true)
        setError("Не удалось загрузить настройки")
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [user?.id, usersApi])

  useEffect(() => {
    return () => {
      if (flushTimeoutRef.current) {
        window.clearTimeout(flushTimeoutRef.current)
      }
    }
  }, [])

  const handleSidebarOpenChange = useCallback(
    (open: boolean) => {
      updatePreferences({ sidebar: { collapsed: !open } })
    },
    [updatePreferences]
  )

  const value = useMemo<UserPreferencesContextValue>(
    () => ({
      preferences,
      isLoading,
      isSaving,
      error,
      updatePreferences
    }),
    [preferences, isLoading, isSaving, error, updatePreferences]
  )

  return (
    <UserPreferencesContext.Provider value={value}>
      <SidebarProvider
        defaultOpen={!preferences.sidebar.collapsed}
        open={!preferences.sidebar.collapsed}
        onOpenChange={handleSidebarOpenChange}
      >
        {children}
      </SidebarProvider>
    </UserPreferencesContext.Provider>
  )
}

export function useUserPreferences(): UserPreferencesContextValue {
  const context = useContext(UserPreferencesContext)

  if (context === undefined) {
    throw new Error("useUserPreferences должен использоваться внутри UserPreferencesProvider")
  }

  return context
}

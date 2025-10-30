"use client"

import * as React from "react"

import type { SettingsSnapshot } from "@/lib/types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export function SettingsForm({ initialSettings }: { initialSettings: SettingsSnapshot }) {
  const [vdsAddress, setVdsAddress] = React.useState(initialSettings.vdsAddress ?? "")
  const [signalingKey, setSignalingKey] = React.useState(initialSettings.signalingKey ?? "")
  const [theme, setTheme] = React.useState(initialSettings.theme === "dark")
  const [status, setStatus] = React.useState<string | null>(null)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus("Настройки сохранены (мок). Интеграция появится позже.")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Подключение VDS</CardTitle>
          <CardDescription>Укажите адрес узла и ключ доступа для сигналинга.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vds-address">Адрес VDS</Label>
            <Input
              id="vds-address"
              placeholder="https://"
              value={vdsAddress}
              onChange={(event) => setVdsAddress(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signaling-key">API-ключ сигнального сервера</Label>
            <Input
              id="signaling-key"
              placeholder="ownspace-key"
              value={signalingKey}
              onChange={(event) => setSignalingKey(event.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit">Сохранить</Button>
        </CardFooter>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Тема интерфейса</CardTitle>
          <CardDescription>Переключите тему между светлой и тёмной версиями.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Тёмная тема</p>
            <p className="text-xs text-muted-foreground">
              Текущее состояние: {theme ? "включена" : "выключена"}.
            </p>
          </div>
          <Switch checked={theme} onCheckedChange={setTheme} aria-label="Переключить тёмную тему" />
        </CardContent>
      </Card>

      {status ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{status}</p>
      ) : null}
    </form>
  )
}

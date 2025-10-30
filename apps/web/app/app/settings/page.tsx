import { getSettings } from "@/lib/api/settings"

import { SettingsForm } from "./settings-form"

export default async function SettingsPage() {
  const settings = await getSettings()

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Настройки</h2>
        <p className="text-muted-foreground">
          Управляйте подключением VDS, темой интерфейса и ключами доступа.
        </p>
      </header>
      <SettingsForm initialSettings={settings} />
    </section>
  )
}

export interface SettingsSnapshot {
  vdsAddress?: string
  signalingKey?: string
  theme?: "light" | "dark" | "system"
}

const SETTINGS: SettingsSnapshot = {
  vdsAddress: "https://ownspace-node.local:3478",
  signalingKey: "ownspace-demo-key",
  theme: "system"
}

export async function getSettings(): Promise<SettingsSnapshot> {
  return SETTINGS
}

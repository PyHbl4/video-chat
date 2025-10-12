import { create } from "zustand"

export interface UIState {
  inboxCount: number
  missedCalls: number
  setInboxCount: (value: number) => void
  setMissedCalls: (value: number) => void
}

export const useUIStore = create<UIState>((set) => ({
  inboxCount: 0,
  missedCalls: 0,
  setInboxCount: (value) => set({ inboxCount: value }),
  setMissedCalls: (value) => set({ missedCalls: value })
}))

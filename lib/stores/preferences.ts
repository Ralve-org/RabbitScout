import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PreferencesState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: 'rabbitscout-preferences' },
  ),
)

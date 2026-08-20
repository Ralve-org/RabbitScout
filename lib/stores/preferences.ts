import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TableDensity = 'comfortable' | 'compact'

/** Poll cadence options surfaced in the header, in milliseconds. 0 = paused. */
export const REFRESH_INTERVALS = [
  { label: '2s', value: 2000 },
  { label: '5s', value: 5000 },
  { label: '15s', value: 15000 },
  { label: '30s', value: 30000 },
  { label: 'Off', value: 0 },
] as const

interface PreferencesState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  density: TableDensity
  setDensity: (d: TableDensity) => void
  refreshInterval: number
  setRefreshInterval: (ms: number) => void
  vhost: string | null // null = all vhosts
  setVhost: (v: string | null) => void
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      density: 'comfortable',
      setDensity: (density) => set({ density }),
      refreshInterval: 5000,
      setRefreshInterval: (refreshInterval) => set({ refreshInterval }),
      vhost: null,
      setVhost: (vhost) => set({ vhost }),
    }),
    { name: 'rabbitscout-preferences' },
  ),
)

/** Broker reachability, fed by polling results, read by the header. */
interface ConnectionState {
  status: 'connected' | 'degraded' | 'disconnected' | 'unknown'
  lastSuccess: number | null
  reportSuccess: () => void
  reportError: () => void
}

export const useConnectionStatus = create<ConnectionState>()((set) => ({
  status: 'unknown',
  lastSuccess: null,
  reportSuccess: () => set({ status: 'connected', lastSuccess: Date.now() }),
  reportError: () =>
    set((s) => ({
      status:
        s.lastSuccess && Date.now() - s.lastSuccess < 30_000 ? 'degraded' : 'disconnected',
    })),
}))

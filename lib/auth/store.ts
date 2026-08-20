import { create } from 'zustand'
import type { RabbitMQUser } from '@/lib/rabbitmq/types'

/**
 * Client-side auth state. Stores only UI display data.
 * Actual credentials live in the httpOnly cookie managed server-side.
 */
interface AuthState {
  authenticated: boolean
  user: RabbitMQUser | null
  hydrated: boolean
  setAuth: (user: RabbitMQUser) => void
  clearAuth: () => void
  hydrate: () => Promise<void>
}

export const useAuth = create<AuthState>()((set, get) => ({
  authenticated: false,
  user: null,
  hydrated: false,
  setAuth: (user) => set({ authenticated: true, user, hydrated: true }),
  clearAuth: () => set({ authenticated: false, user: null, hydrated: true }),
  // Restore user info after a full page reload (cookie survives, store doesn't)
  hydrate: async () => {
    if (get().hydrated) return
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        if (data.authenticated && data.user) {
          set({ authenticated: true, user: data.user, hydrated: true })
          return
        }
      }
    } catch {
      // Network error — leave state as-is; polling will surface problems
    }
    set({ hydrated: true })
  },
}))

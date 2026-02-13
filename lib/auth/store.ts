import { create } from 'zustand'
import type { RabbitMQUser } from '@/lib/rabbitmq/types'

/**
 * Client-side auth state. Stores only UI display data.
 * Actual credentials live in the httpOnly cookie managed server-side.
 */
interface AuthState {
  authenticated: boolean
  user: RabbitMQUser | null
  setAuth: (user: RabbitMQUser) => void
  clearAuth: () => void
}

export const useAuth = create<AuthState>()((set) => ({
  authenticated: false,
  user: null,
  setAuth: (user) => set({ authenticated: true, user }),
  clearAuth: () => set({ authenticated: false, user: null }),
}))

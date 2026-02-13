import { cookies } from 'next/headers'
import type { AuthSession, RabbitMQUser } from '@/lib/rabbitmq/types'

const COOKIE_NAME = 'rmq-session'

/**
 * Set the auth session cookie (server-side only).
 */
export function setSessionCookie(credentials: string, user: RabbitMQUser): void {
  const session: AuthSession = { credentials, user }

  cookies().set(COOKIE_NAME, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  })
}

/**
 * Clear the auth session cookie (server-side only).
 */
export function clearSessionCookie(): void {
  cookies().delete(COOKIE_NAME)
}

/**
 * Read the auth session from the cookie (server-side only).
 */
export function getSessionFromCookie(): AuthSession | null {
  try {
    const cookie = cookies().get(COOKIE_NAME)
    if (!cookie?.value) return null
    return JSON.parse(cookie.value) as AuthSession
  } catch {
    return null
  }
}

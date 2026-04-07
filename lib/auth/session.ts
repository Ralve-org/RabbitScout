import { cookies } from 'next/headers'
import type { AuthSession, RabbitMQUser } from '@/lib/rabbitmq/types'

const COOKIE_NAME = 'rmq-session'

/**
 * Set the auth session cookie (server-side only).
 */
export async function setSessionCookie(credentials: string, user: RabbitMQUser): Promise<void> {
  const session: AuthSession = { credentials, user }
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, JSON.stringify(session), {
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
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

/**
 * Read the auth session from the cookie (server-side only).
 */
export async function getSessionFromCookie(): Promise<AuthSession | null> {
  try {
    const cookieStore = await cookies()
    const cookie = cookieStore.get(COOKIE_NAME)
    if (!cookie?.value) return null
    return JSON.parse(cookie.value) as AuthSession
  } catch {
    return null
  }
}

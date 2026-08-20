import { cookies } from 'next/headers'
import type { AuthSession, RabbitMQUser } from '@/lib/rabbitmq/types'

export const COOKIE_NAME = 'rmq-session'
export const SESSION_MAX_AGE = 60 * 60 * 24 // 24 hours

/**
 * Normalize the `tags` field from GET /api/whoami.
 * RabbitMQ ≤ 3.8 returns a comma-separated string; 3.9+ (and all 4.x)
 * return a JSON array.
 */
export function normalizeTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
  if (typeof raw === 'string') {
    return raw.split(',').map((t) => t.trim()).filter(Boolean)
  }
  return []
}

/**
 * Whether the session cookie should carry the Secure attribute.
 * Detected per-request instead of assuming NODE_ENV: a production
 * container served over plain HTTP must NOT set Secure, or browsers
 * silently drop the cookie and login appears to do nothing.
 * COOKIE_SECURE=true|false overrides detection when a proxy setup
 * hides the original protocol.
 */
export function isSecureRequest(request: Request): boolean {
  const override = process.env.COOKIE_SECURE
  if (override === 'true') return true
  if (override === 'false') return false

  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  if (forwardedProto) return forwardedProto === 'https'

  try {
    return new URL(request.url).protocol === 'https:'
  } catch {
    return false
  }
}

export function createSession(credentials: string, user: RabbitMQUser): AuthSession {
  return { credentials, user }
}

export function sessionCookieOptions(request: Request) {
  return {
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE,
  }
}

/**
 * Read the auth session from the request cookie (server-side only).
 */
export async function getSessionFromCookie(): Promise<AuthSession | null> {
  try {
    const store = await cookies()
    const cookie = store.get(COOKIE_NAME)
    if (!cookie?.value) return null
    return JSON.parse(cookie.value) as AuthSession
  } catch {
    return null
  }
}

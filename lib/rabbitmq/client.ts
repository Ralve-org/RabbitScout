import { getRabbitMQBaseUrl, RABBITMQ_API_TIMEOUT_MS } from './config'
import { RabbitMQError } from './errors'
import { getSessionFromCookie } from '@/lib/auth/session'
import type { AuthSession } from './types'

/**
 * Read the current user's RabbitMQ credentials from the httpOnly session
 * cookie. Only works in Server Components and API routes (server-side).
 */
export async function getSession(): Promise<AuthSession | null> {
  return getSessionFromCookie()
}

/**
 * Server-side fetch to the RabbitMQ Management API.
 * Reads credentials from the session cookie automatically.
 */
export async function rabbitmqFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const session = await getSession()
  if (!session) {
    throw new RabbitMQError(401, 'Not authenticated', 'AUTH')
  }

  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  const url = `${getRabbitMQBaseUrl()}/api/${cleanPath}`

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Basic ${session.credentials}`,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(RABBITMQ_API_TIMEOUT_MS),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText)
    throw new RabbitMQError(
      response.status,
      `RabbitMQ API error: ${response.statusText}`,
      response.status === 401 || response.status === 403 ? 'AUTH' : 'API',
      text,
    )
  }

  // Some endpoints (DELETE) return 204 with no body
  const contentType = response.headers.get('content-type')
  if (!contentType?.includes('application/json')) {
    return null as T
  }

  return response.json() as Promise<T>
}

/**
 * Validate credentials against the RabbitMQ Management API.
 * Used during login — does NOT read cookies. `tags` may be a string
 * (RabbitMQ ≤ 3.8) or an array (3.9+); callers must normalize.
 */
export async function validateCredentials(
  username: string,
  password: string,
): Promise<{ name: string; tags: string | string[] }> {
  const credentials = Buffer.from(`${username}:${password}`).toString('base64')
  const url = `${getRabbitMQBaseUrl()}/api/whoami`

  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(RABBITMQ_API_TIMEOUT_MS),
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new RabbitMQError(401, 'Invalid username or password', 'AUTH')
    }
    throw new RabbitMQError(response.status, `RabbitMQ error: ${response.statusText}`, 'API')
  }

  return response.json()
}

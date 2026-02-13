/**
 * Single source of truth for RabbitMQ connection configuration.
 * Only server-side env vars — no NEXT_PUBLIC_ prefix needed for host/port
 * since all RabbitMQ calls go through API routes or Server Components.
 */

export const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'localhost'
export const RABBITMQ_PORT = process.env.RABBITMQ_PORT || ''
export const RABBITMQ_PROTOCOL = process.env.RABBITMQ_PROTOCOL || 'http'
export const RABBITMQ_API_TIMEOUT_MS = process.env.RABBITMQ_API_TIMEOUT_MS
  ? parseInt(process.env.RABBITMQ_API_TIMEOUT_MS, 10)
  : 15000

export function getRabbitMQBaseUrl(): string {
  const portPart = RABBITMQ_PORT ? `:${RABBITMQ_PORT}` : ''
  return `${RABBITMQ_PROTOCOL}://${RABBITMQ_HOST}${portPart}`
}

import { NextRequest, NextResponse } from 'next/server'
import { getRabbitMQBaseUrl, RABBITMQ_API_TIMEOUT_MS } from '@/lib/rabbitmq/config'
import type { AuthSession } from '@/lib/rabbitmq/types'

export const dynamic = 'force-dynamic'

/**
 * Dedicated publish endpoint that constructs the RabbitMQ URL server-side.
 * Separated from the catch-all proxy to avoid routing conflicts and to
 * correctly handle the default exchange's empty name in the URL path.
 *
 * RabbitMQ API: PUT /api/exchanges/{vhost}/{exchange}/publish
 */
export async function POST(request: NextRequest) {
  const cookie = request.cookies.get('rmq-session')
  if (!cookie?.value) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let credentials: string
  try {
    const session: AuthSession = JSON.parse(cookie.value)
    credentials = session.credentials
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { vhost, exchange, routing_key, payload, payload_encoding, properties } = body

    if (!routing_key || payload === undefined || payload === null) {
      return NextResponse.json(
        { error: 'routing_key and payload are required' },
        { status: 400 },
      )
    }

    const encodedVhost = encodeURIComponent(vhost || '/')
    const encodedExchange = encodeURIComponent(exchange ?? '')
    const url = `${getRabbitMQBaseUrl()}/api/exchanges/${encodedVhost}/${encodedExchange}/publish`

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        routing_key,
        payload: String(payload),
        payload_encoding: payload_encoding || 'string',
        properties: properties || {},
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(RABBITMQ_API_TIMEOUT_MS),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText)
      return NextResponse.json(
        { error: `RabbitMQ: ${response.statusText}`, details: text },
        { status: response.status },
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to publish message', details: message },
      { status: 502 },
    )
  }
}

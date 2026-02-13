import { NextRequest, NextResponse } from 'next/server'
import { getRabbitMQBaseUrl, RABBITMQ_API_TIMEOUT_MS } from '@/lib/rabbitmq/config'
import type { AuthSession } from '@/lib/rabbitmq/types'

export const dynamic = 'force-dynamic'

function getCredentials(request: NextRequest): string | null {
  try {
    const cookie = request.cookies.get('rmq-session')
    if (!cookie?.value) return null
    const session: AuthSession = JSON.parse(cookie.value)
    return session.credentials
  } catch {
    return null
  }
}

async function proxyToRabbitMQ(
  request: NextRequest,
  params: { path: string[] },
  method: string,
) {
  const credentials = getCredentials(request)
  if (!credentials) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Re-encode each segment: Next.js decodes %2F → / in params,
  // but RabbitMQ requires vhost "/" to stay encoded as %2F in the URL.
  const path = params.path.map((s) => encodeURIComponent(s)).join('/')
  const url = `${getRabbitMQBaseUrl()}/api/${path}`

  const fetchOptions: RequestInit = {
    method,
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(RABBITMQ_API_TIMEOUT_MS),
  }

  // Forward request body for POST/PUT/DELETE
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      const body = await request.text()
      if (body) fetchOptions.body = body
    } catch {
      // No body to forward
    }
  }

  try {
    const response = await fetch(url, fetchOptions)

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText)
      return NextResponse.json(
        { error: `RabbitMQ: ${response.statusText}`, details: text },
        { status: response.status },
      )
    }

    // Handle empty responses (e.g. 204 No Content from DELETE)
    const contentType = response.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      return NextResponse.json({ success: true })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const isTimeout = message.includes('timeout') || message.includes('aborted')
    return NextResponse.json(
      { error: isTimeout ? 'Request timed out' : 'Failed to reach RabbitMQ', details: message },
      { status: isTimeout ? 408 : 502 },
    )
  }
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyToRabbitMQ(req, params, 'GET')
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyToRabbitMQ(req, params, 'POST')
}

export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyToRabbitMQ(req, params, 'PUT')
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyToRabbitMQ(req, params, 'DELETE')
}

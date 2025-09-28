import { getRabbitMQBaseUrl, getRabbitMQAuthHeaders, API_TIMEOUT_MS } from '@/lib/config'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = { params: Promise<{ path: string[] }>}

export async function GET(request: Request, { params }: Props) {
  try {
    const path = (await params).path.join('/')
    const url = `${getRabbitMQBaseUrl()}/api/${path}`

    console.log(`[API Route] Fetching from ${url}`)

    const response = await fetch(url, {
      headers: getRabbitMQAuthHeaders(),
      cache: 'no-store',
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[API Route] Error response from RabbitMQ:`, errorText)
      return NextResponse.json(
        { error: 'Failed to fetch from RabbitMQ', details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log(`[API Route] Successfully fetched ${data.length ?? 1} items`)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[API Route] Error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request, { params }: Props) {
  try {
    const path = (await params).path.join('/')
    const url = `${getRabbitMQBaseUrl()}/api/${path}`
    const body = await request.json()

    console.log(`[API Route] POSTing to ${url}`)

    const response = await fetch(url, {
      method: 'POST',
      headers: getRabbitMQAuthHeaders(),
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[API Route] Error response from RabbitMQ:`, errorText)
      return NextResponse.json(
        { error: 'Failed to post to RabbitMQ', details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[API Route] Error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

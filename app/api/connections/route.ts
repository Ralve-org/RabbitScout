import { RABBITMQ_CONFIG } from '../../../lib/config'
import { createApiResponse, createApiErrorResponse, NO_CACHE_HEADERS, NO_CACHE_FETCH_OPTIONS } from '@/lib/api-utils'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const { host, port, username, password } = RABBITMQ_CONFIG
    const baseUrl = `http://${host}:${port}/api`
    const url = `${baseUrl}/connections`

    console.log(`[API Route] Fetching connections from ${url}`)
    console.log(`[API Route] Using host: ${host}:${port}`)

    const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`

    const response = await fetch(url, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        ...NO_CACHE_HEADERS
      },
      ...NO_CACHE_FETCH_OPTIONS,
      signal: AbortSignal.timeout(5000)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[API Route] RabbitMQ API error:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      return createApiErrorResponse(
        `Failed to fetch connections: ${response.statusText}`,
        response.status
      )
    }

    const data = await response.json()
    
    if (!Array.isArray(data)) {
      console.error(`[API Route] Unexpected response format:`, data)
      return createApiErrorResponse(
        'Invalid response format from RabbitMQ API',
        500
      )
    }

    console.log(`[API Route] Successfully fetched ${data.length} connections`)
    return createApiResponse(data)
  } catch (error) {
    console.error('[API Route] Error fetching connections:', error)
    return createApiErrorResponse('Failed to fetch connections from RabbitMQ')
  }
}

// Also handle DELETE requests for closing connections
export async function DELETE(request: Request) {
  try {
    const { name } = await request.json()
    if (!name) {
      return NextResponse.json(
        { error: 'Connection name is required' },
        { status: 400 }
      )
    }

    const { host, port, username, password } = RABBITMQ_CONFIG
    const baseUrl = `http://${host}:${port}/api`
    const url = `${baseUrl}/connections/${encodeURIComponent(name)}`

    console.log(`[API Route] Closing connection: ${name}`)

    const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[API Route] Error closing connection:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      return NextResponse.json(
        { error: `Failed to close connection: ${response.statusText}` },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API Route] Error closing connection:', error)
    return NextResponse.json(
      { error: 'Failed to close connection' },
      { status: 500 }
    )
  }
}

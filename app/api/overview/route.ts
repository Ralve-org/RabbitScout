import { getRabbitMQAuthHeaders, getRabbitMQBaseUrl } from '../../../lib/config'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Cache the overview data for 2 seconds to prevent duplicate calls
const CACHE_DURATION = 2000 // 2 seconds
let cachedData: any = null
let lastFetchTime = 0

export async function GET() {
  try {
    const now = Date.now()
    
    // Return cached data if it's still fresh
    if (cachedData && (now - lastFetchTime) < CACHE_DURATION) {
      return NextResponse.json(cachedData, {
        headers: {
          'Cache-Control': `public, max-age=${CACHE_DURATION / 1000}`,
        }
      })
    }

    const url = `${getRabbitMQBaseUrl()}/api/overview`

    console.log(`[API Route] Fetching fresh overview data from ${url}`)

    const response = await fetch(url, {
      headers: getRabbitMQAuthHeaders(),
      cache: 'no-store',
      signal: AbortSignal.timeout(5000)
    })

    if (!response.ok) {
      throw new Error(`RabbitMQ API error: ${response.statusText}`)
    }

    const data = await response.json()
    
    // Update cache
    cachedData = data
    lastFetchTime = now

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': `public, max-age=${CACHE_DURATION / 1000}`,
      }
    })
  } catch (error) {
    console.error('[API Route] Error fetching overview:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

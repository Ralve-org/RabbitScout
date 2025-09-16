import { getRabbitMQAuthHeaders, getRabbitMQBaseUrl } from '@/lib/config'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Cache the queues data for 2 seconds to prevent duplicate calls
const CACHE_DURATION = 2000 // 2 seconds
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    const baseUrl = getRabbitMQBaseUrl()
    const url = `${baseUrl}/api/queues`

    console.log(`[API Route] Fetching fresh queues data from ${url}`)

    const response = await fetch(url, {
      headers: getRabbitMQAuthHeaders(),
      cache: 'no-store',
      signal: AbortSignal.timeout(5000)
    })

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API Route] RabbitMQ API error response:`, errorText);
      throw new Error(`RabbitMQ API error: ${response.statusText}`);
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('[API Route] Error fetching queues:', error)
    return NextResponse.json(
      { error: error?.message },
      { status: 500 }
    )
  }
}

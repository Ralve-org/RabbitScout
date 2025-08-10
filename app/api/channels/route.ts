import { getRabbitMQAuthHeaders, getRabbitMQBaseUrl } from '../../../lib/config'
import { createApiResponse, createApiErrorResponse, NO_CACHE_HEADERS, NO_CACHE_FETCH_OPTIONS } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const url = `${getRabbitMQBaseUrl()}/api/channels`

    console.log(`[API Route] Fetching channels from ${url}`)
    console.log(`[API Route] Using host: ${getRabbitMQBaseUrl()}`)

    const response = await fetch(url, {
      headers: {
        ...getRabbitMQAuthHeaders(),
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
        `Failed to fetch channels: ${response.statusText}`,
        response.status
      )
    }

    const data = await response.json()
    
    if (!Array.isArray(data)) {
      console.error(`[API Route] Unexpected response format:`, data)
      return createApiErrorResponse('Invalid response format from RabbitMQ API', 500)
    }

    console.log(`[API Route] Successfully fetched ${data.length} channels`)
    return createApiResponse(data)
  } catch (error) {
    console.error('[API Route] Error fetching channels:', error)
    return createApiErrorResponse('Failed to fetch channels from RabbitMQ')
  }
}

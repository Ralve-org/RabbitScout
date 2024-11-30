import { RABBITMQ_CONFIG } from '@/lib/config'
import { createApiResponse, createApiErrorResponse, NO_CACHE_HEADERS, NO_CACHE_FETCH_OPTIONS } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(
  request: Request,
  { params }: { params: { vhost: string; queue: string } }
) {
  try {
    const { host, port, username, password } = RABBITMQ_CONFIG
    const { vhost, queue } = params
    const baseUrl = `http://${host}:${port}/api`
    const url = `${baseUrl}/queues/${encodeURIComponent(vhost)}/${encodeURIComponent(queue)}/get`

    console.log(`[API Route] Fetching messages from queue ${queue} in vhost ${vhost}`)
    console.log(`[API Route] Using host: ${host}:${port}`)

    // Get the original request body or use defaults that won't affect processing
    const body = await request.json().catch(() => ({
      count: 50,
      ackmode: "ack_requeue_true",
      encoding: "auto"
    }))

    const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        ...NO_CACHE_HEADERS
      },
      ...NO_CACHE_FETCH_OPTIONS,
      body: JSON.stringify(body), // Use the original request body
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
        `Failed to fetch messages: ${response.statusText}`,
        response.status
      )
    }

    const data = await response.json()
    console.log(`[API Route] Successfully fetched ${data.length} messages from queue ${queue}`)
    return createApiResponse(data)
  } catch (error) {
    console.error('[API Route] Error fetching messages:', error)
    return createApiErrorResponse('Failed to fetch messages from RabbitMQ')
  }
}

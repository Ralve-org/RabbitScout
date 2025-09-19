import {getRabbitMQAuthHeaders, getRabbitMQBaseUrl} from '@/lib/config'
import {createApiErrorResponse, createApiResponse, NO_CACHE_FETCH_OPTIONS, NO_CACHE_HEADERS} from '@/lib/api-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type RequestProps = { params: Promise<{ vhost: string, queue: string }> }


export async function POST(
    request: Request,
    {params}: RequestProps
) {
    try {
        const {vhost, queue} = await params
        const url = `${getRabbitMQBaseUrl()}/api/queues/${encodeURIComponent(vhost)}/${encodeURIComponent(queue)}/get`

        console.log(`[API Route] Fetching messages from queue ${queue} in vhost ${vhost}`)
        console.log(`[API Route] Using host: ${getRabbitMQBaseUrl()}`)

        // Get the original request body or use defaults that won't affect processing
        const body = await request.json().catch(() => ({
            count: 50,
            ackmode: "ack_requeue_true",
            encoding: "auto"
        }))

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                ...getRabbitMQAuthHeaders(),
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

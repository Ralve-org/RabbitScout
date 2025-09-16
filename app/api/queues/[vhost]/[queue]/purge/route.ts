import { getRabbitMQAuthHeaders, getRabbitMQBaseUrl } from '@/lib/config'
import { createApiResponse, createApiErrorResponse, NO_CACHE_HEADERS, NO_CACHE_FETCH_OPTIONS } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function DELETE(
    request: Request,
    { params }: { params: { vhost: string; queue: string } }
) {
    try {
        const { vhost, queue } = params
        const url = `${getRabbitMQBaseUrl()}/api/queues/${encodeURIComponent(vhost)}/${encodeURIComponent(queue)}/contents`

        console.log(`[API Route] purge queue ${queue} in vhost ${vhost}`)
        console.log(`[API Route] Using host: ${getRabbitMQBaseUrl()}`)

        // Get the original request body or use defaults that won't affect processing
        const body = await request.json().catch(() => ({
            vhost: vhost, name: queue, mode: 'purge'
        }))
        const bodyJson = JSON.stringify(body);
        console.log(`[API Route] Purge request body:`, bodyJson);

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                ...getRabbitMQAuthHeaders(),
                ...NO_CACHE_HEADERS
            },
            ...NO_CACHE_FETCH_OPTIONS,
            body: bodyJson, // Use the original request body
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
                `Failed to purge queue: ${response.statusText}`,
                response.status
            );
        }

        console.log(`[API Route] Successfully purged queue ${queue}`)
        return createApiResponse({'deleted': 'true', 'message': 'Messages purged from queue', 'vhost': vhost, 'queue': queue, 'mode': 'purge' });
    } catch (error) {
        console.error('[API Route] Error purging queue:', error)
        return createApiErrorResponse('Failed to purge messages from RabbitMQ')
    }
}

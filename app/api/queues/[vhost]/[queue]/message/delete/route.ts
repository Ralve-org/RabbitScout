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


        console.log(`[API Route] Successfully deleted message ${queue}`)
        return createApiResponse({'deleted': 'true', 'message': 'Message deleted from queue', 'vhost': vhost, 'queue': queue });
    } catch (error) {
        console.error('[API Route] Error deleting message:', error)
        return createApiErrorResponse('Failed to delete message from RabbitMQ')
    }
}

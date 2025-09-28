import {getRabbitMQBaseUrl} from '@/lib/config'
import {createApiErrorResponse, createApiResponse} from '@/lib/api-utils'
import {deleteRabbitMqMessage} from "@/lib/api-queue-utils";

export const dynamic = 'force-dynamic'
export const revalidate = 0


type RequestProps = { params: Promise<{ vhost: string, queue: string, messageId: string }> }


export async function DELETE(
    request: Request,
    {params}: RequestProps
) {
    try {
        const {vhost, queue, messageId} = await params
        console.log(`[API Route] delete message from queue ${queue} in vhost ${vhost}`)
        console.log(`[API Route] Using host: ${getRabbitMQBaseUrl()}`)

        const deleteResponse = await deleteRabbitMqMessage(queue, messageId);

        if (deleteResponse.deleted) {
            console.log(`[API Route] Successfully deleted message ${messageId}`)
        } else {
            console.log(`[API Route] Message not deleted ${messageId}`)
        }
        return createApiResponse({
            deleted: deleteResponse.deleted,
            message: messageId,
            vhost: vhost,
            queue: queue
        });
    } catch (error) {
        console.error('[API Route] Error deleting message:', error)
        return createApiErrorResponse('Failed to delete message from RabbitMQ')
    }
}

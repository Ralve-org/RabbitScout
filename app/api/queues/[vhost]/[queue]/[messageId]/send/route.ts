import {getRabbitMQBaseUrl} from '@/lib/config'
import {createApiErrorResponse, createApiResponse} from '@/lib/api-utils'
import {sendRabbitMqMessage} from "@/lib/api-queue-utils";
import {QueueMessage} from "@/lib/queue-message";

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = { params: Promise<{ vhost: string, queue: string, messageId: string }> }

export async function POST(
    request: Request,
    {params}: Props
) {
  try {
    const {vhost, queue, messageId} = await params
    console.log(`[API Route] send message ${messageId} to queue ${queue} in vhost ${vhost}`)
    console.log(`[API Route] Using host: ${getRabbitMQBaseUrl()}`)

    const message = await request.json() as QueueMessage;
    const response = await sendRabbitMqMessage(queue, messageId, message);

    console.log(`[API Route] Successfully send message to queue ${queue}`)
    return createApiResponse({
      sent: response.success,
      message: messageId,
      vhost: vhost,
      queue: queue
    });
  } catch (error) {
    console.error('[API Route] Error purging queue:', error)
    return createApiErrorResponse('Failed to purge messages from RabbitMQ')
  }
}

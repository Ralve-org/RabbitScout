import {getRabbitMQBaseUrl} from '@/lib/config'
import {createApiErrorResponse, createApiResponse} from '@/lib/api-utils'
import {sendRabbitMqMessage} from "@/lib/api-queue-utils";

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = { params: Promise<{ vhost: string, queue: string, messageId: string }> }

export async function POST(
    request: Request,
    {params}: Props
) {
  try {
    const {vhost, queue, messageId} = await params
    console.log(`[API Route] send message to queue ${queue} in vhost ${vhost}`)
    console.log(`[API Route] Using host: ${getRabbitMQBaseUrl()}`)

    // Get the original request body or use defaults that won't affect processing
    const body = await request.text().catch(() => (''));
    const bodyJson = JSON.stringify(body);
    console.log(`[API Route] Send message request body:`, bodyJson);

    const response = await sendRabbitMqMessage(queue, messageId, bodyJson);

    console.log(`[API Route] Successfully send message to queue ${queue}`)
    return createApiResponse({
      sent: response.success,
      message: 'Message sent to queue',
      vhost: vhost,
      queue: queue
    });
  } catch (error) {
    console.error('[API Route] Error purging queue:', error)
    return createApiErrorResponse('Failed to purge messages from RabbitMQ')
  }
}

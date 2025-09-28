export interface QueueMessage {
  payload: string
  payload_bytes: number
  redelivered: boolean
  exchange: string
  routing_key: string
  message_count: number
  properties: {
    headers: Record<string, never>
    timestamp?: string
    content_type?: string
    content_encoding?: string
    correlation_id?: string
    expiration?: string
    message_id?: string
    type?: string
    delivery_mode: number
    reply_to?: string
    user_id?: string
    app_id?: string
    cluster_id?: string
  }
}


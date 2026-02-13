// ── Rate & Message Stats ─────────────────────────────────────────────

export interface RateDetails {
  rate: number
  avg?: number
  avg_rate?: number
  samples?: Array<{ sample: number; timestamp: number }>
}

export interface MessageStats {
  publish?: number
  publish_details?: RateDetails
  publish_in?: number
  publish_in_details?: RateDetails
  publish_out?: number
  publish_out_details?: RateDetails
  confirm?: number
  confirm_details?: RateDetails
  deliver?: number
  deliver_details?: RateDetails
  deliver_no_ack?: number
  deliver_no_ack_details?: RateDetails
  get?: number
  get_details?: RateDetails
  get_no_ack?: number
  get_no_ack_details?: RateDetails
  deliver_get?: number
  deliver_get_details?: RateDetails
  redeliver?: number
  redeliver_details?: RateDetails
  return_unroutable?: number
  return_unroutable_details?: RateDetails
}

// ── Overview ─────────────────────────────────────────────────────────

export interface Overview {
  management_version: string
  rates_mode: string
  node: string
  message_stats: MessageStats
  queue_totals: {
    messages: number
    messages_ready: number
    messages_unacknowledged: number
  }
  object_totals: {
    connections: number
    channels: number
    exchanges: number
    queues: number
    consumers: number
  }
  listeners: Array<{
    node: string
    protocol: string
    ip_address: string
    port: number
  }>
}

// ── Queues ───────────────────────────────────────────────────────────

export interface Queue {
  name: string
  vhost: string
  state: string
  durable: boolean
  auto_delete: boolean
  exclusive: boolean
  consumers: number
  consumer_utilisation: number | null
  policy: string
  messages: number
  messages_ready: number
  messages_unacknowledged: number
  message_stats?: MessageStats
}

// ── Exchanges ────────────────────────────────────────────────────────

export interface Exchange {
  name: string
  vhost: string
  type: string
  durable: boolean
  auto_delete: boolean
  internal: boolean
  arguments: Record<string, unknown>
  message_stats?: MessageStats
}

// ── Bindings ─────────────────────────────────────────────────────────

export interface Binding {
  source: string
  destination: string
  destination_type: 'queue' | 'exchange'
  routing_key: string
  arguments: Record<string, unknown>
  vhost: string
  properties_key: string
}

// ── Connections ──────────────────────────────────────────────────────

export interface Connection {
  name: string
  user: string
  vhost: string
  host: string
  port: number
  peer_host: string
  peer_port: number
  ssl: boolean
  protocol: string
  auth_mechanism: string
  state: string
  connected_at: number
  timeout: number
  frame_max: number
  channel_max: number
  channels: number
  recv_oct: number
  recv_oct_details: RateDetails
  send_oct: number
  send_oct_details: RateDetails
  recv_cnt: number
  send_cnt: number
  send_pend: number
  client_properties: {
    platform?: string
    product?: string
    version?: string
    information?: string
    connection_name?: string
  }
  ssl_protocol?: string
  ssl_cipher?: string
  ssl_hash?: string
}

// ── Channels ─────────────────────────────────────────────────────────

export interface Channel {
  name: string
  number: number
  user: string
  vhost: string
  node: string
  state: string
  prefetch_count: number
  global_prefetch_count: number
  messages_unacknowledged: number
  messages_unconfirmed: number
  messages_uncommitted: number
  acks_uncommitted: number
  consumer_count: number
  confirm: boolean
  transactional: boolean
  idle_since?: string
  message_stats?: MessageStats
  connection_details: {
    name: string
    peer_host: string
    peer_port: number
    user: string
  }
}

// ── Node Stats ───────────────────────────────────────────────────────

export interface NodeStats {
  name: string
  mem_used: number
  mem_limit: number
  disk_free: number
  disk_free_limit: number
  fd_used: number
  fd_total: number
  sockets_used: number
  sockets_total: number
  proc_used: number
  proc_total: number
  uptime: number
  run_queue: number
}

// ── Messages (from queue get) ────────────────────────────────────────

export interface QueueMessage {
  payload: string
  payload_bytes: number
  payload_encoding: string
  redelivered: boolean
  exchange: string
  routing_key: string
  message_count: number
  properties: {
    headers: Record<string, unknown> | null
    delivery_mode: number
    content_type?: string
    content_encoding?: string
    correlation_id?: string
    reply_to?: string
    expiration?: string
    message_id?: string
    timestamp?: string
    type?: string
    user_id?: string
    app_id?: string
  }
}

// ── Auth ─────────────────────────────────────────────────────────────

export interface RabbitMQUser {
  username: string
  isAdmin: boolean
  tags: string[]
}

export interface AuthSession {
  credentials: string // base64(username:password)
  user: RabbitMQUser
}

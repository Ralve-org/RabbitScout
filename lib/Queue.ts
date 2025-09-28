export interface Queue extends QueueStats {
  name: string
  vhost: string
  state: string
  consumers: number
  consumer_utilisation: number
  policy: string
  exclusive: boolean
  auto_delete: boolean
  durable: boolean
}

export interface QueueStats {
  messages: number;
  messages_ready: number;
  messages_unacknowledged: number;
  message_stats?: {
    publish: number;
    publish_details: {
      rate: number;
    };
    deliver_get: number;
    deliver_get_details: {
      rate: number;
    };
  };
}
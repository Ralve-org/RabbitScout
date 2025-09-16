import {type ClassValue, clsx} from "clsx"
import {twMerge} from "tailwind-merge"
import {API_TIMEOUT_MS} from "./config"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

// RabbitMQ API Configuration
export const RABBITMQ_CONFIG = {
    host: process.env.NEXT_PUBLIC_RABBITMQ_HOST || 'localhost',
    port: process.env.NEXT_PUBLIC_RABBITMQ_PORT || '15672',
    vhost: process.env.NEXT_PUBLIC_RABBITMQ_VHOST || '/',
    username: process.env.NEXT_PUBLIC_RABBITMQ_USERNAME,
    password: process.env.NEXT_PUBLIC_RABBITMQ_PASSWORD,
};

// Error types
export type RabbitMQError = {
    status: number;
    message: string;
    type: 'CONNECTION' | 'AUTH' | 'TIMEOUT' | 'API' | 'UNKNOWN';
    details?: string;
};

// Error handling utility
export function handleRabbitMQError(error: unknown): RabbitMQError {
    console.error('Original error:', error);

    if (error instanceof Error) {
        // Handle timeout errors
        if (error.message.includes('timeout') ||
            error.message.includes('aborted') ||
            (error as any)?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
            return {
                status: 408,
                message: 'Connection timed out. Please check if RabbitMQ server is running and accessible.',
                type: 'TIMEOUT',
                details: error.message
            };
        }

        // Handle connection errors
        if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
            return {
                status: 503,
                message: 'Unable to connect to RabbitMQ server. Please check your connection settings.',
                type: 'CONNECTION',
                details: error.message
            };
        }

        // Handle authentication errors
        if (error.message.includes('401') || error.message.includes('403')) {
            return {
                status: 401,
                message: 'Authentication failed. Please check your credentials.',
                type: 'AUTH',
                details: error.message
            };
        }
    }

    // Default unknown error
    return {
        status: 500,
        message: 'An unexpected error occurred while connecting to RabbitMQ.',
        type: 'UNKNOWN',
        details: error instanceof Error ? error.message : String(error)
    };
}

// Check if we're running on the client side
const isClient = typeof window !== 'undefined'

// Helper function to make API requests
export async function rabbitMQFetch(endpoint: string, options: RequestInit = {}) {
    try {
        // Remove leading slash if present
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint

        // Use relative URL on client side, absolute URL on server side
        const url = isClient
            ? `/api/${cleanEndpoint}`
            : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/${cleanEndpoint}`

        console.log(`[API] Fetching from ${url}`)

        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        })

        console.log(`[API] Response status: ${response.status}`)

        if (!response.ok) {
            const errorText = await response.text()
            console.error(`[API] Error response body:`, errorText)
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
        }

        const data = await response.json()
        console.log(`[API] Success! Received ${Array.isArray(data) ? data.length : 1} items`)
        return data
    } catch (error) {
        console.error(`[API] Fetch error:`, error)
        const handledError = handleRabbitMQError(error);
        console.error('Error fetching from RabbitMQ API:', handledError.message);
        throw handledError;
    }
}

// API Types
export interface MessageStats {
    publish?: number;
    publish_details?: RateDetails;
    publish_in?: number;
    publish_in_details?: RateDetails;
    publish_out?: number;
    publish_out_details?: RateDetails;
    confirm?: number;
    confirm_details?: RateDetails;
    deliver?: number;
    deliver_details?: RateDetails;
    deliver_no_ack?: number;
    deliver_no_ack_details?: RateDetails;
    get?: number;
    get_details?: RateDetails;
    get_no_ack?: number;
    get_no_ack_details?: RateDetails;
    deliver_get?: number;
    deliver_get_details?: RateDetails;
    redeliver?: number;
    redeliver_details?: RateDetails;
    return_unroutable?: number;
    return_unroutable_details?: RateDetails;
}

export interface RateDetails {
    rate: number;
    avg?: number;
    avg_rate?: number;
    samples?: Array<{ sample: number; timestamp: number }>;
}

export interface Overview {
    management_version: string;
    rates_mode: string;
    sample_retention_policies: {
        global: Array<[string, number]>;
        basic: Array<[string, number]>;
        detailed: Array<[string, number]>;
    };
    exchange_types: Array<{
        name: string;
        description: string;
        enabled: boolean;
    }>;
    message_stats: MessageStats;
    queue_totals: {
        messages: number;
        messages_ready: number;
        messages_unacknowledged: number;
    };
    object_totals: {
        connections: number;
        channels: number;
        exchanges: number;
        queues: number;
        consumers: number;
    };
    statistics_db_event_queue: number;
    node: string;
    listeners: Array<{
        node: string;
        protocol: string;
        ip_address: string;
        port: number;
        socket_opts: {
            backlog: number;
            nodelay: boolean;
            linger: Array<boolean | number>;
            exit_on_close: boolean;
        };
    }>;
}

export interface NodeStats {
    disk_free: number;
    disk_free_limit: number;
    fd_total: number;
    fd_used: number;
    mem_limit: number;
    mem_used: number;
    proc_total: number;
    proc_used: number;
    run_queue: number;
    sockets_total: number;
    sockets_used: number;
    uptime: number;
    mnesia_disk_tx_count: number;
    mnesia_ram_tx_count: number;
    msg_store_read_count: number;
    msg_store_write_count: number;
    queue_index_journal_write_count: number;
    queue_index_read_count: number;
    queue_index_write_count: number;
    io_read_count?: number;
    io_read_bytes?: number;
    io_write_count?: number;
    io_write_bytes?: number;
}

export interface DetailedMessageStats extends MessageStats {
    incoming?: Array<{
        stats: MessageStats;
        exchange?: { name: string; vhost: string };
        queue?: { name: string; vhost: string };
        channel?: { name: string; number: number; connection_name: string };
    }>;
    outgoing?: Array<{
        stats: MessageStats;
        exchange?: { name: string; vhost: string };
        queue?: { name: string; vhost: string };
        channel?: { name: string; number: number; connection_name: string };
    }>;
}

// API Endpoints
export const API_ENDPOINTS = {
    overview: '/api/overview',
    nodes: '/api/nodes',
    queues: {
        list: '/api/queues',
        vhost: (vhost: string) => `/api/queues/${encodeURIComponent(vhost)}`,
        specific: (vhost: string, name: string) => `/api/queues/${encodeURIComponent(vhost)}/${encodeURIComponent(name)}`,
        bindings: (vhost: string, name: string) => `/api/queues/${encodeURIComponent(vhost)}/${encodeURIComponent(name)}/bindings`,
        contents: (vhost: string, name: string) => `/api/queues/${encodeURIComponent(vhost)}/${encodeURIComponent(name)}/contents`,
        get: (vhost: string, name: string) => `/api/queues/${encodeURIComponent(vhost)}/${encodeURIComponent(name)}/get`
    },
    exchanges: {
        list: '/api/exchanges',
        vhost: (vhost: string) => `/api/exchanges/${encodeURIComponent(vhost)}`,
        specific: (vhost: string, name: string) => `/api/exchanges/${encodeURIComponent(vhost)}/${encodeURIComponent(name)}`,
        bindings_source: (vhost: string, name: string) => `/api/exchanges/${encodeURIComponent(vhost)}/${encodeURIComponent(name)}/bindings/source`,
        bindings_destination: (vhost: string, name: string) => `/api/exchanges/${encodeURIComponent(vhost)}/${encodeURIComponent(name)}/bindings/destination`,
    },
    connections: {
        list: '/api/connections',
        vhost: (vhost: string) => `/api/connections/${encodeURIComponent(vhost)}`,
        specific: (name: string) => `/api/connections/${encodeURIComponent(name)}`,
        channels: (name: string) => `/api/connections/${encodeURIComponent(name)}/channels`,
    },
    channels: {
        list: '/api/channels',
        vhost: (vhost: string) => `/api/channels/${encodeURIComponent(vhost)}`,
        specific: (name: string) => `/api/channels/${encodeURIComponent(name)}`,
    },
    consumers: {
        list: '/api/consumers',
        vhost: (vhost: string) => `/api/consumers/${encodeURIComponent(vhost)}`,
    },
    bindings: {
        list: '/api/bindings',
        vhost: (vhost: string) => `/api/bindings/${encodeURIComponent(vhost)}`,
        exchange_queue: (vhost: string, exchange: string, queue: string) =>
            `/api/bindings/${encodeURIComponent(vhost)}/e/${encodeURIComponent(exchange)}/q/${encodeURIComponent(queue)}`,
        exchange_exchange: (vhost: string, source: string, destination: string) =>
            `/api/bindings/${encodeURIComponent(vhost)}/e/${encodeURIComponent(source)}/e/${encodeURIComponent(destination)}`,
    },
    vhosts: {
        list: '/api/vhosts',
        specific: (name: string) => `/api/vhosts/${encodeURIComponent(name)}`,
        permissions: (name: string) => `/api/vhosts/${encodeURIComponent(name)}/permissions`,
    },
    health: {
        alarms: '/api/health/checks/alarms',
        local_alarms: '/api/health/checks/local-alarms',
        virtual_hosts: '/api/health/checks/virtual-hosts',
        node_is_quorum_critical: '/api/health/checks/node-is-quorum-critical',
    }
};

// API Functions
export async function getOverview() {
    const data = await rabbitMQFetch('overview', {
        cache: 'no-store',
        next: {revalidate: 0},
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    });
    return data;
}

export async function getQueues() {
    return rabbitMQFetch('/queues', {
        cache: 'no-store',
        next: {revalidate: 0},
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    });
}

export async function getExchanges() {
    const data = await rabbitMQFetch('exchanges', {
        cache: 'no-store',
        next: {revalidate: 0},
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    });
    return data;
}

export async function getConnections() {
    const data = await rabbitMQFetch('connections', {
        cache: 'no-store',
        next: {revalidate: 0},
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    });
    return data;
}

export async function getChannels() {
    return rabbitMQFetch('/channels', {
        cache: 'no-store',
        next: {revalidate: 0},
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    });
}

export async function getVhosts() {
    return rabbitMQFetch('/vhosts', {
        cache: 'no-store',
        next: {revalidate: 0},
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    });
}

export async function getBindings(vhost: string, exchangeName: string) {
    const encodedVhost = encodeURIComponent(vhost);
    const encodedExchange = encodeURIComponent(exchangeName);
    return rabbitMQFetch(`/api/bindings/${encodedVhost}/e/${encodedExchange}/source`, {
        cache: 'no-store',
        next: {revalidate: 0},
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    });
}

// Queue specific functions
export async function getQueueDetails(vhost: string, queueName: string) {
    const encodedVhost = encodeURIComponent(vhost);
    const encodedQueue = encodeURIComponent(queueName);
    return rabbitMQFetch(`/queues/${encodedVhost}/${encodedQueue}`, {
        cache: 'no-store',
        next: {revalidate: 0},
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    });
}

export async function getQueueBindings(vhost: string, queueName: string) {
    const encodedVhost = encodeURIComponent(vhost);
    const encodedQueue = encodeURIComponent(queueName);
    return rabbitMQFetch(`/queues/${encodedVhost}/${encodedQueue}/bindings`, {
        cache: 'no-store',
        next: {revalidate: 0},
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    });
}

export async function purgeQueue(vhost: string, queueName: string) {
    const encodedVhost = encodeURIComponent(vhost);
    const encodedQueue = encodeURIComponent(queueName);
    return rabbitMQFetch(`/queues/${encodedVhost}/${encodedQueue}/purge`, {
        method: 'DELETE',
        cache: 'no-store',
        next: {revalidate: 0},
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    });
}

// Message related functions
export async function getMessages(
    vhost: string,
    queueName: string,
    count: number = 5,
    ackMode: 'ack_requeue_true' | 'ack_requeue_false' | 'reject_requeue_true' | 'reject_requeue_false' = 'reject_requeue_true'
) {
    const endpoint = `queues/${encodeURIComponent(vhost)}/${encodeURIComponent(queueName)}/get`

    const body = {
        count,
        ackmode: ackMode,
        encoding: "auto"
    }

    return rabbitMQFetch(endpoint, {
        method: 'POST',
        cache: 'no-store',
        next: {revalidate: 0},
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        },
        body: JSON.stringify(body)
    })
}

// Health check functions
export async function checkAliveness(vhost: string = '/') {
    const encodedVhost = encodeURIComponent(vhost);
    return rabbitMQFetch(`/aliveness-test/${encodedVhost}`, {
        cache: 'no-store',
        next: {revalidate: 0},
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    });
}

export async function checkHealth() {
    return Promise.all([
        rabbitMQFetch('/health/checks/alarms', {
            cache: 'no-store',
            next: {revalidate: 0},
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        }),
        rabbitMQFetch('/health/checks/local-alarms', {
            cache: 'no-store',
            next: {revalidate: 0},
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        }),
        rabbitMQFetch('/health/checks/virtual-hosts', {
            cache: 'no-store',
            next: {revalidate: 0},
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        }),
    ]);
}

// Connection related functions
export async function closeConnection(name: string) {
    const response = await fetch(`/api/connections`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({name}),
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to close connection: ${errorText}`)
    }

    return response.json()
}

// Node statistics
export async function getNodeStats() {
    try {
        // First get overview to get node name
        const overview = await rabbitMQFetch('/overview');
        console.log('[getNodeStats] Overview:', overview);

        // Get the node name from overview
        const nodeName = overview.node;
        if (!nodeName) {
            console.error('[getNodeStats] No node name found in overview');
            return {mem_used: 0, uptime: 0};
        }

        // Get node stats
        console.log('[getNodeStats] Fetching stats for node:', nodeName);
        const nodeStats = await rabbitMQFetch(`/nodes/${nodeName}`);
        console.log('[getNodeStats] Node stats:', nodeStats);

        return {
            ...nodeStats,
            mem_used: nodeStats?.mem_used ?? 0,
            uptime: nodeStats?.uptime ?? 0
        };
    } catch (error) {
        console.error('[getNodeStats] Error:', error);
        return {mem_used: 0, uptime: 0};
    }
}

// Types
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

export interface ExchangeStats {
    message_stats?: {
        publish_in: number;
        publish_in_details: {
            rate: number;
        };
        publish_out: number;
        publish_out_details: {
            rate: number;
        };
    };
}

export interface ConnectionStats {
    recv_oct: number;
    send_oct: number;
    recv_oct_details: {
        rate: number;
    };
    send_oct_details: {
        rate: number;
    };
}

// Format utilities
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatRate(rate: number): string {
    if (rate === 0) return '0/s';
    if (rate < 1) return `${(rate * 100).toFixed(2)}%/s`;
    return `${rate.toFixed(2)}/s`;
}

export function formatUptime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

export const getRabbitMQBaseUrl = () => {
    const config = RABBITMQ_CONFIG
    return `http://${config.host}:${config.port}`
}

export const getRabbitMQHeaders = () => {
    const config = RABBITMQ_CONFIG
    return {
        'Authorization': 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64'),
        'Content-Type': 'application/json',
    }
}

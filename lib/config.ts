import { useAuth } from './auth'

export const RABBITMQ_CONFIG = {
  host: process.env.NEXT_PUBLIC_RABBITMQ_HOST,
  port: process.env.NEXT_PUBLIC_RABBITMQ_PORT,
  vhost: process.env.NEXT_PUBLIC_RABBITMQ_VHOST ,
  username: process.env.RABBITMQ_USERNAME,
  password: process.env.RABBITMQ_PASSWORD,
}

export const API_TIMEOUT_MS = process.env.NEXT_PUBLIC_RABBITMQ_API_TIMEOUT_MS
  ? parseInt(process.env.NEXT_PUBLIC_RABBITMQ_API_TIMEOUT_MS, 10)
  : 60000; // Default to 60 seconds (60000 ms)

export const getRabbitMQConfig = () => {
  const auth = useAuth.getState()
  
  return {
    host: RABBITMQ_CONFIG.host,
    port: RABBITMQ_CONFIG.port,
    vhost: RABBITMQ_CONFIG.vhost,
    username: auth.user?.username || RABBITMQ_CONFIG.username,
    password: RABBITMQ_CONFIG.password,
  }
}

// Helper to get base URL
export const getRabbitMQBaseUrl = () => {
  return `http://${RABBITMQ_CONFIG.host}:${RABBITMQ_CONFIG.port}`
}

// Helper to get auth headers using current auth state
// This function is now simplified for server-side use only, for direct calls
// from Server Components to RabbitMQ. Client-side calls use the /api proxy.
export const getRabbitMQAuthHeaders = () => {
  // Always use the server-side configured credentials from RABBITMQ_CONFIG in this file
  const credentials = Buffer.from(`${RABBITMQ_CONFIG.username}:${RABBITMQ_CONFIG.password}`).toString('base64');
  return {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json',
  };
}

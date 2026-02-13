export type ErrorType = 'CONNECTION' | 'AUTH' | 'TIMEOUT' | 'API' | 'UNKNOWN'

export class RabbitMQError extends Error {
  status: number
  type: ErrorType
  details?: string

  constructor(status: number, message: string, type: ErrorType = 'UNKNOWN', details?: string) {
    super(message)
    this.name = 'RabbitMQError'
    this.status = status
    this.type = type
    this.details = details
  }
}

export function classifyError(error: unknown): RabbitMQError {
  if (error instanceof RabbitMQError) return error

  if (error instanceof Error) {
    const msg = error.message.toLowerCase()

    if (msg.includes('timeout') || msg.includes('aborted')) {
      return new RabbitMQError(
        408,
        'Connection timed out. Check if RabbitMQ is running and accessible.',
        'TIMEOUT',
        error.message,
      )
    }

    if (msg.includes('econnrefused') || msg.includes('fetch failed')) {
      return new RabbitMQError(
        503,
        'Unable to connect to RabbitMQ. Check your connection settings.',
        'CONNECTION',
        error.message,
      )
    }

    if (msg.includes('401') || msg.includes('403')) {
      return new RabbitMQError(
        401,
        'Authentication failed. Check your credentials.',
        'AUTH',
        error.message,
      )
    }

    return new RabbitMQError(500, error.message, 'UNKNOWN', error.message)
  }

  return new RabbitMQError(500, 'An unexpected error occurred.', 'UNKNOWN', String(error))
}

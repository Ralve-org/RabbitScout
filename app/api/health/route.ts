import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Liveness probe for container orchestrators and the Docker HEALTHCHECK.
 * Intentionally unauthenticated and independent of RabbitMQ availability:
 * it reports that the dashboard itself is up.
 */
export async function GET() {
  return NextResponse.json({ status: 'ok' })
}

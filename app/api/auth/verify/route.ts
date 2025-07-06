import { getRabbitMQAuthHeaders, getRabbitMQBaseUrl } from "@/lib/config"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { username } = await request.json()
    
    // Note: RabbitMQ management API runs on port 15672
    const managementPort = process.env.NEXT_PUBLIC_RABBITMQ_PORT
    const host = process.env.NEXT_PUBLIC_RABBITMQ_HOST
    const url = `${getRabbitMQBaseUrl()}/api/whoami`
    
    console.log('Authentication attempt:', {
      host,
      port: managementPort,
      username,
      url
    })

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: getRabbitMQAuthHeaders(),
        next: { revalidate: 60 } // Cache for 60 seconds
      })

      if (!response.ok) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        )
      }

      const userData = await response.json()
      
      return NextResponse.json({
        authenticated: true,
        user: {
          username: userData.name,
          isAdmin: userData.tags.includes('administrator'),
          tags: userData.tags
        }
      })
    } catch (fetchError: unknown) {
      console.error('Fetch Error:', {
        message: fetchError instanceof Error ? fetchError.message : 'Unknown error',
        cause: fetchError instanceof Error ? fetchError.cause : undefined
      })
      return NextResponse.json(
        { error: 'Failed to connect to RabbitMQ server' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { validateCredentials } from '@/lib/rabbitmq/client'
import { setSessionCookie } from '@/lib/auth/session'
import { classifyError } from '@/lib/rabbitmq/errors'
import type { RabbitMQUser } from '@/lib/rabbitmq/types'

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 },
      )
    }

    const whoami = await validateCredentials(username, password)
    const tags = typeof whoami.tags === 'string' ? whoami.tags.split(',').map((t) => t.trim()) : []

    const user: RabbitMQUser = {
      username: whoami.name,
      isAdmin: tags.includes('administrator'),
      tags,
    }

    const credentials = Buffer.from(`${username}:${password}`).toString('base64')
    setSessionCookie(credentials, user)

    return NextResponse.json({ authenticated: true, user })
  } catch (err) {
    const error = classifyError(err)
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
}

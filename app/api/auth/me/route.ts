import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

/**
 * Returns the current user from the session cookie so the client store
 * survives full page reloads without re-authenticating.
 */
export async function GET() {
  const session = await getSessionFromCookie()
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
  return NextResponse.json({ authenticated: true, user: session.user })
}

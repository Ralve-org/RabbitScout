import { NextResponse } from 'next/server'
import { COOKIE_NAME } from '@/lib/auth/session'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete(COOKIE_NAME)
  return response
}

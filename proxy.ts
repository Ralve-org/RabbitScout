import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout', '/api/health']

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  const hasSession = request.cookies.has('rmq-session')

  if (isPublic) {
    // Redirect authenticated users away from login
    if (pathname === '/login' && hasSession) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  if (!hasSession) {
    // API calls get a proper 401 instead of a redirect-to-HTML,
    // so client fetches can detect session expiry cleanly.
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const loginUrl = new URL('/login', request.url)
    if (pathname !== '/') loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/).*)'],
}

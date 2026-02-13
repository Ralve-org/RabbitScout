import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout']

export function middleware(request: NextRequest) {
  // Block middleware-subrequest header (Next.js auth bypass CVE mitigation)
  if (request.headers.has('x-middleware-subrequest')) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  const hasSession = request.cookies.has('rmq-session')

  // Allow public paths always
  if (isPublic) {
    // Redirect authenticated users away from login
    if (pathname === '/login' && hasSession) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  // Protect everything else
  if (!hasSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/).*)'],
}

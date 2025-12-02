import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // SECURITY: Block requests with x-middleware-subrequest header to prevent authorization bypass
  // This protects against CVE-2024-XXXXX until Next.js is updated to 14.2.25+
  if (request.headers.has('x-middleware-subrequest')) {
    return new NextResponse('Forbidden', { status: 403 })
  }
  
  const authCookie = request.cookies.get('auth-storage')
  
  let isAuthenticated = false
  let userData = null
  
  try {
    if (authCookie?.value) {
      let cookieValue = authCookie.value
      try {
        cookieValue = decodeURIComponent(cookieValue)
      } catch (e) {
        // If decoding fails, use the raw value
      }
      
      const parsed = JSON.parse(cookieValue)
      isAuthenticated = parsed.state?.authenticated || false
      userData = parsed.state?.user
    }
  } catch (error) {
    console.error('Error parsing auth cookie:', error)
  }

  // Only log auth state for non-API routes to reduce noise
  if (!request.nextUrl.pathname.startsWith('/api')) {
    console.log('Auth state:', { isAuthenticated, path: request.nextUrl.pathname })
  }

  // Skip auth check for public API routes
  if (request.nextUrl.pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // Protect all routes except login
  if (!isAuthenticated && !request.nextUrl.pathname.startsWith('/login')) {
    const loginUrl = new URL('/login', request.url)
    console.log('Redirecting to:', loginUrl.toString())
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from login page
  if (isAuthenticated && request.nextUrl.pathname.startsWith('/login')) {
    const homeUrl = new URL('/', request.url)
    console.log('Redirecting to:', homeUrl.toString())
    return NextResponse.redirect(homeUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Protect app pages that should require an authenticated session.
// We currently use an MVP cookie-based session set by the FastAPI backend.
const PROTECTED_PREFIXES = ['/dashboard', '/chat', '/materials', '/study', '/c']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip Next internals and public files.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/landing') ||
    pathname.startsWith('/api')
  ) {
    return NextResponse.next()
  }

  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  if (!needsAuth) return NextResponse.next()

  // Session cookie name matches backend `settings.SESSION_COOKIE_NAME` default.
  // (If you change it server-side, update it here too.)
  const session = req.cookies.get('fe524_session')?.value
  if (session) return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = '/'
  url.searchParams.set('next', pathname)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

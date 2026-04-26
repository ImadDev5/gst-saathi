import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const userProtectedPaths = ['/dashboard', '/retail']
  const adminProtectedPaths = ['/admin']

  const isUserProtected = userProtectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  const isAdminProtected = adminProtectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  ) && request.nextUrl.pathname !== '/admin/signin'

  if (isAdminProtected) {
    const adminToken = request.cookies.get('admin_session')?.value
    if (!adminToken) {
      return NextResponse.redirect(new URL('/admin/signin', request.url))
    }
  }

  if (isUserProtected) {
    const token = request.cookies.get('trial_token')?.value
    if (!token) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/retail/:path*', '/admin/:path*'],
}

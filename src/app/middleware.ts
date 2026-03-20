import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. Get the session cookie
  const session = request.cookies.get('session_user_id');

  // 2. Define the path the user is trying to access
  const isDashboardPage = request.nextUrl.pathname.startsWith('/dashboard');

  // 3. If they are trying to reach the dashboard without a cookie, redirect them
  if (isDashboardPage && !session) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 4. If they ARE logged in and try to go to the login page, 
  // we could optionally redirect them to the dashboard
  if (request.nextUrl.pathname === '/' && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// 5. Tell Next.js which routes this middleware should run on
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
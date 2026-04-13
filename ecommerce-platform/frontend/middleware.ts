import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Routes that require an authenticated user */
const PROTECTED = ['/cart', '/checkout', '/orders', '/profile', '/admin'];
/** Routes only for admins */
const ADMIN_ONLY = ['/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read the access token from cookies (set during SSR login)
  // For client-side auth we rely on localStorage via Zustand; this guards SSR navigation.
  const token = request.cookies.get('access_token')?.value;

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  const isAdminRoute = ADMIN_ONLY.some((p) => pathname.startsWith(p));

  if (isProtected && !token) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  // Admin role check is also enforced at the component level via useAuthStore
  // and at the API level via Spring Security @PreAuthorize — this is an extra layer.
  if (isAdminRoute && token) {
    try {
      // Decode JWT payload (no signature verification in middleware — gateway does that)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const roles: string[] = payload.roles ?? [];
      if (!roles.includes('ADMIN')) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|auth).*)',
  ],
};

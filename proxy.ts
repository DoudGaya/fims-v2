import { withAuth } from "next-auth/middleware"
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Redirect already-authenticated users away from the signin page
    if (pathname === '/auth/signin' && token) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    const response = NextResponse.next();

    // Security Headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    if (pathname.startsWith('/api/')) {
      response.headers.set('Cache-Control', 'no-store, max-age=0');
    }

    return response;
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const { pathname } = req.nextUrl;

        // Allow signin page through — the middleware function handles auth'd user redirect
        if (pathname === '/auth/signin') {
          return true;
        }

        return !!token;
      },
    },
    pages: {
      signIn: '/auth/signin',
    }
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/analytics/:path*',
    '/farmers/:path*',
    '/farms/:path*',
    '/agents/:path*',
    '/clusters/:path*',
    '/users/:path*',
    '/certificates/:path*',
    '/maps/:path*',
    '/reports/:path*',
    '/settings/:path*',
    '/gis-map-google/:path*',
    '/api-keys/:path*',
    '/requests/:path*',
    '/profile/:path*',
    '/auth/signin',
  ],
};

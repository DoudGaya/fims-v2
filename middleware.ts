import { withAuth } from "next-auth/middleware"
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const response = NextResponse.next();

    // 1. Security Headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    if (req.nextUrl.pathname.startsWith('/api/')) {
      response.headers.set('Cache-Control', 'no-store, max-age=0');
    }

    return response;
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/auth/signin',
    }
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/farmers/:path*',
    '/agents/:path*',
    '/farms/:path*',
    '/clusters/:path*',
    '/settings/:path*',
    '/api/dashboard/:path*', // Protect API routes too (optional, but good practice)
  ],
};

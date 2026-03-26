import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
  pages: {
    signIn: '/auth/signin',
  },
});

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/analytics/:path*',
    '/farmers/:path*',
    '/agents/:path*',
    '/clusters/:path*',
    '/farms/:path*',
    '/certificates/:path*',
    '/users/:path*',
    '/gis-map-google/:path*',
    '/settings/:path*',
    '/api-keys/:path*',
    '/requests/:path*',
    '/profile/:path*',
  ],
};

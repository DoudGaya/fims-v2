import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import prisma from './prisma';
import ProductionLogger from './productionLogger';
import { getUserPermissions } from './permissions';
import { logSSOAttempt } from './sso/ssoAuditLog';

// Helper for retry logic (simple version)
const withRetry = async <T>(fn: () => Promise<T>, retries = 3): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return withRetry(fn, retries - 1);
    }
    throw error;
  }
};

export const authOptions: NextAuthOptions = {
  providers: [
    // Google OAuth Provider (SSO)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: false,
    })] : []),
    
    // Credentials Provider (Existing)
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Find user in database with roles and permissions
          const user = await withRetry(async () => {
            return await prisma.user.findUnique({
              where: {
                email: credentials.email
              },
              include: {
                userRoles: {
                  include: {
                    role: {
                      select: {
                        id: true,
                        name: true,
                        permissions: true,
                        isSystem: true
                      }
                    }
                  }
                }
              }
            });
          });

          if (!user || !user.password) {
            ProductionLogger.warn(`Login attempt for non-existent user: ${credentials.email}`);
            return null;
          }

          // Check if user account is active
          if (user.isActive === false) {
            ProductionLogger.warn(`Login attempt for inactive user: ${credentials.email}`);
            throw new Error('Your account has been deactivated. Please contact the administrator.');
          }

          // Block agents from web access - they can only use mobile app
          if (user.role === 'agent') {
            ProductionLogger.warn(`Agent attempted web login: ${credentials.email}`);
            throw new Error('Agents can only access the mobile application. Please download the CCSA mobile app.');
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

          if (!isPasswordValid) {
            return null;
          }

          // Get user permissions from roles
          const permissions = await getUserPermissions(user.id);

          // Return user object (this will be stored in JWT)
          return {
            id: user.id,
            email: user.email,
            name: user.displayName || user.email,
            role: user.role, // Keep simple role for backwards compatibility
            roles: user.userRoles.map(ur => ({
              id: ur.role.id,
              name: ur.role.name,
              permissions: ur.role.permissions
            })),
            permissions: permissions,
          };
        } catch (error: any) {
          ProductionLogger.error('Auth error:', error.message);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.permissions = (user as any).permissions;
        token.roles = (user as any).roles;
      }
      
      // Handle SSO sign in
      if (account && account.provider === 'google') {
        // Log successful SSO
        if (token.email) {
           await logSSOAttempt(
            token.email, 
            'google', 
            'success', 
            null, 
            { accountId: account.providerAccountId },
            null, // IP address not easily available here without request context
            null
          );
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).permissions = token.permissions;
        (session.user as any).roles = token.roles;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      // Custom logic for SSO sign in
      if (account?.provider === 'google') {
        if (!user.email) return false;
        
        try {
          // Check if user exists
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email }
          });
          
          if (!existingUser) {
            await logSSOAttempt(user.email, 'google', 'user_not_found', 'User does not exist');
            return false; // Or true if you want to allow auto-registration
          }
          
          if (!existingUser.isActive) {
            await logSSOAttempt(user.email, 'google', 'error', 'Account inactive');
            return false;
          }
          
          // Update SSO fields
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              ssoProvider: 'google',
              ssoProviderId: account.providerAccountId,
              ssoEmail: user.email,
              lastSSOLogin: new Date(),
              isSSOEnabled: true // Enable SSO for this user
            }
          });
          
          return true;
        } catch (error) {
          console.error('SSO Sign in error:', error);
          return false;
        }
      }
      return true;
    },
    async redirect({ url, baseUrl }) {
      // Use NEXTAUTH_URL if set, otherwise use baseUrl from request
      const validBaseUrl = process.env.NEXTAUTH_URL || baseUrl;
      
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${validBaseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === validBaseUrl) return url;
      return `${validBaseUrl}/dashboard`;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  debug: process.env.NODE_ENV === 'development',
};

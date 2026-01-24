'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

function SignInContent() {
  const { data: session, status } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ssoError, setSSOError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  // Handle SSO errors from query params
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      if (errorParam === 'user_not_found') {
        setSSOError('Your email is not registered. Contact the administrator.');
      } else if (errorParam === 'sso_disabled') {
        setSSOError('SSO is not enabled for your account. Use credentials instead.');
      } else if (errorParam === 'no_dashboard_access') {
        setSSOError('You do not have permission to access the dashboard.');
      } else if (errorParam === 'no_permissions') {
        setSSOError('You do not have any permissions assigned. Contact the administrator.');
      } else if (errorParam === 'callback') {
        setSSOError('An error occurred during sign-in. Please try again.');
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // Handle different types of errors
        if (result.error === 'CredentialsSignin') {
          setError('Invalid email or password');
        } else if (result.error.includes('not authorized')) {
          setError('This email is not authorized to access the system. Please contact the administrator.');
        } else if (result.error.includes('mobile application')) {
          setError('Agents can only access the mobile application. Please download the CCSA mobile app.');
        } else if (result.error.includes('deactivated')) {
          setError('Your account has been deactivated. Please contact the administrator.');
        } else {
          setError(result.error || 'Authentication failed. Please try again.');
        }
      } else {
        // After successful login, go to dashboard
        router.push('/dashboard');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setSSOError('');
    try {
      // Redirect to dashboard after successful Google sign-in
      const result = await signIn('google', { 
        callbackUrl: '/dashboard',
        redirect: true // Let NextAuth handle the redirect
      });
      
      // If we get here with an error (shouldn't happen with redirect: true)
      if (result?.error) {
        setSSOError('An error occurred during Google sign-in.');
        setLoading(false);
      }
    } catch (error) {
      setSSOError('An error occurred during Google sign-in.');
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 items-center justify-center bg-gray-50">
      <div
        style={{
          backgroundImage: `url(/home-bannner.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
        className="hidden bg-black/50 bg-blend-overlay h-screen lg:block"
      ></div>
      <div className="max-w-xl mx-auto w-full space-y-8 p-4">
        <div className="text-center flex flex-col items-center justify-center space-y-2">
          <div className="relative h-24 w-full mb-4">
            <Image
              src="/ccsa-logo.png"
              alt="Sign In Illustration"
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </div>
          <div className="mx-auto w-full flex items-center text-center rounded-lg justify-center">
            <span className="text-ccsa-blue font-semibold text-3xl">
              Farmers Information Management System
            </span>
          </div>
          <h2 className="text-center text-2xl">
            Centre for Climate Smart Agriculture
          </h2>
          <small className="text-lg">Cosmopolitan University Abuja</small>
        </div>
        <div className="bg-white py-8 px-4 max-w-sm mx-auto shadow sm:rounded-lg sm:px-10">
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md flex flex-col space-y-5 shadow-sm">
              <div>
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-950/80 focus:border-blue-950/80 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-950/80 focus:border-blue-950/80 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {ssoError && (
              <div className="bg-orange-100 border border-orange-400 text-orange-700 px-4 py-3 rounded">
                {ssoError}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-950 hover:bg-blue-950/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-950/80 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <div className="spinner px-4"></div> : 'Sign in'}
              </button>
            </div>

            {/* SSO Options */}
            {/* Note: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID check is done at build time or runtime, 
                but for client component it's better to check if provider is available or just render it if configured.
                Here we assume it's configured if env var is present.
            */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#1f2937"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#1f2937"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#1f2937"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#1f2937"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="ml-2">Google</span>
            </button>

            <div className="text-center">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-blue-950 hover:text-blue-950/80"
              >
                Forgot your password?
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInContent />
    </Suspense>
  );
}

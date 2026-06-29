'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff, Lock, Mail, ShieldCheck, Sprout } from 'lucide-react';
import { PageLoader, ButtonLoader } from '@/components/ui/loading-spinner';

function SignInContent() {
  const { status } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    } catch {
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
    } catch {
      setSSOError('An error occurred during Google sign-in.');
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return <PageLoader />;
  }

  return (
    <main className="grid min-h-dvh bg-[#F8FAFC] text-[#1E293B] lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)]">
      <section className="relative hidden min-h-dvh overflow-hidden lg:block">
        <Image
          src="/home-bannner.jpg"
          alt="Climate-smart agriculture field"
          fill
          className="object-cover"
          sizes="55vw"
          priority
        />
        <div className="absolute inset-0 brand-gradient-dark opacity-90" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(1,51,88,0.1)_0%,rgba(1,21,34,0.42)_100%)]" />
        <div className="relative flex min-h-dvh flex-col justify-between p-8 text-white xl:p-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white">
              <Image src="/ccsa-logo.png" alt="CCSA" width={32} height={32} className="object-contain" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#DCEAF3]">CCSA FIMS</p>
              <p className="text-xs text-[#DCEAF3]">Cosmopolitan University Abuja</p>
            </div>
          </div>

          <div className="max-w-xl pb-6">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#DCEAF3]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure operations portal
            </div>
            <h1 className="text-3xl font-bold leading-tight tracking-normal xl:text-4xl">
              Farmers Information Management System
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-[#DCEAF3]">
              Manage farmer records, farms, clusters, field agents, GIS insights, and agri-business partnerships from one trusted platform.
            </p>
            <div className="mt-6 grid max-w-md grid-cols-3 gap-3">
              {[
                ['60k+', 'Farmers'],
                ['KYB', 'Partners'],
                ['GIS', 'Farm data'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-md border border-white/15 bg-white/10 p-3 backdrop-blur">
                  <p className="text-xl font-bold">{value}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#DCEAF3]">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-[#DCEAF3]">
            Centre for Climate Smart Agriculture
          </p>
        </div>
      </section>

      <section className="flex min-h-dvh overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-sm flex-col justify-center">
          <div className="mb-5 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-[#DCEAF3] bg-white">
              <Image src="/ccsa-logo.png" alt="CCSA" width={32} height={32} className="object-contain" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#013358]">CCSA FIMS</p>
              <p className="text-xs text-[#64748B]">Cosmopolitan University Abuja</p>
            </div>
          </div>

          <div className="rounded-lg border border-[#DCEAF3] bg-white p-4 shadow-[0_18px_50px_rgba(1,51,88,0.08)] sm:p-5">
            <div className="mb-5">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-[#F3F8FC] text-[#013358]">
                <Sprout className="h-4 w-4" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#013358]">Welcome back</p>
              <h1 className="mt-1.5 text-xl font-bold tracking-normal text-[#1E293B]">
                Sign in to FIMS
              </h1>
              <p className="mt-2 text-xs leading-5 text-[#64748B]">
                Access the CCSA farmer, farm, agent, analytics, and partnership workspace.
              </p>
            </div>

            <form className="space-y-3.5" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-[#334155]">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 text-[#94A3B8]" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="block h-10 w-full rounded-md border border-[#DCEAF3] bg-white px-9 text-sm text-[#1E293B] outline-none transition placeholder:text-[#94A3B8] focus:border-[#02426F] focus:ring-[3px] focus:ring-[#DCEAF3]"
                    placeholder="name@organization.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-xs font-semibold text-[#334155]">
                    Password
                  </label>
                  <Link href="/auth/forgot-password" className="text-xs font-semibold text-[#013358] hover:text-[#02426F]">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 text-[#94A3B8]" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="block h-10 w-full rounded-md border border-[#DCEAF3] bg-white px-9 pr-11 text-sm text-[#1E293B] outline-none transition placeholder:text-[#94A3B8] focus:border-[#02426F] focus:ring-[3px] focus:ring-[#DCEAF3]"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2 top-2 flex h-6 w-7 items-center justify-center rounded text-[#64748B] hover:bg-[#F3F8FC] hover:text-[#013358]"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">
                  {error}
                </div>
              )}

              {ssoError && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-800">
                  {ssoError}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-10 w-full items-center justify-center rounded-md bg-[#013358] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#02426F] focus:outline-none focus:ring-2 focus:ring-[#02426F] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <ButtonLoader className="mx-4" /> : 'Sign in'}
              </button>

              <div className="relative py-0.5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#E5E7EB]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 font-semibold uppercase tracking-wide text-[#94A3B8]">
                    Or continue with
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="inline-flex h-10 w-full items-center justify-center rounded-md border border-[#DCEAF3] bg-white px-4 text-sm font-bold text-[#1E293B] transition hover:bg-[#F3F8FC] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#013358"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#02426F"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#10B981"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#F59E0B"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="ml-2">Google</span>
              </button>
            </form>

            <div className="mt-5 border-t border-[#E5E7EB] pt-4">
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-[#64748B]">
                <Link href="/privacy" className="hover:text-[#013358] hover:underline">
                  Privacy Policy
                </Link>
                <Link href="/delete-account" className="hover:text-[#013358] hover:underline">
                  Delete Account
                </Link>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-xs leading-5 text-[#64748B]">
            Authorized access only. Field agents should use the CCSA mobile application.
          </p>
        </div>
      </section>
    </main>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={<PageLoader />}>
      <SignInContent />
    </Suspense>
  );
}

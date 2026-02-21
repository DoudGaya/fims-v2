'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const errorMessages: Record<string, { title: string; description: string }> = {
  Configuration: {
    title: 'Authentication Configuration Error',
    description: 'There is a problem with the server configuration. Please contact your administrator.',
  },
  AccessDenied: {
    title: 'Access Denied',
    description: 'You do not have permission to sign in.',
  },
  Verification: {
    title: 'Verification Error',
    description: 'The verification token has expired or has already been used.',
  },
  OAuthSignin: {
    title: 'OAuth Sign In Error',
    description: 'Error occurred during OAuth sign in.',
  },
  OAuthCallback: {
    title: 'OAuth Callback Error',
    description: 'Error occurred during OAuth callback.',
  },
  OAuthCreateAccount: {
    title: 'OAuth Account Creation Error',
    description: 'Could not create OAuth provider user in the database.',
  },
  EmailCreateAccount: {
    title: 'Email Account Creation Error',
    description: 'Could not create email provider user in the database.',
  },
  Callback: {
    title: 'Callback Error',
    description: 'Error occurred during callback processing.',
  },
  OAuthAccountNotLinked: {
    title: 'Account Not Linked',
    description: 'To confirm your identity, sign in with the same account you used originally.',
  },
  EmailSignin: {
    title: 'Email Sign In Error',
    description: 'Check your email address.',
  },
  CredentialsSignin: {
    title: 'Sign In Failed',
    description: 'Invalid email or password. Please try again.',
  },
  SessionRequired: {
    title: 'Session Required',
    description: 'You must be signed in to access this page.',
  },
  Default: {
    title: 'Authentication Error',
    description: 'An unexpected error occurred. Please try again.',
  },
};

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'Default';
  
  const errorInfo = errorMessages[error] || errorMessages.Default;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl">{errorInfo.title}</CardTitle>
          <CardDescription className="text-base">
            {errorInfo.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error !== 'Default' && (
            <p className="text-center text-sm text-muted-foreground">
              Error code: <code className="rounded bg-muted px-1.5 py-0.5">{error}</code>
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href="/auth/signin">
              Back to Sign In
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">
              Go to Home
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

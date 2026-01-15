'use client';

import { SessionProvider } from 'next-auth/react';
import { PermissionProvider } from './PermissionProvider';
import { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <PermissionProvider>
        {children}
      </PermissionProvider>
    </SessionProvider>
  );
}

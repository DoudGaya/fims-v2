import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const dynamic = 'force-dynamic';

export default async function PortalIndexPage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect('/portal/dashboard');
  } else {
    redirect('/portal/login');
  }
}


import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { PortalBrandFooter } from '@/components/portal/portal-brand-footer';

const navLinks = [
  { label: 'Home', href: '/fims' },
  { label: 'Agri-Business', href: '/agribusiness' },
  { label: 'API Docs', href: '/docs' },
  { label: 'Request Access', href: '/access' },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      {/* Top nav */}
      <header className="sticky top-0 z-30 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          {/* Brand */}
          <Link href="/fims" className="flex items-center gap-3 shrink-0">
            <div className="relative h-9 w-24">
              <Image
                src="/ccsa-logo.png"
                alt="CCSA"
                fill
                className="object-contain object-left"
                sizes="96px"
                priority
              />
            </div>
            <span className="hidden sm:block h-5 w-px bg-gray-300 dark:bg-gray-700" />
            <span className="hidden sm:block text-sm font-semibold text-[#013358] dark:text-blue-300 tracking-wide uppercase">
              FIMS
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-[#013358] dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <Link
              href="/access"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-[#013358] text-white rounded-lg hover:bg-[#01264a] transition-colors"
            >
              Get API Access
            </Link>
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden border-t border-gray-100 dark:border-gray-800">
          <div className="flex justify-around py-1">
            {navLinks.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-[#013358] dark:hover:text-white"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <PortalBrandFooter />
    </div>
  );
}

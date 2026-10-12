'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const navLinks = [
  { label: 'Home', href: '/fims' },
  { label: 'Agri-Business', href: '/agribusiness' },
  { label: 'API Docs', href: '/docs' },
  { label: 'Request Access', href: '/access' },
];

export function PortalNavHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#071320]/95 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link href="/fims" className="flex items-center gap-3 shrink-0 group">
          <div className="relative h-9 w-24 transition-transform group-hover:scale-[1.02]">
            <Image
              src="/ccsa-logo.png"
              alt="CCSA"
              fill
              className="object-contain object-left"
              sizes="96px"
              priority
            />
          </div>
          <span className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-[#013358] dark:text-blue-300 tracking-wider uppercase">
              FIMS
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
              B2B Portal
            </span>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ label, href }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  isActive
                    ? 'text-[#013358] dark:text-white bg-slate-100 dark:bg-slate-800'
                    : 'text-slate-600 dark:text-slate-300 hover:text-[#013358] dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right Nav Actions */}
        <div className="flex items-center gap-3">
          {pathname.startsWith('/portal/register') ? (
            <Link
              href="/portal/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-[#013358] dark:text-blue-300 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Sign In
            </Link>
          ) : (
            <Link
              href="/portal/register"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#013358] hover:bg-[#01264a] dark:bg-emerald-600 dark:hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
            >
              Register Portal
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

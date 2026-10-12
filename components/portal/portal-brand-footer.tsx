'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Activity, Globe2, FileCode, CheckCircle2 } from 'lucide-react';

export function PortalBrandFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-slate-200 dark:border-slate-800 bg-[#F9FBFC] dark:bg-[#040C16] text-slate-600 dark:text-slate-400">
      {/* Subtle Minimalist Geospatial Background Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035] dark:opacity-[0.06]"
        aria-hidden="true"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Subtle Geometric Graphic Lines */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        {/* Top Feature Visual Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-10 border-b border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/70 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800/70 backdrop-blur-xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">99.9% Uptime SLA</p>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Sub-200ms latency across 36 states</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/70 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800/70 backdrop-blur-xs">
            <div className="w-8 h-8 rounded-lg bg-[#013358]/10 dark:bg-blue-500/20 text-[#013358] dark:text-blue-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">NDPR Compliant</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Automated SHA-256 PII redaction</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/70 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800/70 backdrop-blur-xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Globe2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">GIS Precision Feeds</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">43,000+ verified GPS polygon plots</p>
            </div>
          </div>
        </div>

        {/* Main Content Columns */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 py-10">
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative h-8 w-24">
                <Image
                  src="/ccsa-logo.png"
                  alt="CCSA"
                  fill
                  className="object-contain object-left"
                  sizes="96px"
                />
              </div>
              <span className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
              <span className="text-xs font-bold text-[#013358] dark:text-blue-300 tracking-wider uppercase">
                CCSA FIMS
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
              Nigeria&apos;s authoritative farmer information management system. Delivering auditable agricultural registry data, crop yield telemetry, and GIS field boundaries for financial institutions and agro-enterprises.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
              <span>Cosmopolitan University Abuja</span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">B2B Commercial Gateway</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-3">
              Data Feeds
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/docs" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Farmer Registry API
                </Link>
              </li>
              <li>
                <Link href="/docs" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  GIS Farm Polygons
                </Link>
              </li>
              <li>
                <Link href="/docs" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  State & LGA Clusters
                </Link>
              </li>
              <li>
                <Link href="/docs" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Aggregated Analytics
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-3">
              Developers
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/docs" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  API Reference & Schema
                </Link>
              </li>
              <li>
                <Link href="/portal/register" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Commercial Pricing
                </Link>
              </li>
              <li>
                <Link href="/portal/login" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Client Portal
                </Link>
              </li>
              <li>
                <Link href="/access" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Request Trial Access
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-3">
              Trust & Legal
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/privacy" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  NDPR Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Data Protection Governance
                </Link>
              </li>
              <li>
                <Link href="/agribusiness" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Agribusiness Partnership
                </Link>
              </li>
              <li>
                <Link href="/delete-account" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Data Subject Rights
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 dark:text-slate-500">
          <p>
            &copy; {new Date().getFullYear()} Centre for Climate Smart Agriculture (CCSA), Cosmopolitan University Abuja. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              API Gateway v1.0 Live
            </span>
            <span>•</span>
            <span>ISO 27001 & NDPR Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

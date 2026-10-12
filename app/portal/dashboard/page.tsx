'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  KeyRound,
  CreditCard,
  Code2,
  Copy,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
  LogOut,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ChevronsUpDown,
  ShieldCheck,
  Terminal,
  Activity,
  Layers,
  Database,
  Lock,
  Globe2,
  FileText,
  SlidersHorizontal,
  LayoutDashboard,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ClientPortalDashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [portalData, setPortalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'keys' | 'playground' | 'billing' | 'docs'>('overview');

  // Code snippet language
  const [selectedLang, setSelectedLang] = useState<'curl' | 'python' | 'node'>('curl');

  // New Key Modal
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyDesc, setNewKeyDesc] = useState('');
  const [generatingKey, setGeneratingKey] = useState(false);
  const [generatedKeyResult, setGeneratedKeyResult] = useState<any>(null);

  // Upgrade Modal
  const [upgradingTier, setUpgradingTier] = useState<string | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  // Copy helper
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchPortalData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/portal/me');
      if (res.status === 401) {
        router.push('/portal/login');
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setPortalData(data);
      }
    } catch (err) {
      console.error('Error fetching portal data:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/portal/login');
    } else if (status === 'authenticated') {
      fetchPortalData();
    }
  }, [status, router, fetchPortalData]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingKey(true);
    try {
      const res = await fetch('/api/portal/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName, description: newKeyDesc }),
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedKeyResult(data.apiKey);
        setNewKeyName('');
        setNewKeyDesc('');
        fetchPortalData();
      } else {
        alert(data.error || 'Failed to create key');
      }
    } catch {
      alert('Error creating key');
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action is irreversible.')) return;
    try {
      const res = await fetch(`/api/portal/keys/${keyId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchPortalData();
      } else {
        alert('Failed to revoke key');
      }
    } catch {
      alert('Error revoking key');
    }
  };

  const handleUpgradeCheckout = async (targetTier: string) => {
    setUpgradeLoading(true);
    setUpgradingTier(targetTier);
    try {
      const res = await fetch('/api/portal/billing/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetTier }),
      });
      const data = await res.json();
      if (res.ok && data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        alert(data.error || 'Checkout initialization failed');
      }
    } catch {
      alert('Failed to connect to billing service');
    } finally {
      setUpgradeLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 3000);
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-[#070C14] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <span className="text-xs font-mono text-slate-400">Loading FIMS Portal Workspace...</span>
      </div>
    );
  }

  const org = portalData?.organization;
  const user = portalData?.user;
  const paymentAlert = searchParams.get('payment');
  const isAccountPaid = org?.isPaid;
  const pendingInvoice = org?.pendingInvoice;

  // Primary active token prefix or masked fallback
  const primaryKey = portalData?.apiKeys?.[0];
  const activeKeyDisplay = isAccountPaid && primaryKey?.isActive
    ? `${primaryKey.keyPrefix}••••••••••••••••••••••••••••••••`
    : 'fims_live_••••••••••••••••••••••••••••••••';

  return (
    <div className="min-h-screen bg-[#070B12] text-slate-100 flex overflow-hidden font-sans antialiased">
      {/* 1. Left Dark Sidebar (shadcn component styling) */}
      <aside className="w-64 shrink-0 bg-[#0A0F1A] border-r border-slate-800/80 flex flex-col justify-between hidden md:flex select-none">
        <div className="flex flex-col">
          {/* Org Switcher Header */}
          <div className="p-3 border-b border-slate-800/80">
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-100 truncate">{org?.name || 'My Organization'}</p>
                  <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>{org?.planName || org?.tier}</span>
                  </p>
                </div>
              </div>
              <ChevronsUpDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            </div>
          </div>

          {/* Sidebar Section: Platform */}
          <div className="px-3 py-3 space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Platform
            </p>

            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                activeTab === 'overview'
                  ? 'bg-slate-800/90 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('keys')}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                activeTab === 'keys'
                  ? 'bg-slate-800/90 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>API Keys</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                {portalData?.apiKeys?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('playground')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                activeTab === 'playground'
                  ? 'bg-slate-800/90 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Interactive Playground</span>
            </button>

            <button
              onClick={() => setActiveTab('docs')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                activeTab === 'docs'
                  ? 'bg-slate-800/90 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Code2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Documentation</span>
            </button>
          </div>

          {/* Sidebar Section: Data Streams & Feeds */}
          <div className="px-3 py-2 space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Data Feeds & Billing
            </p>

            <div className="px-3 py-1.5 text-xs text-slate-400 flex items-center gap-2">
              <span className="text-slate-600 font-mono text-[11px]">#</span>
              <span>Farmer Registry</span>
              <span className="ml-auto text-[9px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 px-1 rounded">Live</span>
            </div>

            <div className="px-3 py-1.5 text-xs text-slate-400 flex items-center gap-2">
              <span className="text-slate-600 font-mono text-[11px]">#</span>
              <span>Farm Polygons (GIS)</span>
              <span className="ml-auto text-[9px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 px-1 rounded">Live</span>
            </div>

            <div className="px-3 py-1.5 text-xs text-slate-400 flex items-center gap-2">
              <span className="text-slate-600 font-mono text-[11px]">#</span>
              <span>Cluster Analytics</span>
              <span className="ml-auto text-[9px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 px-1 rounded">Live</span>
            </div>

            <button
              onClick={() => setActiveTab('billing')}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                activeTab === 'billing'
                  ? 'bg-slate-800/90 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Billing & Invoices</span>
              </div>
              {!isAccountPaid && (
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Due
                </span>
              )}
            </button>
          </div>
        </div>

        {/* User Account Footer */}
        <div className="p-3 border-t border-slate-800/80">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/40 border border-slate-800/60">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 shrink-0">
                {user?.name ? user.name[0]?.toUpperCase() : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-200 truncate">{user?.name || user?.email}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/portal/login' })}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800/60 rounded-lg transition-colors shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Main Workspace Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header & Breadcrumbs Toolbar */}
        <header className="h-14 border-b border-slate-800/80 bg-[#0A0F1A]/90 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2 text-xs">
            <Link href="/fims" className="text-slate-400 hover:text-slate-200 transition-colors">
              FIMS Portal
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="font-semibold text-slate-200 capitalize">
              {activeTab === 'overview' ? 'Commercial Dashboard' : activeTab}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>API Gateway Online • 99.9% SLA</span>
            </div>

            <Link
              href="/docs"
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors px-2 py-1"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">REST Docs</span>
            </Link>

            <Button
              size="sm"
              variant="outline"
              onClick={fetchPortalData}
              className="h-7 px-2.5 text-xs text-slate-400 border-slate-800 hover:bg-slate-800/60 hover:text-slate-200"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        </header>

        {/* Dashboard Main Content */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Payment Status Notifications */}
          {paymentAlert === 'success' && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="font-semibold">
                  Payment confirmed! Your commercial subscription is active and live API keys are enabled.
                </span>
              </div>
              <Button size="sm" variant="ghost" onClick={fetchPortalData} className="text-xs text-emerald-300 hover:bg-emerald-900/40">
                Dismiss
              </Button>
            </div>
          )}

          {/* 3 Top Rounded Metric Cards (matching reference image) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Monthly Quota Usage */}
            <div className="bg-[#0D1424] border border-slate-800/80 rounded-2xl p-5 space-y-3 shadow-xs">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Monthly Query Quota</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white">
                      {org?.currentUsage?.toLocaleString() || 0}
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      / {org?.monthlyQuota?.toLocaleString() || 0} calls
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-emerald-400">
                  {org?.usagePercentage || 0}% Used
                </span>
              </div>

              {/* Minimalist Emerald Progress Bar */}
              <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, org?.usagePercentage || 0)}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
                <span>Reset in {org?.daysRemaining || 30} days</span>
                <span>Rate limit: {primaryKey?.rateLimit || 120} req/min</span>
              </div>
            </div>

            {/* Card 2: Subscription & Payment Status */}
            <div className="bg-[#0D1424] border border-slate-800/80 rounded-2xl p-5 space-y-3 shadow-xs">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Commercial Tier</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-xl font-black text-white">
                      {org?.planName || org?.tier}
                    </span>
                  </div>
                </div>
                {isAccountPaid ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-800 text-amber-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Awaiting Payment
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400">
                {isAccountPaid
                  ? `Cycle ends ${new Date(org?.billingCycleEnd || Date.now()).toLocaleDateString()}`
                  : 'Settle pending invoice to activate live query quota'}
              </p>

              <div className="pt-1">
                {!isAccountPaid && pendingInvoice ? (
                  <Button
                    size="sm"
                    onClick={() =>
                      (window.location.href = `/portal/billing/mock-checkout?reference=${encodeURIComponent(
                        pendingInvoice.transactionRef
                      )}&amount=${Number(pendingInvoice.amount) * 100}`)
                    }
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-7 text-xs rounded-lg"
                  >
                    Complete Payment (₦{Number(pendingInvoice.amount).toLocaleString()})
                  </Button>
                ) : (
                  <button
                    onClick={() => setActiveTab('billing')}
                    className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>Manage Subscription</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Card 3: Gateway Health & Compliance */}
            <div className="bg-[#0D1424] border border-slate-800/80 rounded-2xl p-5 space-y-3 shadow-xs">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Telemetry & Governance</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-400">99.9%</span>
                  <span className="text-xs font-medium text-slate-400">Data SLA Uptime</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-400 pt-1">
                <div className="flex items-center gap-2 text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>NDPR Automated PII Redaction Active</span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <Activity className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Sub-200ms API response latency</span>
                </div>
              </div>
            </div>
          </div>

          {/* Large Main Panel Below the 3 Cards (matching reference image) */}
          <div className="bg-[#0D1424] border border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
            {/* View Tab Headers */}
            <div className="flex border-b border-slate-800/80 px-4 sm:px-6 gap-6 text-xs font-semibold overflow-x-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors ${
                  activeTab === 'overview'
                    ? 'border-emerald-500 text-emerald-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Integration Overview
              </button>

              <button
                onClick={() => setActiveTab('keys')}
                className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors ${
                  activeTab === 'keys'
                    ? 'border-emerald-500 text-emerald-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <KeyRound className="w-4 h-4" />
                API Keys
                {!isAccountPaid && (
                  <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1 rounded">Locked</span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('playground')}
                className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors ${
                  activeTab === 'playground'
                    ? 'border-emerald-500 text-emerald-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-4 h-4" />
                Quick Start & Playground
              </button>

              <button
                onClick={() => setActiveTab('billing')}
                className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors ${
                  activeTab === 'billing'
                    ? 'border-emerald-500 text-emerald-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Invoices & Plans
              </button>

              <button
                onClick={() => setActiveTab('docs')}
                className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors ${
                  activeTab === 'docs'
                    ? 'border-emerald-500 text-emerald-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 className="w-4 h-4" />
                API Specs & Schemas
              </button>
            </div>

            {/* TAB CONTENT: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="p-6 space-y-6">
                {/* Critical Payment Banner if Unpaid */}
                {!isAccountPaid && (
                  <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/60 space-y-3">
                    <div className="flex items-start gap-3">
                      <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-amber-300">
                          Live API Key Locked — Awaiting Payment Settlement
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Your account has been onboarded under the <strong>{org?.planName}</strong> plan. Under our commercial data governance rules, production API keys and queries are unlocked once payment is confirmed.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      {pendingInvoice ? (
                        <Button
                          size="sm"
                          onClick={() =>
                            (window.location.href = `/portal/billing/mock-checkout?reference=${encodeURIComponent(
                              pendingInvoice.transactionRef
                            )}&amount=${Number(pendingInvoice.amount) * 100}`)
                          }
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 rounded-lg shadow-xs"
                        >
                          Complete Payment (₦{Number(pendingInvoice.amount).toLocaleString()})
                          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => setActiveTab('billing')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 rounded-lg"
                        >
                          View Invoices
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Primary Live Key Display */}
                <div className="bg-[#090E18] p-4 sm:p-5 rounded-xl border border-slate-800/80 space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Production Authorization Header</h4>
                      <p className="text-[11px] text-slate-400">
                        Pass this token in the <code>Authorization: Bearer</code> header for all <code>/api/v1/*</code> endpoints.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isAccountPaid ? (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                          Live Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800">
                          Locked (Payment Required)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-[#05080E] p-3 rounded-lg border border-slate-800">
                    <span className="font-mono text-xs text-emerald-400 select-all truncate flex-1">
                      {activeKeyDisplay}
                    </span>
                    {isAccountPaid && primaryKey && (
                      <button
                        onClick={() => copyToClipboard(primaryKey.keyPrefix, 'primary_copy')}
                        className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 font-sans shrink-0 px-2 py-1 rounded hover:bg-slate-800"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedKey === 'primary_copy' ? 'Copied Prefix' : 'Copy'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Available Commercial Data Endpoints */}
                <div>
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">
                    Available Commercial Feeds
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-[#090E18] border border-slate-800/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-emerald-400">/api/v1/farmers</span>
                        <span className="text-[10px] font-semibold text-slate-400">64k+ records</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Query verified farmer profiles, LGA geography, and crop categories. Sensitive PII redacted.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#090E18] border border-slate-800/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-emerald-400">/api/v1/farms</span>
                        <span className="text-[10px] font-semibold text-slate-400">43k+ plots</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        GeoJSON farm boundaries, hectare telemetry, and crop yield estimations.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#090E18] border border-slate-800/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-emerald-400">/api/v1/analytics</span>
                        <span className="text-[10px] font-semibold text-slate-400">Real-time</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Aggregated cluster statistics across all 36 Nigerian states and FCT.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: API KEYS */}
            {activeTab === 'keys' && (
              <div className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">Client API Credentials</h3>
                    <p className="text-xs text-slate-400">
                      Manage secret keys for programmatic communication with FIMS.
                    </p>
                  </div>

                  <Button
                    onClick={() => {
                      if (!isAccountPaid) {
                        alert('Live keys can only be generated after payment is settled.');
                        return;
                      }
                      setGeneratedKeyResult(null);
                      setShowKeyModal(true);
                    }}
                    disabled={!isAccountPaid}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 font-bold rounded-lg shadow-xs disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Generate New Key
                  </Button>
                </div>

                {!isAccountPaid && (
                  <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/60 text-xs text-amber-300 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Live key creation is disabled until invoice payment is confirmed.</span>
                    </div>
                    {pendingInvoice && (
                      <Button
                        size="sm"
                        onClick={() =>
                          (window.location.href = `/portal/billing/mock-checkout?reference=${encodeURIComponent(
                            pendingInvoice.transactionRef
                          )}&amount=${Number(pendingInvoice.amount) * 100}`)
                        }
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-7 font-bold rounded"
                      >
                        Settle Invoice
                      </Button>
                    )}
                  </div>
                )}

                <div className="divide-y divide-slate-800 border border-slate-800/80 rounded-xl overflow-hidden bg-[#090E18]">
                  {portalData?.apiKeys?.map((k: any) => (
                    <div key={k.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-200 bg-[#05080E] px-2.5 py-1 rounded border border-slate-800">
                            {isAccountPaid && k.isActive
                              ? `${k.keyPrefix}••••••••••••••••••••••••`
                              : 'fims_live_••••••••••••••••••••••••'}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              isAccountPaid && k.isActive
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-amber-950 text-amber-400 border border-amber-800'
                            }`}
                          >
                            {isAccountPaid && k.isActive ? 'Active' : 'Locked'}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-300">{k.name}</p>
                        <div className="flex gap-3 text-[11px] text-slate-500 font-mono">
                          <span>Created: {new Date(k.createdAt).toLocaleDateString()}</span>
                          <span>Requests: {k.requestCount.toLocaleString()}</span>
                          <span>Rate: {k.rateLimit} req/min</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isAccountPaid && k.isActive && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(k.keyPrefix, k.id)}
                            className="text-xs h-7 border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800"
                          >
                            <Copy className="w-3.5 h-3.5 mr-1" />
                            {copiedKey === k.id ? 'Copied' : 'Copy Prefix'}
                          </Button>
                        )}
                        {k.isActive && isAccountPaid && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRevokeKey(k.id)}
                            className="text-xs h-7 text-red-400 hover:bg-red-950/40"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            Revoke
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT: PLAYGROUND & CODE GENERATOR */}
            {activeTab === 'playground' && (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">API Integration Snippets</h3>
                  <p className="text-xs text-slate-400">
                    Test live queries against the CCSA FIMS agricultural data endpoints.
                  </p>
                </div>

                {/* Language Switcher */}
                <div className="flex gap-2 text-xs font-semibold">
                  {(['curl', 'python', 'node'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setSelectedLang(lang)}
                      className={`px-3 py-1.5 rounded-lg border transition-colors ${
                        selectedLang === lang
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400 font-bold'
                          : 'bg-[#090E18] border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {lang === 'curl' ? 'cURL' : lang === 'python' ? 'Python (requests)' : 'Node.js (fetch)'}
                    </button>
                  ))}
                </div>

                {/* Code Block */}
                <div className="bg-[#05080E] rounded-xl border border-slate-800 p-4 font-mono text-xs space-y-2">
                  <div className="flex justify-between items-center text-slate-500 pb-2 border-b border-slate-800/80">
                    <span>Query Farmers Endpoint</span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          selectedLang === 'curl'
                            ? `curl -X GET "${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/v1/farmers?limit=20" -H "Authorization: Bearer ${primaryKey?.keyPrefix || 'fims_live_YOUR_KEY'}"`
                            : selectedLang === 'python'
                            ? `import requests\nres = requests.get("${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/v1/farmers", headers={"Authorization": "Bearer ${primaryKey?.keyPrefix || 'fims_live_YOUR_KEY'}"})\nprint(res.json())`
                            : `const res = await fetch("${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/v1/farmers", { headers: { Authorization: "Bearer ${primaryKey?.keyPrefix || 'fims_live_YOUR_KEY'}" } });\nconst data = await res.json();\nconsole.log(data);`,
                          'snippet'
                        )
                      }
                      className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-sans text-xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedKey === 'snippet' ? 'Copied' : 'Copy Snippet'}</span>
                    </button>
                  </div>

                  <pre className="text-emerald-400 overflow-x-auto py-2">
                    {selectedLang === 'curl' &&
`curl -X GET "${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/v1/farmers?limit=20" \\
  -H "Authorization: Bearer ${primaryKey?.keyPrefix || 'fims_live_YOUR_KEY'}" \\
  -H "Accept: application/json"`}

                    {selectedLang === 'python' &&
`import requests

url = "${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/v1/farmers"
headers = {
    "Authorization": "Bearer ${primaryKey?.keyPrefix || 'fims_live_YOUR_KEY'}",
    "Accept": "application/json"
}

response = requests.get(url, headers=headers, params={"limit": 20})
print(response.json())`}

                    {selectedLang === 'node' &&
`const url = "${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/v1/farmers?limit=20";
const response = await fetch(url, {
  headers: {
    "Authorization": "Bearer ${primaryKey?.keyPrefix || 'fims_live_YOUR_KEY'}",
    "Accept": "application/json"
  }
});

const data = await response.json();
console.log(data);`}
                  </pre>
                </div>
              </div>
            )}

            {/* TAB CONTENT: BILLING & INVOICES */}
            {activeTab === 'billing' && (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Subscription Plans & Invoice Records</h3>
                  <p className="text-xs text-slate-400">
                    Manage tier upgrades and settle invoices via Paystack.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.values(portalData?.availablePlans || {}).map((p: any) => {
                    const isCurrent = org?.tier === p.id;
                    return (
                      <div
                        key={p.id}
                        className={`p-5 rounded-xl border bg-[#090E18] space-y-3 relative ${
                          isCurrent
                            ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                            : 'border-slate-800'
                        }`}
                      >
                        {isCurrent && (
                          <span className="absolute -top-2.5 right-4 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                            Current Plan
                          </span>
                        )}
                        <div>
                          <h4 className="font-bold text-white text-sm">{p.name}</h4>
                          <div className="text-xl font-extrabold text-emerald-400 mt-1">
                            ₦{p.priceNgn.toLocaleString()}{' '}
                            <span className="text-xs text-slate-400 font-normal">/ mo</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400">{p.description}</p>
                        <div className="text-xs font-semibold text-slate-300 pt-2 border-t border-slate-800">
                          {p.monthlyQuota.toLocaleString()} queries / month
                        </div>
                        <Button
                          disabled={isCurrent || upgradeLoading}
                          onClick={() => handleUpgradeCheckout(p.id)}
                          className={`w-full text-xs font-bold h-9 rounded-lg ${
                            isCurrent
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {upgradeLoading && upgradingTier === p.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : isCurrent ? (
                            'Active Tier'
                          ) : (
                            'Switch / Pay with Paystack'
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>

                {/* Invoices Table */}
                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Invoice History
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#090E18]">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                          <th className="p-3">Invoice Number</th>
                          <th className="p-3">Date</th>
                          <th className="p-3">Amount</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {portalData?.invoices?.map((inv: any) => (
                          <tr key={inv.id}>
                            <td className="p-3 font-mono font-medium text-slate-200">{inv.invoiceNumber}</td>
                            <td className="p-3 text-slate-400">{new Date(inv.createdAt).toLocaleDateString()}</td>
                            <td className="p-3 font-bold text-white">
                              ₦{Number(inv.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  inv.status === 'PAID'
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                    : 'bg-amber-950 text-amber-400 border border-amber-800'
                                }`}
                              >
                                {inv.status}
                              </span>
                            </td>
                            <td className="p-3">
                              {inv.status === 'PENDING' ? (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    (window.location.href = `/portal/billing/mock-checkout?reference=${encodeURIComponent(
                                      inv.transactionRef
                                    )}&amount=${Number(inv.amount) * 100}`)
                                  }
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-7 font-bold rounded"
                                >
                                  Pay Now
                                </Button>
                              ) : (
                                <span className="text-[11px] text-slate-500">Paid</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: DOCS */}
            {activeTab === 'docs' && (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">REST API Specifications & Standards</h3>
                  <p className="text-xs text-slate-400">
                    Comprehensive overview of parameters, pagination, and NDPR redaction contracts.
                  </p>
                </div>

                <div className="space-y-4 text-xs text-slate-300">
                  <div className="p-4 rounded-xl bg-[#090E18] border border-slate-800 space-y-2">
                    <h4 className="font-bold text-emerald-400">Authentication</h4>
                    <p className="text-slate-400">
                      Include your live token in the <code>Authorization: Bearer fims_live_...</code> header or as <code>x-api-key: fims_live_...</code>.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#090E18] border border-slate-800 space-y-2">
                    <h4 className="font-bold text-emerald-400">NDPR Privacy Redaction</h4>
                    <p className="text-slate-400">
                      All responses omit direct national identification (NIN, BVN, banking details). Names and coordinates are verified by Cosmopolitan University field supervisors.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal: Generate New Key */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B111D] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white">Generate Live API Key</h3>
            {generatedKeyResult ? (
              <div className="space-y-4">
                <div className="bg-[#05080E] p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Full Live Token (Copy Now)</span>
                    <button
                      onClick={() => copyToClipboard(generatedKeyResult.token, 'new_token')}
                      className="text-emerald-400 hover:text-emerald-300 text-xs flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedKey === 'new_token' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="font-mono text-xs text-emerald-300 break-all bg-slate-900/60 p-2.5 rounded border border-slate-800">
                    {generatedKeyResult.token}
                  </div>
                </div>
                <p className="text-xs text-amber-300 bg-amber-950/40 p-3 rounded-lg border border-amber-900">
                  This token will never be displayed again. Please save it into your secure secrets manager.
                </p>
                <Button onClick={() => setShowKeyModal(false)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  Done
                </Button>
              </div>
            ) : (
              <form onSubmit={handleCreateKey} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Key Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Staging Server Webhook"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-800 bg-[#070B12] text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Description</label>
                  <input
                    type="text"
                    placeholder="Optional notes or server identifier"
                    value={newKeyDesc}
                    onChange={(e) => setNewKeyDesc(e.target.value)}
                    className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-800 bg-[#070B12] text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowKeyModal(false)} className="border-slate-800 text-slate-400">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={generatingKey} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                    {generatingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate Token'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientPortalDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070C14] flex items-center justify-center text-slate-400 text-xs">Loading dashboard...</div>}>
      <ClientPortalDashboardContent />
    </Suspense>
  );
}

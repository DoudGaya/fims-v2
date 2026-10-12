'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
  CreditCard,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PortalNavHeader } from '@/components/portal/portal-nav-header';
import { PortalBrandFooter } from '@/components/portal/portal-brand-footer';

const PLANS = [
  {
    id: 'DEVELOPER',
    name: 'Developer / Pilot',
    price: '₦250,000',
    period: '/ month',
    usd: '($200 / mo)',
    quota: '1,500 queries / mo',
    rateLimit: '10 req / min',
    highlight: false,
    features: ['Anonymized farmer statistics', 'State & LGA cluster aggregations', 'Standard Email Support'],
  },
  {
    id: 'BUSINESS',
    name: 'Business Commercial',
    price: '₦1,800,000',
    period: '/ month',
    usd: '($1,400 / mo)',
    quota: '25,000 queries / mo',
    rateLimit: '120 req / min',
    highlight: true,
    features: [
      'GIS Farm boundary polygons',
      'Crop yield predictions & cluster metrics',
      'Webhooks & real-time sync',
      'Priority Technical Support',
    ],
  },
  {
    id: 'ENTERPRISE_KYC',
    name: 'Enterprise Financial & KYC',
    price: '₦6,500,000',
    period: '/ month',
    usd: '($5,000 / mo)',
    quota: '100,000 queries / mo',
    rateLimit: '300 req / min',
    highlight: false,
    features: [
      'Consent-backed Farmer KYC verification',
      'Direct credit risk & farm size telemetry',
      'Custom spatial data feeds',
      'Dedicated Account Manager & 99.9% SLA',
    ],
  },
];

export default function PortalRegisterPage() {
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState('BUSINESS');
  const [formData, setFormData] = useState({
    organizationName: '',
    rcNumber: '',
    taxId: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    password: '',
    intendedUse: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState<any | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/portal/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tier: selectedTier,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete registration');
      }

      setSuccessResult(data);
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlanDetails = PLANS.find((p) => p.id === selectedTier) || PLANS[1];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#060F1A] text-slate-800 dark:text-slate-100 transition-colors">
      {/* Brand Header */}
      <PortalNavHeader />

      {/* Main Registration Content */}
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 text-xs font-bold text-emerald-800 dark:text-emerald-400">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>CCSA FIMS B2B Commercial Data Access</span>
            </div>
            <h1 className="text-3xl font-black text-[#013358] dark:text-white tracking-tight sm:text-4xl">
              Commercial Data Portal Registration
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
              Access programmatic API feeds for over 64,000 verified Nigerian farmers, 43,000 mapped GIS farm polygons, and crop yields.
            </p>
          </div>

          {/* Modal on Success - Live Key Withheld until Payment Confirmation */}
          {successResult && (
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#0B1728] rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    Organization Account Provisioned
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Your corporate account has been created. Live API keys are provisioned upon payment confirmation.
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-[#071320] p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Company</span>
                    <span className="font-bold text-slate-900 dark:text-white">{successResult.organization.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Subscription Tier</span>
                    <span className="font-bold text-[#013358] dark:text-emerald-400">{selectedPlanDetails.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Query Quota</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{selectedPlanDetails.quota}</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Amount Due</span>
                    <span className="text-base font-black text-[#013358] dark:text-emerald-400">
                      ₦{Number(successResult.invoice?.amount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Privacy & Key Security Guidance */}
                <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 flex gap-2.5 items-start">
                  <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Security Notice:</strong> In accordance with our commercial policy and NDPR data governance, your production API key will be unlocked immediately upon settlement of this invoice.
                  </span>
                </div>

                <div className="flex flex-col gap-2.5 pt-2">
                  {successResult.invoice?.authorizationUrl ? (
                    <Button
                      onClick={() => (window.location.href = successResult.invoice.authorizationUrl)}
                      className="w-full bg-[#013358] hover:bg-[#01264a] dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-bold h-11 text-xs sm:text-sm rounded-xl shadow-xs"
                    >
                      Proceed to Complete Payment ({selectedTier})
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      onClick={() => router.push('/portal/login')}
                      className="w-full bg-[#013358] hover:bg-[#01264a] text-white font-bold h-11 text-xs sm:text-sm rounded-xl"
                    >
                      Sign In to Client Portal
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => router.push('/portal/login')}
                    className="w-full text-xs text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 h-10 rounded-xl"
                  >
                    Go to Portal Dashboard (Pay Later)
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Tier Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#013358] dark:text-emerald-400">
                1. Select Your Subscription Tier
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Monthly billing • Cancel anytime</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PLANS.map((plan) => {
                const isSelected = selectedTier === plan.id;
                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedTier(plan.id)}
                    className={`cursor-pointer rounded-2xl border p-5 transition-all relative ${
                      isSelected
                        ? 'border-[#013358] dark:border-emerald-500 ring-2 ring-[#013358]/20 dark:ring-emerald-500/20 bg-white dark:bg-[#0A1626] shadow-md'
                        : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-[#0A1626]/60 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {plan.highlight && (
                      <span className="absolute -top-3 right-4 bg-emerald-600 text-white text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full tracking-wider shadow-xs">
                        Most Popular
                      </span>
                    )}
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-xl font-black text-[#013358] dark:text-emerald-400">{plan.price}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{plan.period}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{plan.usd}</p>
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{plan.quota}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Rate Limit: {plan.rateLimit}</div>
                      {plan.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form */}
          <div className="bg-white dark:bg-[#0A1626] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#013358] dark:text-emerald-400">
                2. Corporate Information & Admin Contact
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                All accounts are verified against Nigerian Corporate Affairs Commission (CAC) standards.
              </p>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Company / Organization Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex AgriTech Ltd"
                    value={formData.organizationName}
                    onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                    className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#071320] text-slate-900 dark:text-white outline-none focus:border-[#013358] dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">CAC Registration (RC Number)</label>
                  <input
                    type="text"
                    placeholder="RC-1234567"
                    value={formData.rcNumber}
                    onChange={(e) => setFormData({ ...formData, rcNumber: e.target.value })}
                    className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#071320] text-slate-900 dark:text-white outline-none focus:border-[#013358] dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tax Identification Number (TIN)</label>
                  <input
                    type="text"
                    placeholder="e.g. 10293847-0001"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#071320] text-slate-900 dark:text-white outline-none focus:border-[#013358] dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Official Contact Person *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Amina Bello"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#071320] text-slate-900 dark:text-white outline-none focus:border-[#013358] dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Corporate Email (Login ID) *</label>
                  <input
                    type="email"
                    required
                    placeholder="api@yourcompany.com"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#071320] text-slate-900 dark:text-white outline-none focus:border-[#013358] dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Official Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+234 803 000 0000"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#071320] text-slate-900 dark:text-white outline-none focus:border-[#013358] dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Portal Password (min. 8 characters) *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#071320] text-slate-900 dark:text-white outline-none focus:border-[#013358] dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Intended Use of Data *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe your use case (e.g., assessing agricultural credit risk, input distribution planning, crop index insurance payouts)..."
                  value={formData.intendedUse}
                  onChange={(e) => setFormData({ ...formData, intendedUse: e.target.value })}
                  className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#071320] text-slate-900 dark:text-white outline-none focus:border-[#013358] dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Already registered?{' '}
                  <Link href="/portal/login" className="font-semibold text-[#013358] dark:text-emerald-400 hover:underline">
                    Sign in to portal
                  </Link>
                </p>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto bg-[#013358] hover:bg-[#01264a] dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white px-8 h-11 text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Provisioning Account...
                    </>
                  ) : (
                    <>
                      Register & Proceed to Payment
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Brand Visual Footer */}
      <PortalBrandFooter />
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
  FileText,
  Mail,
  User,
  Phone,
  Globe,
  Briefcase,
  MapPin,
  Layers,
  Fingerprint,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PortalNavHeader } from '@/components/portal/portal-nav-header';
import { PortalBrandFooter } from '@/components/portal/portal-brand-footer';

const DATA_SCOPES = [
  {
    id: 'nin:verify',
    title: 'NIN Verification',
    desc: 'Verify Nigerian National Identification Numbers against official national identity databases.',
  },
  {
    id: 'farmers:read',
    title: 'Farmer Profiles',
    desc: 'Query verified farmer demographic records, household data, and cooperative memberships.',
  },
  {
    id: 'farms:read',
    title: 'Farm GIS & Polygons',
    desc: 'Access verified GPS boundary coordinates, calculated acreage, and crop mappings.',
  },
  {
    id: 'clusters:read',
    title: 'Agricultural Clusters',
    desc: 'Inspect State, LGA, and ward agricultural cluster groupings and aggregator networks.',
  },
  {
    id: 'analytics:read',
    title: 'Aggregated Analytics',
    desc: 'Programmatic crop yield projections, regional agricultural metrics, and census summaries.',
  },
];

const ORG_TYPES = [
  'Commercial Agribusiness / Off-taker',
  'Commercial Bank / Financial Institution',
  'FinTech & Digital Lending',
  'Academic / Research Institution',
  'NGO / International Development Agency',
  'Government Ministry / Parastatal',
  'Other Corporate Entity',
];

const VOLUMES = [
  'Pilot (< 5,000 queries / month)',
  'Standard (5,000 – 25,000 queries / month)',
  'Enterprise (25,000 – 100,000 queries / month)',
  'High-Volume (100,000+ queries / month)',
];

const TIMELINES = [
  'Immediate (Within 14 days)',
  'Within 1 month',
  'Within 3 months',
  'Exploring for future roadmap',
];

export default function PortalRegisterPage() {
  const [formData, setFormData] = useState({
    // KYB Details
    organizationName: '',
    rcNumber: '',
    taxId: '',
    organizationType: ORG_TYPES[0],
    website: '',
    address: '',
    // Contact Person
    contactName: '',
    designation: '',
    email: '',
    phone: '',
    // Requirements & Justification
    intendedUse: '',
    requestedScopes: ['nin:verify', 'farmers:read', 'farms:read'] as string[],
    expectedVolume: VOLUMES[1],
    integrationTimeline: TIMELINES[0],
    complianceAgreed: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState<any | null>(null);

  const toggleScope = (scopeId: string) => {
    setFormData((prev) => {
      const exists = prev.requestedScopes.includes(scopeId);
      if (exists) {
        if (prev.requestedScopes.length === 1) return prev; // Keep at least one
        return { ...prev, requestedScopes: prev.requestedScopes.filter((s) => s !== scopeId) };
      } else {
        return { ...prev, requestedScopes: [...prev.requestedScopes, scopeId] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.complianceAgreed) {
      setError('Please acknowledge compliance with NDPR data privacy and responsible usage regulations.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/public/api-access-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.details
          ? Object.values(data.details).flat().join(', ')
          : data.error || 'Failed to submit request';
        throw new Error(errorMsg);
      }

      setSuccessResult({
        id: data.id,
        organizationName: formData.organizationName,
        email: formData.email,
        contactName: formData.contactName,
      });
    } catch (err: any) {
      setError(err?.message || 'Submission failed. Please check your inputs and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#060F1A] text-slate-800 dark:text-slate-100 transition-colors">
      <PortalNavHeader />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 text-xs font-bold text-emerald-800 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>CCSA FIMS Institutional & Partner Access</span>
            </div>
            <h1 className="text-3xl font-black text-[#013358] dark:text-white tracking-tight sm:text-4xl">
              Request API & Partner Portal Access
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Submit your institutional Know Your Business (KYB) information and integration requirements. Upon administrative review and approval, your access credentials and API keys will be dispatched directly to your corporate email.
            </p>
          </div>

          {/* Submission Success Dialog */}
          {successResult && (
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#0B1728] rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="text-center space-y-1.5">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    Access Request Received
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Your institutional KYB application is currently queued for administrative verification.
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-[#071320] p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Application Reference</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{successResult.id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Organization</span>
                    <span className="font-bold text-slate-900 dark:text-white">{successResult.organizationName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Designated Contact</span>
                    <span className="text-slate-700 dark:text-slate-300">{successResult.contactName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Credentials Delivery Email</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">{successResult.email}</span>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs text-blue-800 dark:text-blue-300 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Mail className="w-4 h-4 shrink-0" />
                    <span>What happens next?</span>
                  </p>
                  <p className="opacity-90 leading-relaxed">
                    Once administrators approve your request in the FIMS system, your Client Portal login credentials and live API keys will be automatically emailed to <strong>{successResult.email}</strong>.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Link href="/portal/login" className="flex-1">
                    <Button variant="outline" className="w-full text-xs">
                      Go to Client Portal Sign In
                    </Button>
                  </Link>
                  <Link href="/" className="flex-1">
                    <Button className="w-full text-xs bg-[#013358] hover:bg-[#01254a] text-white">
                      Return to Homepage
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Section 1: KYB Organization Information */}
            <div className="bg-white dark:bg-[#0A1626] p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    1. Know Your Business (KYB) & Institution
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Legal business details required for compliance and verification.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Corporate / Legal Entity Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Agricultural Technologies Ltd"
                    value={formData.organizationName}
                    onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                    className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#071320] text-slate-900 dark:text-white outline-none focus:border-[#013358] dark:focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    CAC Registration / RC Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RC 1234567"
                    value={formData.rcNumber}
                    onChange={(e) => setFormData({ ...formData, rcNumber: e.target.value })}
                    className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#071320] text-slate-900 dark:text-white outline-none focus:border-[#013358] dark:focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tax Identification Number (TIN)
                  </label>
                  <input
                    type="text"
                    placeholder="Optional / FIRS TIN"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#071320] text-slate-900 dark:text-white outline-none focus:border-[#013358] dark:focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Organization Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.organizationType}
                    onChange={(e) => setFormData({ ...formData, organizationType: e.target.value })}
                    className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#071320] text-slate-900 dark:text-white outline-none focus:border-[#013358] dark:focus:border-emerald-500"
                  >
                    {ORG_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Official Website
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="url"
                      placeholder="https://yourcompany.com"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="w-full h-10 pl-9 pr-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#071320] text-slate-900 dark:text-white outline-none focus:border-[#013358] dark:focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Headquarters / Physical Office Address
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="e.g. Plot 420 Central Business District, Abuja, FCT"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full h-10 pl-9 pr-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#071320] text-slate-900 dark:text-white outline-none focus:border-[#013358] dark:focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Contact Person & Delivery */}
            <div className="bg-white dark:bg-[#0A1626] p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-700 dark:text-blue-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    2. Designated Technical / Administrative Contact
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    The credentials and API tokens will be dispatched to this corporate email once approved.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ibrahim Abubakar"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#071320] text-slate-900 dark:text-white outline-none focus:border-[#013358] dark:focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Designation / Role
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="e.g. Chief Technology Officer / Head of Compliance"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      className="w-full h-10 pl-9 pr-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#071320] text-slate-900 dark:text-white outline-none focus:border-[#013358] dark:focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Official Corporate Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder="api-team@yourcompany.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full h-10 pl-9 pr-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#071320] text-slate-900 dark:text-white outline-none focus:border-[#013358] dark:focus:border-emerald-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">Login credentials will be sent to this inbox.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="tel"
                      placeholder="+234 800 000 0000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full h-10 pl-9 pr-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#071320] text-slate-900 dark:text-white outline-none focus:border-[#013358] dark:focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Data Scopes & Technical Justification */}
            <div className="bg-white dark:bg-[#0A1626] p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-400">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    3. Data Scopes & Integration Purpose
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Detail your use case to help administrators make a clear decision on your access grant.
                  </p>
                </div>
              </div>

              {/* Scopes Selection */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Requested Data Permissions / Scopes <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {DATA_SCOPES.map((scope) => {
                    const isSelected = formData.requestedScopes.includes(scope.id);
                    return (
                      <div
                        key={scope.id}
                        onClick={() => toggleScope(scope.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                          isSelected
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700/70 shadow-sm'
                            : 'bg-slate-50 dark:bg-[#071320] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {scope.title}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {scope.id}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                            {scope.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reason / Intended Use */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Detailed Reason & Use Case Justification <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explain how your organization will use the CCSA FIMS API (e.g. farmer credit assessment, identity verification for agricultural input distribution, remote crop yield monitoring, policy research)..."
                  value={formData.intendedUse}
                  onChange={(e) => setFormData({ ...formData, intendedUse: e.target.value })}
                  className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#071320] text-slate-900 dark:text-white outline-none focus:border-[#013358] dark:focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-400">
                  This justification will be evaluated directly by FIMS compliance officers prior to approval.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Estimated Monthly Query Volume
                  </label>
                  <select
                    value={formData.expectedVolume}
                    onChange={(e) => setFormData({ ...formData, expectedVolume: e.target.value })}
                    className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#071320] text-slate-900 dark:text-white outline-none focus:border-[#013358] dark:focus:border-emerald-500"
                  >
                    {VOLUMES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Target Integration Timeline
                  </label>
                  <select
                    value={formData.integrationTimeline}
                    onChange={(e) => setFormData({ ...formData, integrationTimeline: e.target.value })}
                    className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#071320] text-slate-900 dark:text-white outline-none focus:border-[#013358] dark:focus:border-emerald-500"
                  >
                    {TIMELINES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 4: Compliance & Submission */}
            <div className="bg-white dark:bg-[#0A1626] p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="compliance"
                  checked={formData.complianceAgreed}
                  onChange={(e) => setFormData({ ...formData, complianceAgreed: e.target.checked })}
                  className="mt-1 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="compliance" className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed cursor-pointer select-none">
                  <strong className="text-slate-900 dark:text-white">Compliance & Data Privacy Declaration:</strong> I certify that our organization is a legally registered entity and agrees to handle all farmer and identity registry data in strict compliance with the Nigeria Data Protection Act (NDPA) and applicable regulations. Data accessed via this gateway will solely be utilized for the stated lawful purpose.
                </label>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
                  Already have access credentials?{' '}
                  <Link href="/portal/login" className="text-[#013358] dark:text-emerald-400 font-semibold hover:underline">
                    Sign In to Client Portal
                  </Link>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-8 h-11 bg-[#013358] hover:bg-[#01254a] text-white font-semibold text-xs rounded-xl shadow-md gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Access Application</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </main>

      <PortalBrandFooter />
    </div>
  );
}

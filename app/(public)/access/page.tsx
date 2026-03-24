'use client';

import { useState } from 'react';
import Link from 'next/link';

const SCOPES = [
  { id: 'farmers:read', label: 'Farmers', description: 'Read farmer registration records' },
  { id: 'farms:read', label: 'Farms', description: 'Read farm plot data' },
  { id: 'clusters:read', label: 'Clusters', description: 'Read cluster information' },
  { id: 'analytics:read', label: 'Analytics', description: 'Read aggregated statistics' },
];

const VOLUME_OPTIONS = [
  'Less than 1,000 requests/day',
  '1,000 – 10,000 requests/day',
  '10,000 – 100,000 requests/day',
  'More than 100,000 requests/day',
  'Not sure yet',
];

export default function AccessRequestPage() {
  const [form, setForm] = useState({
    organizationName: '',
    contactName: '',
    email: '',
    phone: '',
    intendedUse: '',
    requestedScopes: [] as string[],
    expectedVolume: '',
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const toggleScope = (scope: string) => {
    setForm((prev) => ({
      ...prev,
      requestedScopes: prev.requestedScopes.includes(scope)
        ? prev.requestedScopes.filter((s) => s !== scope)
        : [...prev.requestedScopes, scope],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.requestedScopes.length === 0) {
      setErrorMsg('Please select at least one scope.');
      return;
    }
    setStatus('submitting');
    setErrorMsg('');
    try {
      const res = await fetch('/api/public/api-access-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Submission failed. Please try again.');
      }
      setStatus('success');
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Request Submitted</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Thank you. Our team will review your request and respond to{' '}
            <strong className="text-gray-900 dark:text-white">{form.email}</strong> within 2–3
            business days.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#013358] text-white font-semibold rounded-lg hover:bg-[#01264a] transition-colors text-sm"
            >
              Read the API Docs
            </Link>
            <Link
              href="/fims"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
            >
              Back to FIMS
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Page header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#013358]/20 dark:border-blue-400/20 bg-[#013358]/5 dark:bg-blue-400/10 text-[#013358] dark:text-blue-300 text-sm font-medium mb-4">
          API Access Request
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Request API Access
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-xl">
          Complete this form to apply for programmatic access to the FIMS dataset. Our team
          will review your use case and respond within 2–3 business days.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Organisation info */}
        <fieldset className="space-y-5">
          <legend className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide pb-2 border-b border-gray-200 dark:border-gray-700 w-full">
            Organisation Details
          </legend>

          <div>
            <label htmlFor="organizationName" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
              Organisation Name <span className="text-red-500">*</span>
            </label>
            <input
              id="organizationName"
              type="text"
              required
              placeholder="e.g. Federal Ministry of Agriculture"
              value={form.organizationName}
              onChange={(e) => setForm((p) => ({ ...p, organizationName: e.target.value }))}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#013358] dark:focus:ring-blue-400 transition"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="contactName" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                Contact Name <span className="text-red-500">*</span>
              </label>
              <input
                id="contactName"
                type="text"
                required
                placeholder="Full name"
                value={form.contactName}
                onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))}
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#013358] dark:focus:ring-blue-400 transition"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                Work Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="you@organisation.gov.ng"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#013358] dark:focus:ring-blue-400 transition"
              />
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
              Phone Number <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="phone"
              type="tel"
              placeholder="+234 800 000 0000"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#013358] dark:focus:ring-blue-400 transition"
            />
          </div>
        </fieldset>

        {/* Intended use */}
        <fieldset className="space-y-5">
          <legend className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide pb-2 border-b border-gray-200 dark:border-gray-700 w-full">
            Access Details
          </legend>

          <div>
            <label htmlFor="intendedUse" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
              Intended Use Case <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">
              Describe how you plan to use this data (e.g. beneficiary targeting, research, policy analysis).
            </p>
            <textarea
              id="intendedUse"
              required
              rows={4}
              placeholder="We plan to use the FIMS farmer registry to..."
              value={form.intendedUse}
              onChange={(e) => setForm((p) => ({ ...p, intendedUse: e.target.value }))}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#013358] dark:focus:ring-blue-400 transition resize-y"
            />
          </div>

          {/* Scopes */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
              Requested Data Scopes <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Select all datasets your application requires access to.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {SCOPES.map(({ id, label, description }) => {
                const checked = form.requestedScopes.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleScope(id)}
                    className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                      checked
                        ? 'border-[#013358] dark:border-blue-400 bg-[#013358]/5 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      checked
                        ? 'bg-[#013358] dark:bg-blue-500 border-[#013358] dark:border-blue-500'
                        : 'border-gray-400 dark:border-gray-500'
                    }`}>
                      {checked && (
                        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        <code className="font-mono">{id}</code> — {description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Volume */}
          <div>
            <label htmlFor="expectedVolume" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
              Expected Request Volume <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <select
              id="expectedVolume"
              value={form.expectedVolume}
              onChange={(e) => setForm((p) => ({ ...p, expectedVolume: e.target.value }))}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#013358] dark:focus:ring-blue-400 transition"
            >
              <option value="">Select an estimated volume…</option>
              {VOLUME_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </fieldset>

        {/* Privacy note */}
        <div className="rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-400">
          <span className="font-semibold text-gray-900 dark:text-white">Privacy: </span>
          API tokens issued to third parties never include sensitive identity (NIN), financial (BVN,
          bank details), or contact (phone, email) fields. All access is logged and tokens can be
          revoked at any time by a CCSA administrator.
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 p-4 text-sm text-red-700 dark:text-red-300">
            {errorMsg}
          </div>
        )}

        {/* Submit */}
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={status === 'submitting'}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#013358] text-white font-semibold rounded-lg hover:bg-[#01264a] disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {status === 'submitting' ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Submitting…
              </>
            ) : (
              'Submit Request'
            )}
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            By submitting you agree to CCSA&apos;s{' '}
            <Link href="/docs" className="underline hover:text-[#013358] dark:hover:text-blue-300">
              API usage policy
            </Link>.
          </p>
        </div>
      </form>
    </div>
  );
}

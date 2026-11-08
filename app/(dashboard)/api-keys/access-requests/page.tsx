'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  InboxIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  KeyIcon,
  ClockIcon,
  PlusIcon,
  BuildingOffice2Icon,
  EnvelopeIcon,
  PhoneIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  IdentificationIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const ALL_SCOPES = [
  { id: 'nin:verify', label: 'NIN Verification', desc: 'Verify Nigerian National ID Numbers' },
  { id: 'farmers:read', label: 'Farmers', desc: 'Read farmer demographic & KYC records' },
  { id: 'farms:read', label: 'Farms', desc: 'Read farm records and GIS polygons' },
  { id: 'clusters:read', label: 'Clusters', desc: 'Read cluster and cooperative data' },
  { id: 'analytics:read', label: 'Analytics', desc: 'Read aggregate census & yield metrics' },
];

type Status = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

interface AccessRequest {
  id: string;
  organizationName: string;
  rcNumber: string | null;
  taxId: string | null;
  organizationType: string | null;
  website: string | null;
  address: string | null;
  contactName: string;
  designation: string | null;
  email: string;
  phone: string | null;
  intendedUse: string;
  requestedScopes: string[];
  expectedVolume: string | null;
  integrationTimeline: string | null;
  complianceAgreed: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNotes: string | null;
  credentialsSentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_TABS: { label: string; value: Status }[] = [
  { label: 'All Requests', value: 'ALL' },
  { label: 'Pending Review', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
];

export default function ApiAccessRequestsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Status>('PENDING');

  // Review & Approval state
  const [approvingReq, setApprovingReq] = useState<AccessRequest | null>(null);
  const [rejectingReq, setRejectingReq] = useState<AccessRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [approvedScopes, setApprovedScopes] = useState<string[]>([]);
  const [rateLimit, setRateLimit] = useState(120);
  const [monthlyQuota, setMonthlyQuota] = useState(50000);
  const [allowSensitive, setAllowSensitive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Success modal for provisioned credentials
  const [provisionedResult, setProvisionedResult] = useState<any | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Direct Account Creation Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    organizationName: '',
    rcNumber: '',
    taxId: '',
    contactName: '',
    email: '',
    phone: '',
    scopes: ['nin:verify', 'farmers:read', 'farms:read'] as string[],
    rateLimit: 120,
    monthlyQuota: 50000,
    allowSensitiveFields: false,
    sendEmail: true,
  });
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Detail row expansion
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url =
        activeTab === 'ALL'
          ? '/api/admin/api-access-requests?limit=50'
          : `/api/admin/api-access-requests?status=${activeTab}&limit=50`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load access requests');
      const json = await res.json();
      setRequests(json.data ?? []);
      setTotal(json.pagination?.total ?? 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (session) fetchRequests();
  }, [session, fetchRequests]);

  function openApproveModal(req: AccessRequest) {
    setApprovingReq(req);
    setAdminNotes(req.adminNotes ?? '');
    setApprovedScopes(req.requestedScopes && req.requestedScopes.length > 0 ? req.requestedScopes : ['nin:verify', 'farmers:read']);
    setRateLimit(120);
    setMonthlyQuota(50000);
    setAllowSensitive(false);
    setSubmitError(null);
  }

  function toggleApprovedScope(scopeId: string) {
    setApprovedScopes((prev) =>
      prev.includes(scopeId) ? prev.filter((s) => s !== scopeId) : [...prev, scopeId]
    );
  }

  function toggleCreateScope(scopeId: string) {
    setCreateForm((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scopeId)
        ? prev.scopes.filter((s) => s !== scopeId)
        : [...prev.scopes, scopeId],
    }));
  }

  async function handleConfirmApprove() {
    if (!approvingReq) return;
    if (approvedScopes.length === 0) {
      setSubmitError('Please grant at least one data permission / scope.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/admin/api-access-requests/${approvingReq.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'APPROVED',
          adminNotes: adminNotes.trim() || null,
          approvedScopes,
          rateLimit,
          monthlyQuota,
          allowSensitiveFields: allowSensitive,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve access request');

      setProvisionedResult(data.credentials);
      setApprovingReq(null);
      await fetchRequests();
    } catch (e: any) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmReject() {
    if (!rejectingReq) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/admin/api-access-requests/${rejectingReq.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'REJECTED',
          adminNotes: adminNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject request');

      setRejectingReq(null);
      await fetchRequests();
    } catch (e: any) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateDirectAccount(e: React.FormEvent) {
    e.preventDefault();
    if (createForm.scopes.length === 0) {
      setCreateError('Please select at least one permission / scope.');
      return;
    }

    setCreatingAccount(true);
    setCreateError(null);

    try {
      const res = await fetch('/api/admin/client-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create client account');

      setShowCreateModal(false);
      setProvisionedResult({
        email: data.account.email,
        temporaryPassword: data.account.temporaryPassword,
        apiKey: data.account.apiKey,
        organization: { name: data.account.organizationName },
      });
      await fetchRequests();
    } catch (e: any) {
      setCreateError(e.message);
    } finally {
      setCreatingAccount(false);
    }
  }

  function copyText(val: string) {
    navigator.clipboard.writeText(val);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  }

  function formatDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Link href="/requests" className="hover:underline">Requests</Link>
            <span>/</span>
            <Link href="/api-keys" className="hover:underline">API Gateways</Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldCheckIcon className="h-7 w-7 text-[#013358] dark:text-blue-400" />
            Institutional API Access Requests & KYB
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Review Know Your Business (KYB) applications, approve permissions, and provision partner credentials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="gap-2 bg-[#013358] hover:bg-[#01254a] text-white"
            onClick={() => {
              setCreateError(null);
              setShowCreateModal(true);
            }}
          >
            <PlusIcon className="h-4 w-4" />
            Create Access Account
          </Button>

          <Button variant="outline" size="sm" onClick={fetchRequests} disabled={loading} className="gap-2">
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                Pending Compliance Review
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {requests.filter((r) => r.status === 'PENDING').length}
              </p>
            </div>
            <ClockIcon className="h-8 w-8 text-amber-500/40" />
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                Approved Institutional Accounts
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {requests.filter((r) => r.status === 'APPROVED').length}
              </p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-emerald-500/40" />
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Total Submissions
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {total || requests.length}
              </p>
            </div>
            <InboxIcon className="h-8 w-8 text-gray-400/40" />
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 flex gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`pb-3 px-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.value
                ? 'border-[#013358] text-[#013358] dark:border-blue-400 dark:text-blue-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table Card */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-gray-500">
              <ArrowPathIcon className="h-6 w-6 animate-spin mx-auto mb-2 text-[#013358]" />
              <p className="text-sm">Loading access requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="py-16 text-center text-gray-500 space-y-2">
              <InboxIcon className="h-10 w-10 mx-auto text-gray-300" />
              <p className="text-sm font-semibold">No requests found</p>
              <p className="text-xs text-gray-400">There are currently no access requests in this category.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Organization (KYB)</TableHead>
                  <TableHead>Designated Contact</TableHead>
                  <TableHead>Requested Permissions</TableHead>
                  <TableHead>Expected Volume</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => {
                  const isExpanded = expandedId === req.id;
                  return (
                    <React.Fragment key={req.id}>
                      <TableRow className="hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors">
                        <TableCell>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : req.id)}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400"
                            title="Toggle full KYB details"
                          >
                            {isExpanded ? (
                              <ChevronUpIcon className="h-4 w-4" />
                            ) : (
                              <ChevronDownIcon className="h-4 w-4" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                            <BuildingOffice2Icon className="h-4 w-4 text-gray-400 shrink-0" />
                            <span>{req.organizationName}</span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5">
                            {req.rcNumber && <span>RC: {req.rcNumber}</span>}
                            {req.organizationType && (
                              <span className="truncate max-w-[150px]">• {req.organizationType}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {req.contactName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {req.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {req.requestedScopes.map((scope) => (
                              <Badge
                                key={scope}
                                variant="outline"
                                className={`text-[10px] font-mono ${
                                  scope === 'nin:verify'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                                    : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                                }`}
                              >
                                {scope}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-gray-600 dark:text-gray-300">
                          {req.expectedVolume || '—'}
                        </TableCell>
                        <TableCell>
                          {req.status === 'PENDING' && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300">
                              Pending Review
                            </Badge>
                          )}
                          {req.status === 'APPROVED' && (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300">
                              Approved & Active
                            </Badge>
                          )}
                          {req.status === 'REJECTED' && (
                            <Badge variant="destructive">
                              Rejected
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {formatDate(req.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          {req.status === 'PENDING' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => openApproveModal(req)}
                              >
                                Approve & Grant
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200"
                                onClick={() => {
                                  setRejectingReq(req);
                                  setAdminNotes(req.adminNotes ?? '');
                                  setSubmitError(null);
                                }}
                              >
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs text-gray-500"
                              onClick={() => setExpandedId(isExpanded ? null : req.id)}
                            >
                              {isExpanded ? 'Hide Details' : 'View Details'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Expandable KYB Details Row */}
                      {isExpanded && (
                        <TableRow className="bg-slate-50/80 dark:bg-gray-800/80">
                          <TableCell colSpan={8} className="p-4 sm:p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                              {/* KYB Info */}
                              <div className="bg-white dark:bg-[#071320] p-4 rounded-xl border border-slate-200 dark:border-gray-700 space-y-2">
                                <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 border-b pb-2 dark:border-gray-700">
                                  <IdentificationIcon className="h-4 w-4 text-[#013358] dark:text-blue-400" />
                                  Institutional KYB Record
                                </p>
                                <div><span className="text-gray-500">Legal Name:</span> <strong className="text-gray-900 dark:text-white">{req.organizationName}</strong></div>
                                <div><span className="text-gray-500">CAC / RC Number:</span> <span className="font-mono font-semibold">{req.rcNumber || 'Not provided'}</span></div>
                                <div><span className="text-gray-500">Tax ID (TIN):</span> <span className="font-mono">{req.taxId || 'Not provided'}</span></div>
                                <div><span className="text-gray-500">Entity Type:</span> <span>{req.organizationType || 'Corporate'}</span></div>
                                <div><span className="text-gray-500">Website:</span> {req.website ? <a href={req.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{req.website}</a> : '—'}</div>
                                <div><span className="text-gray-500">Address:</span> <span>{req.address || '—'}</span></div>
                              </div>

                              {/* Contact & Technical */}
                              <div className="bg-white dark:bg-[#071320] p-4 rounded-xl border border-slate-200 dark:border-gray-700 space-y-2">
                                <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 border-b pb-2 dark:border-gray-700">
                                  <EnvelopeIcon className="h-4 w-4 text-[#013358] dark:text-blue-400" />
                                  Contact & Delivery Details
                                </p>
                                <div><span className="text-gray-500">Representative:</span> <strong className="text-gray-900 dark:text-white">{req.contactName}</strong></div>
                                <div><span className="text-gray-500">Designation:</span> <span>{req.designation || 'Technical Lead'}</span></div>
                                <div><span className="text-gray-500">Email:</span> <span className="font-mono">{req.email}</span></div>
                                <div><span className="text-gray-500">Phone:</span> <span>{req.phone || '—'}</span></div>
                                <div><span className="text-gray-500">Timeline:</span> <span>{req.integrationTimeline || 'Standard'}</span></div>
                                <div>
                                  <span className="text-gray-500">Credentials Sent:</span>{' '}
                                  {req.credentialsSentAt ? (
                                    <span className="text-emerald-600 font-semibold">Sent on {formatDate(req.credentialsSentAt)}</span>
                                  ) : (
                                    <span className="text-gray-400">Not yet provisioned</span>
                                  )}
                                </div>
                              </div>

                              {/* Justification */}
                              <div className="bg-white dark:bg-[#071320] p-4 rounded-xl border border-slate-200 dark:border-gray-700 space-y-2">
                                <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 border-b pb-2 dark:border-gray-700">
                                  <ClipboardDocumentCheckIcon className="h-4 w-4 text-[#013358] dark:text-blue-400" />
                                  Intended Use Case & Reason
                                </p>
                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed bg-slate-50 dark:bg-gray-800 p-2.5 rounded-lg border dark:border-gray-700 max-h-36 overflow-y-auto">
                                  {req.intendedUse}
                                </p>
                                {req.adminNotes && (
                                  <div className="pt-2 text-xs text-amber-800 dark:text-amber-300">
                                    <strong>Admin Notes:</strong> {req.adminNotes}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Approval Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={!!approvingReq} onOpenChange={() => setApprovingReq(null)}>
        <DialogContent className="max-w-xl dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheckIcon className="h-6 w-6 text-emerald-600" />
              Approve Access Request & Provision Account
            </DialogTitle>
            <DialogDescription>
              Granting access for <strong>{approvingReq?.organizationName}</strong>. This will automatically create their commercial Client Portal account, generate an active live API key, and dispatch credentials to <strong>{approvingReq?.email}</strong>.
            </DialogDescription>
          </DialogHeader>

          {submitError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-red-500" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="space-y-4 py-2 text-xs">
            {/* Scopes selection */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Granted Permissions / Scopes</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ALL_SCOPES.map((sc) => {
                  const checked = approvedScopes.includes(sc.id);
                  return (
                    <div
                      key={sc.id}
                      onClick={() => toggleApprovedScope(sc.id)}
                      className={`p-2.5 rounded-lg border cursor-pointer flex items-start gap-2.5 transition-all select-none ${
                        checked
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
                          : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      <input type="checkbox" checked={checked} onChange={() => {}} className="mt-0.5" />
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
                          <span>{sc.label}</span>
                          <span className="text-[10px] font-mono text-gray-500">({sc.id})</span>
                        </div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{sc.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quota and rate limit */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Rate Limit (requests / min)</Label>
                <Input
                  type="number"
                  min={10}
                  max={2000}
                  value={rateLimit}
                  onChange={(e) => setRateLimit(parseInt(e.target.value) || 120)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Monthly Quota (queries / mo)</Label>
                <Input
                  type="number"
                  min={1000}
                  max={5000000}
                  step={5000}
                  value={monthlyQuota}
                  onChange={(e) => setMonthlyQuota(parseInt(e.target.value) || 50000)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="allowSens"
                checked={allowSensitive}
                onChange={(e) => setAllowSensitive(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="allowSens" className="text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                Allow unmasked sensitive fields (PII / phone numbers / BVN where authorized)
              </label>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Administrative Decision Notes (Optional)</Label>
              <Textarea
                rows={2}
                placeholder="Internal rationale or approval reference..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setApprovingReq(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
              onClick={handleConfirmApprove}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  <span>Provisioning Account...</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-4 w-4" />
                  <span>Approve & Email Credentials</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Rejection Dialog ────────────────────────────────────────────────── */}
      <Dialog open={!!rejectingReq} onOpenChange={() => setRejectingReq(null)}>
        <DialogContent className="max-w-md dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircleIcon className="h-6 w-6" />
              Reject Access Request
            </DialogTitle>
            <DialogDescription>
              Decline access for <strong>{rejectingReq?.organizationName}</strong>.
            </DialogDescription>
          </DialogHeader>

          {submitError && (
            <div className="p-3 rounded-lg bg-red-50 text-xs text-red-700">
              {submitError}
            </div>
          )}

          <div className="space-y-2 py-2">
            <Label className="text-xs">Reason for Rejection</Label>
            <Textarea
              rows={3}
              placeholder="e.g. Incomplete KYB documentation, invalid CAC number, unverified corporate email..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingReq(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={submitting}
            >
              {submitting ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Success / Generated Credentials Modal ────────────────────────────── */}
      <Dialog open={!!provisionedResult} onOpenChange={() => setProvisionedResult(null)}>
        <DialogContent className="max-w-lg dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircleIcon className="h-6 w-6" />
              Access Provisioned & Credentials Dispatched
            </DialogTitle>
            <DialogDescription>
              The client portal account and live API key are active. An automated welcome email containing these credentials was sent to <strong>{provisionedResult?.email}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3.5 bg-slate-50 dark:bg-gray-900 rounded-xl border dark:border-gray-700 space-y-2">
              <div className="font-bold text-gray-900 dark:text-white border-b pb-1.5 dark:border-gray-700">
                Portal Sign-In Credentials
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Login URL:</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">/portal/login</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Corporate Email:</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">{provisionedResult?.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Temporary Password:</span>
                <span className="font-mono font-bold bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-emerald-700 dark:text-emerald-400">
                  {provisionedResult?.temporaryPassword}
                </span>
              </div>
            </div>

            {provisionedResult?.apiKey && (
              <div className="p-3.5 bg-slate-50 dark:bg-gray-900 rounded-xl border dark:border-gray-700 space-y-2">
                <div className="flex justify-between items-center border-b pb-1.5 dark:border-gray-700">
                  <span className="font-bold text-gray-900 dark:text-white">Live API Key</span>
                  <span className="font-mono text-[10px] text-gray-500">Prefix: {provisionedResult.apiKey.keyPrefix}</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={provisionedResult.apiKey.token}
                    className="w-full font-mono text-xs bg-gray-900 text-emerald-400 p-2.5 rounded-lg border border-gray-700 pr-20"
                  />
                  <Button
                    size="sm"
                    className="absolute right-1 top-1 h-7 text-xs bg-emerald-700 hover:bg-emerald-600 text-white"
                    onClick={() => copyText(provisionedResult.apiKey.token)}
                  >
                    {copiedKey ? 'Copied!' : 'Copy Key'}
                  </Button>
                </div>
                <div className="text-[11px] text-gray-500 flex flex-wrap gap-1 pt-1">
                  <span>Scopes:</span>
                  {(provisionedResult.apiKey.scopes || []).map((s: string) => (
                    <Badge key={s} variant="outline" className="text-[10px] font-mono py-0">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              className="bg-[#013358] hover:bg-[#01254a] text-white"
              onClick={() => setProvisionedResult(null)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Direct Admin Account Creation Modal ───────────────────────────────── */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg dark:bg-gray-800">
          <form onSubmit={handleCreateDirectAccount} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BuildingOffice2Icon className="h-6 w-6 text-[#013358] dark:text-blue-400" />
                Directly Create Partner Access Account
              </DialogTitle>
              <DialogDescription>
                Provision an institutional Client Portal account and live API key for a partner organization directly from the admin dashboard.
              </DialogDescription>
            </DialogHeader>

            {createError && (
              <div className="p-3 rounded-lg bg-red-50 text-xs text-red-700">
                {createError}
              </div>
            )}

            <div className="space-y-3 text-xs max-h-[60vh] overflow-y-auto pr-1">
              <div className="space-y-1">
                <Label className="text-xs">Organization Name *</Label>
                <Input
                  required
                  placeholder="e.g. Zenith Agribusiness Ltd"
                  value={createForm.organizationName}
                  onChange={(e) => setCreateForm({ ...createForm, organizationName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">RC / CAC Number</Label>
                  <Input
                    placeholder="e.g. RC 9876543"
                    value={createForm.rcNumber}
                    onChange={(e) => setCreateForm({ ...createForm, rcNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tax ID (TIN)</Label>
                  <Input
                    placeholder="Optional"
                    value={createForm.taxId}
                    onChange={(e) => setCreateForm({ ...createForm, taxId: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Contact Person Name *</Label>
                <Input
                  required
                  placeholder="e.g. Dr. Amina Yusuf"
                  value={createForm.contactName}
                  onChange={(e) => setCreateForm({ ...createForm, contactName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Corporate Email *</Label>
                  <Input
                    required
                    type="email"
                    placeholder="api@zenithagri.ng"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone Number</Label>
                  <Input
                    placeholder="+234..."
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  />
                </div>
              </div>

              {/* Scopes */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-semibold">Granted Permissions / Scopes *</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_SCOPES.map((sc) => {
                    const checked = createForm.scopes.includes(sc.id);
                    return (
                      <div
                        key={sc.id}
                        onClick={() => toggleCreateScope(sc.id)}
                        className={`p-2 rounded-lg border cursor-pointer flex items-center gap-2 select-none ${
                          checked
                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700'
                            : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        <input type="checkbox" checked={checked} onChange={() => {}} />
                        <span className="font-semibold text-gray-900 dark:text-white">{sc.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs">Rate Limit (req/min)</Label>
                  <Input
                    type="number"
                    value={createForm.rateLimit}
                    onChange={(e) => setCreateForm({ ...createForm, rateLimit: parseInt(e.target.value) || 120 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Monthly Quota</Label>
                  <Input
                    type="number"
                    value={createForm.monthlyQuota}
                    onChange={(e) => setCreateForm({ ...createForm, monthlyQuota: parseInt(e.target.value) || 50000 })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="directSens"
                  checked={createForm.allowSensitiveFields}
                  onChange={(e) => setCreateForm({ ...createForm, allowSensitiveFields: e.target.checked })}
                />
                <label htmlFor="directSens" className="text-xs cursor-pointer">
                  Allow unmasked sensitive fields
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendMail"
                  checked={createForm.sendEmail}
                  onChange={(e) => setCreateForm({ ...createForm, sendEmail: e.target.checked })}
                />
                <label htmlFor="sendMail" className="text-xs cursor-pointer font-medium text-[#013358] dark:text-blue-400">
                  Send welcome email with credentials & API key automatically
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} disabled={creatingAccount}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#013358] hover:bg-[#01254a] text-white" disabled={creatingAccount}>
                {creatingAccount ? 'Creating Account...' : 'Provision Access Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

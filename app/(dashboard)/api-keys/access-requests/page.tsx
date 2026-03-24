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
  KeyIcon,
  ClockIcon,
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

type Status = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

interface AccessRequest {
  id: string;
  organizationName: string;
  contactName: string;
  email: string;
  phone: string | null;
  intendedUse: string;
  requestedScopes: string[];
  expectedVolume: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_TABS: { label: string; value: Status }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
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

  // Review dialog
  const [reviewing, setReviewing] = useState<AccessRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionStatus, setActionStatus] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Detail expansion
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = activeTab === 'ALL'
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

  function openReview(req: AccessRequest, action: 'APPROVED' | 'REJECTED') {
    setReviewing(req);
    setActionStatus(action);
    setAdminNotes(req.adminNotes ?? '');
    setSubmitError(null);
  }

  async function handleSubmitReview() {
    if (!reviewing || !actionStatus) return;
    if (actionStatus === 'REJECTED' && !adminNotes.trim()) {
      setSubmitError('Please provide a reason for rejection.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/admin/api-access-requests/${reviewing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: actionStatus, adminNotes: adminNotes.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to update');
      setReviewing(null);
      await fetchRequests();
    } catch (e: any) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function statusBadge(status: AccessRequest['status']) {
    if (status === 'APPROVED') {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
          <CheckCircleIcon className="h-3.5 w-3.5" /> Approved
        </span>
      );
    }
    if (status === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
          <XCircleIcon className="h-3.5 w-3.5" /> Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
        <ClockIcon className="h-3.5 w-3.5" /> Pending
      </span>
    );
  }

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/api-keys">
            <Button variant="ghost" size="sm" className="gap-1.5 dark:text-gray-400 dark:hover:text-white">
              <ArrowLeftIcon className="h-4 w-4" /> API Keys
            </Button>
          </Link>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <InboxIcon className="h-6 w-6 text-[#013358] dark:text-blue-400" />
              Access Requests
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Review and approve API access applications.
            </p>
          </div>
        </div>
        {pendingCount > 0 && activeTab !== 'PENDING' && (
          <button
            onClick={() => setActiveTab('PENDING')}
            className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-full font-medium"
          >
            {pendingCount} pending review
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b dark:border-gray-700">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.value
                ? 'border-[#013358] text-[#013358] dark:border-blue-400 dark:text-blue-300'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" /> Loading…
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16 text-red-500 gap-2">
              <ExclamationTriangleIcon className="h-5 w-5" /> {error}
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <InboxIcon className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">No {activeTab !== 'ALL' ? activeTab.toLowerCase() : ''} requests.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="dark:border-gray-700">
                  <TableHead className="dark:text-gray-400">Organization</TableHead>
                  <TableHead className="dark:text-gray-400">Contact</TableHead>
                  <TableHead className="dark:text-gray-400">Scopes Requested</TableHead>
                  <TableHead className="dark:text-gray-400">Volume</TableHead>
                  <TableHead className="dark:text-gray-400">Status</TableHead>
                  <TableHead className="dark:text-gray-400">Date</TableHead>
                  <TableHead className="dark:text-gray-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map(req => (
                  <React.Fragment key={req.id}>
                    <TableRow
                      className="dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={() => setExpanded(expanded === req.id ? null : req.id)}
                    >
                      <TableCell className="font-medium dark:text-white">
                        <div className="flex items-center gap-1.5">
                          <ChevronDownIcon
                            className={`h-3.5 w-3.5 text-gray-400 transition-transform ${expanded === req.id ? 'rotate-180' : ''}`}
                          />
                          {req.organizationName}
                        </div>
                      </TableCell>
                      <TableCell className="dark:text-gray-300 text-sm">
                        <div>{req.contactName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{req.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {req.requestedScopes.map(s => (
                            <Badge key={s} variant="secondary" className="text-xs dark:bg-gray-700 dark:text-gray-300">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm dark:text-gray-400">{req.expectedVolume ?? '—'}</TableCell>
                      <TableCell>{statusBadge(req.status)}</TableCell>
                      <TableCell className="text-sm dark:text-gray-400 whitespace-nowrap">{formatDate(req.createdAt)}</TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        {req.status === 'PENDING' && (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => openReview(req, 'APPROVED')}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                              onClick={() => openReview(req, 'REJECTED')}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                        {req.status === 'APPROVED' && (
                          <Link
                            href={`/api-keys?prefill=${encodeURIComponent(req.organizationName)}`}
                            onClick={e => e.stopPropagation()}
                          >
                            <Button size="sm" className="h-7 text-xs bg-[#013358] hover:bg-[#01254a] text-white gap-1">
                              <KeyIcon className="h-3 w-3" /> Create Key
                            </Button>
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>

                    {/* Expanded details row */}
                    {expanded === req.id && (
                      <TableRow key={`${req.id}-detail`} className="dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <TableCell colSpan={7} className="py-3 px-6">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                Intended Use
                              </div>
                              <p className="text-gray-700 dark:text-gray-300">{req.intendedUse}</p>
                            </div>
                            {req.phone && (
                              <div>
                                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Phone</div>
                                <p className="text-gray-700 dark:text-gray-300">{req.phone}</p>
                              </div>
                            )}
                            {req.adminNotes && (
                              <div className="sm:col-span-2">
                                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Admin Notes</div>
                                <p className="text-gray-700 dark:text-gray-300">{req.adminNotes}</p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!reviewing} onOpenChange={open => { if (!open) { setReviewing(null); setSubmitError(null); } }}>
        <DialogContent className="max-w-md dark:bg-gray-900 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className={`dark:text-white ${actionStatus === 'APPROVED' ? '' : 'text-red-600 dark:text-red-400'}`}>
              {actionStatus === 'APPROVED' ? 'Approve Access Request' : 'Reject Access Request'}
            </DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              {reviewing && (
                <>
                  <span className="font-medium text-gray-700 dark:text-gray-200">{reviewing.organizationName}</span>
                  {' '}— {reviewing.contactName} ({reviewing.email})
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {submitError && (
              <div className="text-sm text-red-600 dark:text-red-400 rounded border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-2">
                {submitError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="dark:text-gray-200">
                Admin Notes {actionStatus === 'REJECTED' && <span className="text-red-500">*</span>}
              </Label>
              <Textarea
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                placeholder={
                  actionStatus === 'APPROVED'
                    ? 'Optional — e.g. "Approved for research use, please create key with farmers:read scope."'
                    : 'Required — provide reason for rejection.'
                }
                rows={3}
                className="dark:bg-gray-800 dark:border-gray-600 dark:text-white resize-none"
              />
            </div>
            {actionStatus === 'APPROVED' && (
              <div className="rounded-md border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 p-3 text-sm text-blue-700 dark:text-blue-300">
                After approving, use the <strong>Create Key</strong> button to provision API access for this organisation.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setReviewing(null); setSubmitError(null); }} className="dark:border-gray-600 dark:text-gray-300">
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={submitting}
              className={`gap-2 text-white ${
                actionStatus === 'APPROVED'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {submitting ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : null}
              {submitting ? 'Saving…' : actionStatus === 'APPROVED' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

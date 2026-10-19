'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
  KeyRound,
  Mail,
  User,
  Building2,
  Phone,
  ShieldCheck,
  Send,
  Loader2,
  Check,
  Copy,
} from 'lucide-react';
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
import { Input } from '@/components/ui/input';
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

interface ZoraRequest {
  id: string;
  fullName: string;
  email: string;
  organizationName: string;
  role: string;
  phone: string | null;
  useCase: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNotes: string | null;
  credentialsSentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_TABS: { label: string; value: Status }[] = [
  { label: 'All Requests', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
];



export default function ZoraAccessRequestsPage() {
  const { data: session } = useSession();

  const [requests, setRequests] = useState<ZoraRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Status>('PENDING');

  // Approval Modal State
  const [approving, setApproving] = useState<ZoraRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Rejection Modal State
  const [rejecting, setRejecting] = useState<ZoraRequest | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');

  // Success banner
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url =
        activeTab === 'ALL'
          ? '/api/admin/zora-requests?limit=50'
          : `/api/admin/zora-requests?status=${activeTab}&limit=50`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load Zora requests');
      const json = await res.json();
      setRequests(json.data ?? []);
      setTotal(json.pagination?.total ?? 0);
    } catch (err: any) {
      setError(err?.message || 'Error loading requests');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  function handleOpenApprove(req: ZoraRequest) {
    setApproving(req);
    setAdminNotes(req.adminNotes || '');
    setSubmitError(null);
  }

  async function handleConfirmApprove() {
    if (!approving) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/admin/zora-requests/${approving.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve request');

      setSuccessMsg(
        data.message || 'Free Zora access enabled.'
      );
      setApproving(null);
      fetchRequests();
    } catch (err: any) {
      setSubmitError(err?.message || 'Approval failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmReject() {
    if (!rejecting) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/admin/zora-requests/${rejecting.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminNotes: rejectNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject request');

      setSuccessMsg(`Access request for ${rejecting.email} has been declined.`);
      setRejecting(null);
      fetchRequests();
    } catch (err: any) {
      setSubmitError(err?.message || 'Rejection failed');
    } finally {
      setSubmitting(false);
    }
  }



  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/requests"
              className="text-slate-500 hover:text-slate-700 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              CCSA Zora Access Requests
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review Zora applications and enable free access for existing FIMS farmers and agents.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchRequests}
          disabled={loading}
          className="gap-2 self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Card */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">
                Applications ({total})
              </CardTitle>
              <CardDescription className="text-xs">
                Pending requests trigger notification alerts to abdulrahman.dauda@cosmopolitan.edu.ng.
              </CardDescription>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg self-start">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                    activeTab === tab.value
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-slate-500 text-xs space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
              <p>Loading Zora access requests...</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center text-red-600 text-xs space-y-2">
              <AlertTriangle className="w-6 h-6 mx-auto" />
              <p>{error}</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs space-y-1">
              <p className="font-semibold text-slate-700">No requests found</p>
              <p>There are no {activeTab !== 'ALL' ? activeTab.toLowerCase() : ''} Zora access requests at this time.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>Applicant</TableHead>
                  <TableHead>Organization & Role</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Intended Use</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id} className="text-xs">
                    <TableCell>
                      <div className="font-bold text-slate-900">{req.fullName}</div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="font-medium text-slate-800">{req.organizationName}</div>
                      <Badge variant="outline" className="mt-0.5 text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200">
                        {req.role}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="font-mono text-slate-700">{req.email}</div>
                      {req.phone && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          <span>{req.phone}</span>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="max-w-xs">
                      <p className="truncate text-slate-600" title={req.useCase}>
                        {req.useCase}
                      </p>
                    </TableCell>

                    <TableCell>
                      {req.status === 'PENDING' && (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
                          Pending
                        </Badge>
                      )}
                      {req.status === 'APPROVED' && (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">
                          Approved
                        </Badge>
                      )}
                      {req.status === 'REJECTED' && (
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">
                          Declined
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right space-x-2">
                      {req.status === 'PENDING' ? (
                        <>
                          <Button
                            size="sm"
                            className="bg-emerald-700 hover:bg-emerald-800 text-white h-7 px-2.5 text-xs font-semibold gap-1.5"
                            onClick={() => handleOpenApprove(req)}
                          >
                            <KeyRound className="w-3 h-3" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2 text-xs"
                            onClick={() => {
                              setRejecting(req);
                              setRejectNotes('');
                            }}
                          >
                            Decline
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-slate-500"
                          onClick={() => handleOpenApprove(req)}
                        >
                          View Credentials
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approval & Credential Generator Modal */}
      <Dialog open={!!approving} onOpenChange={(open) => !open && setApproving(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>{approving?.status === 'APPROVED' ? 'Zora Access' : 'Enable Free Zora Access'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {approving?.status === 'APPROVED'
                ? 'Access is managed through the farmer or agent table.'
                : 'Enable Zora for the matching FIMS identity. Farmers use phone verification; agents use CCSA Mobile.'}
            </DialogDescription>
          </DialogHeader>

          {approving && (
            <div className="space-y-4 py-2">
              {submitError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {submitError}
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                <div className="font-semibold text-slate-900">{approving.fullName}</div>
                <div className="text-slate-600">{approving.organizationName} · {approving.role}</div>
                <div className="font-mono text-emerald-800">{approving.email}</div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Admin Review Notes (Optional)
                </Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="e.g. Approved for Pilot Season 1"
                  rows={2}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setApproving(null)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-700 hover:bg-emerald-800 text-white gap-2"
              onClick={handleConfirmApprove}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{approving?.status === 'APPROVED' ? 'Enable Zora Access' : 'Approve Free Access'}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Modal */}
      <Dialog open={!!rejecting} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Decline Access Request
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to decline the access request for {rejecting?.email}?
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">
              Reason / Internal Notes (Optional)
            </Label>
            <Textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="e.g. Unverified organization"
              rows={3}
              className="text-xs"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejecting(null)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={submitting}
            >
              {submitting ? 'Declining...' : 'Decline Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


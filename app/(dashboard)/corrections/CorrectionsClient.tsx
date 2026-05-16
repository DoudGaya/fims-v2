'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { usePermissions } from '@/components/PermissionProvider';
import { PERMISSIONS } from '@/lib/permissions';
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ClipboardDocumentCheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface AuditFarmer {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  nin: string | null;
}

interface AuditLogEntry {
  id: string;
  action: string;
  tableName: string;
  recordId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  userId: string | null;
  timestamp: string;
  user: AuditUser | null;
  farmer: AuditFarmer | null;
}

interface CorrectionEntry {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  correctionType: string;
  changes: Record<string, { from: unknown; to: unknown }>;
  adminNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
  farmer: AuditFarmer;
  farm?: { id: string; primaryCrop?: string; farmState?: string; farmLocalGovernment?: string; farmSize?: number } | null;
  submitter: AuditUser;
  reviewer: AuditUser | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function CorrectionTypeBadge({ type }: { type: string }) {
  const cfg =
    type === 'FARM'    ? { label: 'Farm',    cls: 'bg-emerald-100 text-emerald-700' } :
    type === 'REFEREE' ? { label: 'Referee', cls: 'bg-purple-100 text-purple-700' } :
                         { label: 'Farmer',  cls: 'bg-blue-100 text-blue-700' };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function diffValues(
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
): { field: string; from: string; to: string }[] {
  if (!newValues) return [];
  const old = oldValues ?? {};
  return Object.entries(newValues)
    .filter(([k, v]) => old[k] !== v)
    .map(([k, v]) => ({
      field: k,
      from: old[k] != null ? String(old[k]) : '—',
      to: v != null ? String(v) : '—',
    }));
}

function changesFromCorrection(
  changes: Record<string, { from: unknown; to: unknown }>,
): { field: string; from: string; to: string }[] {
  return Object.entries(changes).map(([field, diff]) => ({
    field,
    from: diff.from != null ? String(diff.from) : '—',
    to:   diff.to   != null ? String(diff.to)   : '—',
  }));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CorrectionsClient() {
  const { status } = useSession();
  const { hasPermission } = usePermissions();

  // ── Pending corrections state ──
  const [pending, setPending]           = useState<CorrectionEntry[]>([]);
  const [pendingPag, setPendingPag]     = useState<Pagination>({ page: 1, limit: 50, total: 0, pages: 0 });
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingError, setPendingError] = useState<string | null>(null);

  // ── Audit log state (history) ──
  const [logs, setLogs]           = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, pages: 0 });
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // ── Shared state ──
  const [search, setSearch]     = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  // ── Review dialog ──
  const [reviewTarget, setReviewTarget] = useState<CorrectionEntry | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [adminNotes, setAdminNotes]     = useState('');
  const [reviewing, setReviewing]       = useState(false);

  // ── Fetch pending corrections ──
  const fetchPending = useCallback(
    async (page = 1) => {
      if (status !== 'authenticated') return;
      setPendingLoading(true);
      try {
        const params = new URLSearchParams({ status: 'PENDING', page: String(page), limit: '50' });
        if (search.trim()) params.set('search', search.trim());
        const res = await fetch(`/api/corrections?${params}`);
        if (!res.ok) throw new Error('Failed to load pending corrections');
        const data = await res.json();
        setPending(data.corrections);
        setPendingPag(data.pagination);
        setPendingError(null);
      } catch (e: unknown) {
        setPendingError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setPendingLoading(false);
      }
    },
    [status, search],
  );

  // ── Fetch audit log ──
  const fetchLogs = useCallback(
    async (page = 1) => {
      if (status !== 'authenticated') return;
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: '50' });
        if (search.trim()) params.set('search', search.trim());
        const res = await fetch(`/api/corrections/audit?${params}`);
        if (!res.ok) throw new Error('Failed to load audit log');
        const data = await res.json();
        setLogs(data.logs);
        setPagination(data.pagination);
        setError(null);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [status, search],
  );

  useEffect(() => {
    fetchPending(1);
    fetchLogs(1);
  }, [status]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPending(1);
    fetchLogs(1);
  };

  // ── Open review dialog ──
  const openReview = (entry: CorrectionEntry, action: 'approve' | 'reject') => {
    setReviewTarget(entry);
    setReviewAction(action);
    setAdminNotes('');
  };

  // ── Submit review ──
  const submitReview = async () => {
    if (!reviewTarget || !reviewAction) return;
    setReviewing(true);
    try {
      const res = await fetch(`/api/corrections/${reviewTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: reviewAction, adminNotes: adminNotes || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to review correction');
      }
      setReviewTarget(null);
      setReviewAction(null);
      fetchPending(pendingPag.page);
      fetchLogs(1);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error reviewing correction');
    } finally {
      setReviewing(false);
    }
  };

  if (status === 'authenticated' && !hasPermission(PERMISSIONS.CORRECTIONS_READ)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
        <ClipboardDocumentCheckIcon className="h-12 w-12 text-muted-foreground opacity-40" />
        <p className="text-lg font-semibold">Access Denied</p>
        <p className="text-sm text-muted-foreground">You do not have permission to view correction logs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Corrections</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review pending corrections and view correction history
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchPending(1); fetchLogs(1); }} disabled={pendingLoading || loading}>
          <ArrowPathIcon className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <ClipboardDocumentCheckIcon className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingPag.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Reviewed</CardTitle>
            <CheckCircleIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Showing</CardTitle>
            <ClipboardDocumentCheckIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length + pending.length}</div>
            <p className="text-xs text-muted-foreground">across both tabs</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <Input
          placeholder="Search by farmer name, NIN, or agent…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button type="submit" size="sm">
          <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
          Search
        </Button>
        {search && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { setSearch(''); fetchPending(1); fetchLogs(1); }}
          >
            Clear
          </Button>
        )}
      </form>

      {/* Tabs */}
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending
            {pendingPag.total > 0 && (
              <span className="ml-2 rounded-full bg-yellow-500 text-white text-xs px-1.5 py-0.5 leading-none">
                {pendingPag.total}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* ── Pending Tab ── */}
        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {pendingLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading…</div>
              ) : pendingError ? (
                <div className="p-8 text-center text-destructive">{pendingError}</div>
              ) : pending.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No pending corrections.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Farmer</TableHead>
                      <TableHead>NIN</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Submitted By</TableHead>
                      <TableHead>Fields</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="w-10" />
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pending.map((c) => {
                      const diffs      = changesFromCorrection(c.changes);
                      const isExpanded = expanded === c.id;
                      const farmerName = [c.farmer.firstName, c.farmer.middleName, c.farmer.lastName]
                        .filter(Boolean).join(' ');
                      const agentName  = `${c.submitter.firstName} ${c.submitter.lastName}`;
                      return (
                        <>
                          <TableRow
                            key={c.id}
                            className="cursor-pointer hover:bg-muted/40"
                            onClick={() => setExpanded(isExpanded ? null : c.id)}
                          >
                            <TableCell className="font-medium">
                              <div>{farmerName}</div>
                              {c.correctionType === 'FARM' && c.farm && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {c.farm.primaryCrop ?? '—'} · {c.farm.farmState ?? '—'}
                                  {c.farm.farmSize != null ? ` · ${c.farm.farmSize} ha` : ''}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground font-mono">
                              {c.farmer.nin ?? '—'}
                            </TableCell>
                            <TableCell>
                              <CorrectionTypeBadge type={c.correctionType ?? 'FARMER'} />
                            </TableCell>
                            <TableCell className="text-sm">{agentName}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                                {diffs.length} field{diffs.length !== 1 ? 's' : ''}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {format(new Date(c.createdAt), 'MMM d, yyyy HH:mm')}
                            </TableCell>
                            <TableCell>
                              {isExpanded
                                ? <ChevronUpIcon   className="h-4 w-4 text-muted-foreground" />
                                : <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />}
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex gap-2 justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 border-green-400 hover:bg-green-50"
                                  onClick={() => openReview(c, 'approve')}
                                >
                                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive border-destructive/40 hover:bg-destructive/10"
                                  onClick={() => openReview(c, 'reject')}
                                >
                                  <XCircleIcon className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>

                          {isExpanded && (
                            <TableRow key={`${c.id}-detail`}>
                              <TableCell colSpan={7} className="bg-muted/30 p-4">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-left text-muted-foreground border-b">
                                      <th className="pb-1 pr-6 font-medium">Field</th>
                                      <th className="pb-1 pr-6 font-medium">Before</th>
                                      <th className="pb-1 font-medium">After</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {diffs.map((d) => (
                                      <tr key={d.field} className="border-b last:border-0">
                                        <td className="py-1.5 pr-6 font-mono text-xs text-muted-foreground">{d.field}</td>
                                        <td className="py-1.5 pr-6 text-destructive line-through">{d.from}</td>
                                        <td className="py-1.5 text-green-600 font-medium">{d.to}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {pendingPag.pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <Button variant="outline" size="sm" disabled={pendingPag.page <= 1 || pendingLoading} onClick={() => fetchPending(pendingPag.page - 1)}>
                <ChevronLeftIcon className="h-4 w-4 mr-1" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {pendingPag.page} of {pendingPag.pages}</span>
              <Button variant="outline" size="sm" disabled={pendingPag.page >= pendingPag.pages || pendingLoading} onClick={() => fetchPending(pendingPag.page + 1)}>
                Next <ChevronRightIcon className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ── History Tab ── */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Loading…</div>
              ) : error ? (
                <div className="p-8 text-center text-destructive">{error}</div>
              ) : logs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No correction history found.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Farmer</TableHead>
                      <TableHead>NIN</TableHead>
                      <TableHead>Corrected By</TableHead>
                      <TableHead>Fields Changed</TableHead>
                      <TableHead>Date &amp; Time</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const diffs      = diffValues(
                        log.oldValues as Record<string, unknown> | null,
                        log.newValues as Record<string, unknown> | null,
                      );
                      const isExpanded = expanded === log.id;
                      const farmerName = log.farmer
                        ? [log.farmer.firstName, log.farmer.middleName, log.farmer.lastName].filter(Boolean).join(' ')
                        : log.recordId ?? '—';
                      const agentName  = log.user
                        ? `${log.user.firstName} ${log.user.lastName}`
                        : log.userId ?? '—';

                      return (
                        <>
                          <TableRow
                            key={log.id}
                            className="cursor-pointer hover:bg-muted/40"
                            onClick={() => setExpanded(isExpanded ? null : log.id)}
                          >
                            <TableCell className="font-medium">{farmerName}</TableCell>
                            <TableCell className="text-sm text-muted-foreground font-mono">{log.farmer?.nin ?? '—'}</TableCell>
                            <TableCell className="text-sm">{agentName}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                {diffs.length} field{diffs.length !== 1 ? 's' : ''}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm')}
                            </TableCell>
                            <TableCell>
                              {isExpanded
                                ? <ChevronUpIcon   className="h-4 w-4 text-muted-foreground" />
                                : <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />}
                            </TableCell>
                          </TableRow>

                          {isExpanded && (
                            <TableRow key={`${log.id}-detail`}>
                              <TableCell colSpan={6} className="bg-muted/30 p-4">
                                {diffs.length === 0 ? (
                                  <p className="text-sm text-muted-foreground italic">No field differences recorded.</p>
                                ) : (
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="text-left text-muted-foreground border-b">
                                        <th className="pb-1 pr-6 font-medium">Field</th>
                                        <th className="pb-1 pr-6 font-medium">Before</th>
                                        <th className="pb-1 font-medium">After</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {diffs.map((d) => (
                                        <tr key={d.field} className="border-b last:border-0">
                                          <td className="py-1.5 pr-6 font-mono text-xs text-muted-foreground">{d.field}</td>
                                          <td className="py-1.5 pr-6 text-destructive line-through">{d.from}</td>
                                          <td className="py-1.5 text-green-600 font-medium">{d.to}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <Button variant="outline" size="sm" disabled={pagination.page <= 1 || loading} onClick={() => fetchLogs(pagination.page - 1)}>
                <ChevronLeftIcon className="h-4 w-4 mr-1" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.pages}</span>
              <Button variant="outline" size="sm" disabled={pagination.page >= pagination.pages || loading} onClick={() => fetchLogs(pagination.page + 1)}>
                Next <ChevronRightIcon className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Review Dialog ── */}
      <Dialog open={!!reviewTarget} onOpenChange={(open) => { if (!open) setReviewTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Approve Correction' : 'Reject Correction'}
            </DialogTitle>
          </DialogHeader>

          {reviewTarget && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">
                  Farmer: {[reviewTarget.farmer.firstName, reviewTarget.farmer.middleName, reviewTarget.farmer.lastName].filter(Boolean).join(' ')}
                </p>
                <p className="text-xs text-muted-foreground">NIN: {reviewTarget.farmer.nin ?? '—'}</p>
              </div>

              <div className="rounded-md border p-3 bg-muted/30 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Proposed changes</p>
                {changesFromCorrection(reviewTarget.changes).map((d) => (
                  <div key={d.field} className="grid grid-cols-3 text-sm gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{d.field}</span>
                    <span className="text-destructive line-through">{d.from}</span>
                    <span className="text-green-600 font-medium">{d.to}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Admin Notes {reviewAction === 'reject' ? '(required)' : '(optional)'}
                </label>
                <Textarea
                  placeholder={reviewAction === 'reject' ? 'Reason for rejection…' : 'Optional notes…'}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewTarget(null)} disabled={reviewing}>
              Cancel
            </Button>
            <Button
              variant={reviewAction === 'approve' ? 'default' : 'destructive'}
              onClick={submitReview}
              disabled={reviewing || (reviewAction === 'reject' && !adminNotes.trim())}
            >
              {reviewing ? 'Saving…' : reviewAction === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

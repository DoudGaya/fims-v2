'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/components/PermissionProvider';
import { PERMISSIONS } from '@/lib/permissions';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

import { CheckCircle, XCircle, Eye, Trash2, MapPin } from 'lucide-react';

const FarmPolygonMapLibre = dynamic(
  () => import('@/components/maps/FarmPolygonMapLibre'),
  { ssr: false }
);

type RequestStatus = 'all' | 'PENDING' | 'APPROVED' | 'REJECTED';

interface DeleteRequest {
  id: string;
  farmId: string | null;
  farmerId: string;
  farmerName: string;
  farmSnapshot: {
    primaryCrop?: string;
    farmSize?: number;
    farmState?: string;
    farmLocalGovernment?: string;
    farmWard?: string;
    farmPollingUnit?: string;
    farmLatitude?: number;
    farmLongitude?: number;
    farmPolygon?: any;
    farmingSeason?: string;
    produceCategory?: string;
  };
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
  requestedBy: { id: string; firstName: string; lastName: string; email: string } | null;
  reviewedBy: { id: string; firstName: string; lastName: string; email: string } | null;
}

function statusBadge(status: string) {
  if (status === 'PENDING')
    return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">Pending</Badge>;
  if (status === 'APPROVED')
    return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">Approved</Badge>;
  return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">Rejected</Badge>;
}

export default function DeleteRequestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  const [requests, setRequests] = useState<DeleteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<RequestStatus>('PENDING');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Single action state
  const [actionTarget, setActionTarget] = useState<{ request: DeleteRequest; action: 'approve' | 'reject' } | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Batch action state
  const [batchAction, setBatchAction] = useState<'approve' | 'reject' | null>(null);
  const [batchNotes, setBatchNotes] = useState('');

  // Polygon view state
  const [polygonView, setPolygonView] = useState<DeleteRequest | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  const canManage = hasPermission(PERMISSIONS.REQUESTS_MANAGE);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = activeTab === 'all' ? 'all' : activeTab;
      const res = await fetch(`/api/farms/delete-requests?status=${statusParam}&page=${page}&limit=50`);
      const data = await res.json();
      setRequests(data.requests ?? []);
      setPagination(data.pagination ?? { total: 0, pages: 1 });
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    if (status === 'loading' || permissionsLoading) return;
    if (status === 'unauthenticated') router.push('/auth/signin');
    else if (status === 'authenticated') {
      if (!hasPermission(PERMISSIONS.REQUESTS_READ)) router.push('/dashboard');
    }
  }, [status, permissionsLoading, router, hasPermission]);

  useEffect(() => {
    if (status === 'authenticated' && !permissionsLoading) fetchRequests();
  }, [fetchRequests, status, permissionsLoading]);

  // Reset selection when tab changes
  useEffect(() => { setSelectedIds(new Set()); setPage(1); }, [activeTab]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pendingIds = requests.filter((r) => r.status === 'PENDING').map((r) => r.id);
    if (selectedIds.size === pendingIds.length && pendingIds.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingIds));
    }
  };

  // ── Single approve/reject ──────────────────────────────────────────────────
  const handleSingleAction = async () => {
    if (!actionTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/farms/delete-requests/${actionTarget.request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionTarget.action, adminNotes: actionNotes }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }
      setActionTarget(null);
      setActionNotes('');
      fetchRequests();
      setSelectedIds(new Set());
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Batch approve/reject ───────────────────────────────────────────────────
  const handleBatchAction = async () => {
    if (!batchAction || selectedIds.size === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/farms/delete-requests/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), action: batchAction, adminNotes: batchNotes }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }
      setBatchAction(null);
      setBatchNotes('');
      setSelectedIds(new Set());
      fetchRequests();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const allPendingSelected =
    pendingCount > 0 && selectedIds.size === pendingCount;

  return (
    <div className="w-full mx-auto px-1 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Farm Delete Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and approve or reject requests to delete farm records.
          </p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {pagination.total} total request{pagination.total !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Filter tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RequestStatus)}>
        <TabsList>
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Batch action toolbar — visible when items selected */}
      {selectedIds.size > 0 && canManage && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium text-blue-800">
            {selectedIds.size} selected
          </span>
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => { setBatchAction('approve'); setBatchNotes(''); }}
          >
            <CheckCircle className="mr-1.5 h-4 w-4" /> Approve Selected
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => { setBatchAction('reject'); setBatchNotes(''); }}
          >
            <XCircle className="mr-1.5 h-4 w-4" /> Reject Selected
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Trash2 className="h-10 w-10 mb-3 text-gray-300" />
              <p className="font-medium text-gray-700">No requests found</p>
              <p className="text-sm mt-1">No farm delete requests match this filter.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {canManage && activeTab === 'PENDING' && (
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allPendingSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all pending"
                      />
                    </TableHead>
                  )}
                  <TableHead>Farm</TableHead>
                  <TableHead>Farmer</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => {
                  const snap = req.farmSnapshot;
                  const farmLabel = [snap.primaryCrop, snap.farmSize ? `${snap.farmSize} ha` : null]
                    .filter(Boolean)
                    .join(' · ') || 'Unknown Farm';
                  const locationLabel = [snap.farmLocalGovernment, snap.farmState]
                    .filter(Boolean)
                    .join(', ');
                  const isPending = req.status === 'PENDING';

                  return (
                    <TableRow key={req.id} className={selectedIds.has(req.id) ? 'bg-blue-50' : ''}>
                      {canManage && activeTab === 'PENDING' && (
                        <TableCell>
                          {isPending && (
                            <Checkbox
                              checked={selectedIds.has(req.id)}
                              onCheckedChange={() => toggleSelect(req.id)}
                              aria-label="Select request"
                            />
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm text-gray-900">{farmLabel}</p>
                          {locationLabel && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" />{locationLabel}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-gray-900">{req.farmerName}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-gray-600 max-w-xs truncate" title={req.reason}>
                          {req.reason}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-gray-700">
                          {req.requestedBy
                            ? `${req.requestedBy.firstName} ${req.requestedBy.lastName}`
                            : '—'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(req.createdAt), 'MMM d, yyyy')}
                        </p>
                      </TableCell>
                      <TableCell>{statusBadge(req.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          {/* View polygon */}
                          {snap.farmPolygon && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPolygonView(req)}
                              title="View farm boundary"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}

                          {/* Single approve/reject */}
                          {isPending && canManage && (
                            <>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => { setActionTarget({ request: req, action: 'approve' }); setActionNotes(''); }}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => { setActionTarget({ request: req, action: 'reject' }); setActionNotes(''); }}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground self-center">
            Page {page} of {pagination.pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      {/* ── Single action confirm dialog ─────────────────────── */}
      <AlertDialog open={!!actionTarget} onOpenChange={(open) => { if (!open) setActionTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionTarget?.action === 'approve' ? 'Approve deletion?' : 'Reject deletion?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionTarget?.action === 'approve'
                ? `This will permanently delete the farm "${[actionTarget?.request.farmSnapshot.primaryCrop, actionTarget?.request.farmSnapshot.farmSize ? `${actionTarget?.request.farmSnapshot.farmSize} ha` : null].filter(Boolean).join(' · ')}" for farmer ${actionTarget?.request.farmerName}. This cannot be undone.`
                : `The farm will be kept. The request will be marked as rejected.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 pb-2 space-y-2">
            <Label className="text-sm font-medium">Notes (optional)</Label>
            <Textarea
              placeholder="Add admin notes…"
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              rows={2}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSingleAction}
              disabled={submitting}
              className={actionTarget?.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {submitting ? 'Processing…' : actionTarget?.action === 'approve' ? 'Yes, Approve & Delete' : 'Yes, Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Batch action confirm dialog ──────────────────────── */}
      <AlertDialog open={!!batchAction} onOpenChange={(open) => { if (!open) setBatchAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {batchAction === 'approve'
                ? `Approve ${selectedIds.size} request(s)?`
                : `Reject ${selectedIds.size} request(s)?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {batchAction === 'approve'
                ? `This will permanently delete ${selectedIds.size} farm(s). This cannot be undone.`
                : `${selectedIds.size} request(s) will be rejected and the farms will be kept.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 pb-2 space-y-2">
            <Label className="text-sm font-medium">Notes (optional)</Label>
            <Textarea
              placeholder="Add admin notes for all selected…"
              value={batchNotes}
              onChange={(e) => setBatchNotes(e.target.value)}
              rows={2}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchAction}
              disabled={submitting}
              className={batchAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {submitting
                ? 'Processing…'
                : batchAction === 'approve'
                  ? `Approve & Delete ${selectedIds.size}`
                  : `Reject ${selectedIds.size}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Polygon view dialog ───────────────────────────────── */}
      <Dialog open={!!polygonView} onOpenChange={(open) => { if (!open) setPolygonView(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Farm Boundary</DialogTitle>
            <DialogDescription>
              {polygonView && (
                <>
                  {[polygonView.farmSnapshot.primaryCrop, polygonView.farmSnapshot.farmSize ? `${polygonView.farmSnapshot.farmSize} ha` : null].filter(Boolean).join(' · ')}
                  {' — '}
                  {[polygonView.farmSnapshot.farmLocalGovernment, polygonView.farmSnapshot.farmState].filter(Boolean).join(', ')}
                  <span className="ml-2 text-muted-foreground">({polygonView.farmerName})</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {polygonView?.farmSnapshot.farmPolygon && (
            <div className="h-[400px] w-full rounded-lg overflow-hidden border">
              <FarmPolygonMapLibre
                polygonData={polygonView.farmSnapshot.farmPolygon}
                latitude={polygonView.farmSnapshot.farmLatitude}
                longitude={polygonView.farmSnapshot.farmLongitude}
                height={400}
              />
            </div>
          )}
          {polygonView && (
            <div className="grid grid-cols-2 gap-3 text-sm mt-2">
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wide">Reason for deletion</span>
                <p className="mt-1 text-gray-800">{polygonView.reason}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wide">Requested by</span>
                <p className="mt-1 text-gray-800">
                  {polygonView.requestedBy
                    ? `${polygonView.requestedBy.firstName} ${polygonView.requestedBy.lastName}`
                    : '—'}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPolygonView(null)}>Close</Button>
            {polygonView?.status === 'PENDING' && canManage && (
              <>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    setPolygonView(null);
                    setActionTarget({ request: polygonView!, action: 'approve' });
                    setActionNotes('');
                  }}
                >
                  <CheckCircle className="mr-1.5 h-4 w-4" /> Approve & Delete
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setPolygonView(null);
                    setActionTarget({ request: polygonView!, action: 'reject' });
                    setActionNotes('');
                  }}
                >
                  <XCircle className="mr-1.5 h-4 w-4" /> Reject
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/components/PermissionProvider';
import { PERMISSIONS } from '@/lib/permissions';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';
import { formatPollingUnit } from '@/lib/textUtils';

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

import { CheckCircle, XCircle, Eye, Trash2, MapPin, Home, Sprout } from 'lucide-react';

const FarmPolygonMapLibre = dynamic(
  () => import('@/components/maps/FarmPolygonMapLibre'),
  { ssr: false }
);

type RequestStatus = 'all' | 'PENDING' | 'APPROVED' | 'REJECTED';
type EntityType = 'farms' | 'households';

interface FarmDeleteRequest {
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

interface HouseholdDeleteRequest {
  id: string;
  householdId: string | null;
  houseNumber: string;
  headFullName: string;
  headPhone: string;
  householdSnapshot: {
    houseNumber?: string;
    headFirstName?: string;
    headMiddleName?: string;
    headLastName?: string;
    headPhone?: string;
    headPhoneVerified?: boolean;
    headNin?: string;
    headNinVerified?: boolean;
    headGender?: string;
    state?: string;
    lga?: string;
    ward?: string;
    pollingUnit?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    gpsAddress?: string;
    houseFrontPhotoUrl?: string;
    headPhotoUrl?: string;
    wivesCount?: number;
    childrenCount?: number;
    otherDependentsCount?: number;
    totalHouseholdMembers?: number;
    telcoProviders?: string[];
    networkType?: string;
    commercialCustomersCount?: number;
    hasPUE?: boolean;
    pueType?: string;
    primaryEnergySource?: string;
    interventionStatus?: string;
    capturedAt?: string;
    agentName?: string;
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

  const [entityType, setEntityType] = useState<EntityType>('farms');
  const [farmRequests, setFarmRequests] = useState<FarmDeleteRequest[]>([]);
  const [householdRequests, setHouseholdRequests] = useState<HouseholdDeleteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<RequestStatus>('PENDING');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Single action state
  const [actionTarget, setActionTarget] = useState<{ id: string; title: string; action: 'approve' | 'reject' } | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Batch action state
  const [batchAction, setBatchAction] = useState<'approve' | 'reject' | null>(null);
  const [batchNotes, setBatchNotes] = useState('');

  // Modals for details
  const [polygonView, setPolygonView] = useState<FarmDeleteRequest | null>(null);
  const [householdView, setHouseholdView] = useState<HouseholdDeleteRequest | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  const canManage = hasPermission(PERMISSIONS.REQUESTS_MANAGE);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = activeTab === 'all' ? 'all' : activeTab;
      const endpoint = entityType === 'farms'
        ? `/api/farms/delete-requests?status=${statusParam}&page=${page}&limit=50`
        : `/api/households/delete-requests?status=${statusParam}&page=${page}&limit=50`;

      const res = await fetch(endpoint);
      const data = await res.json();

      if (entityType === 'farms') {
        setFarmRequests(data.requests ?? []);
      } else {
        setHouseholdRequests(data.requests ?? []);
      }
      setPagination(data.pagination ?? { total: 0, pages: 1 });
    } catch {
      if (entityType === 'farms') setFarmRequests([]);
      else setHouseholdRequests([]);
    } finally {
      setLoading(false);
    }
  }, [entityType, activeTab, page]);

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

  // Reset selection when tab or entity changes
  useEffect(() => {
    setSelectedIds(new Set());
    setPage(1);
  }, [activeTab, entityType]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const currentRequestsList = entityType === 'farms' ? farmRequests : householdRequests;

  const toggleSelectAll = () => {
    const pendingIds = currentRequestsList.filter((r) => r.status === 'PENDING').map((r) => r.id);
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
      const endpoint = entityType === 'farms'
        ? `/api/farms/delete-requests/${actionTarget.id}`
        : `/api/households/delete-requests/${actionTarget.id}`;

      const res = await fetch(endpoint, {
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
      const endpoint = entityType === 'farms'
        ? '/api/farms/delete-requests/batch'
        : '/api/households/delete-requests/batch';

      const res = await fetch(endpoint, {
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

  const pendingCount = currentRequestsList.filter((r) => r.status === 'PENDING').length;
  const allPendingSelected =
    pendingCount > 0 && selectedIds.size === pendingCount;

  return (
    <div className="w-full mx-auto px-1 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deletion Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and approve or reject deletion requests across the system.
          </p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {pagination.total} total {entityType === 'farms' ? 'farm' : 'household'} request{pagination.total !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Entity Switcher & Filter tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        {/* Entity Switcher */}
        <div className="flex items-center gap-2">
          <Button
            variant={entityType === 'farms' ? 'default' : 'outline'}
            size="sm"
            className={entityType === 'farms' ? 'bg-[#013358] hover:bg-[#02426F] text-white' : 'text-gray-700'}
            onClick={() => setEntityType('farms')}
          >
            <Sprout className="mr-1.5 size-4" /> Farm Deletion Requests
          </Button>
          <Button
            variant={entityType === 'households' ? 'default' : 'outline'}
            size="sm"
            className={entityType === 'households' ? 'bg-[#013358] hover:bg-[#02426F] text-white' : 'text-gray-700'}
            onClick={() => setEntityType('households')}
          >
            <Home className="mr-1.5 size-4" /> Household Deletion Requests
          </Button>
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
      </div>

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

      {/* ── Farms Table ────────────────────────────────────────────── */}
      {entityType === 'farms' && (
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : farmRequests.length === 0 ? (
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
                    <TableHead>Farmer / Farm</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Crop & Size</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {farmRequests.map((req) => (
                    <TableRow key={req.id}>
                      {canManage && activeTab === 'PENDING' && (
                        <TableCell>
                          {req.status === 'PENDING' && (
                            <Checkbox
                              checked={selectedIds.has(req.id)}
                              onCheckedChange={() => toggleSelect(req.id)}
                              aria-label={`Select request for ${req.farmerName}`}
                            />
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <p className="font-medium text-gray-900">{req.farmerName}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          ID: {req.farmId ? req.farmId.slice(0, 8) + '…' : 'Deleted'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-gray-800">
                          {[req.farmSnapshot.farmWard, req.farmSnapshot.farmLocalGovernment].filter(Boolean).join(', ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {req.farmSnapshot.farmState}
                          {req.farmSnapshot.farmPollingUnit ? ` • PU: ${formatPollingUnit(req.farmSnapshot.farmPollingUnit)}` : ''}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {req.farmSnapshot.primaryCrop || 'Unknown crop'}
                        </Badge>
                        {req.farmSnapshot.farmSize && (
                          <p className="text-xs text-muted-foreground mt-0.5">{req.farmSnapshot.farmSize} ha</p>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm text-gray-700 truncate" title={req.reason}>
                          {req.reason}
                        </p>
                        {req.adminNotes && (
                          <p className="text-xs text-muted-foreground italic truncate mt-0.5" title={req.adminNotes}>
                            Note: {req.adminNotes}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-gray-800">
                          {req.requestedBy ? `${req.requestedBy.firstName} ${req.requestedBy.lastName}` : '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">{req.requestedBy?.email}</p>
                      </TableCell>
                      <TableCell>{statusBadge(req.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(req.createdAt), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {req.farmSnapshot.farmPolygon && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => setPolygonView(req)}
                              title="View Farm Boundary"
                            >
                              <MapPin className="h-4 w-4" />
                            </Button>
                          )}
                          {req.status === 'PENDING' && canManage && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => {
                                  setActionTarget({ id: req.id, title: `Farm of ${req.farmerName}`, action: 'approve' });
                                  setActionNotes('');
                                }}
                                title="Approve & Delete"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  setActionTarget({ id: req.id, title: `Farm of ${req.farmerName}`, action: 'reject' });
                                  setActionNotes('');
                                }}
                                title="Reject Request"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Households Table ──────────────────────────────────────── */}
      {entityType === 'households' && (
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : householdRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <Trash2 className="h-10 w-10 mb-3 text-gray-300" />
                <p className="font-medium text-gray-700">No requests found</p>
                <p className="text-sm mt-1">No household delete requests match this filter.</p>
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
                    <TableHead>Household Code & Leader</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Residents & PUE</TableHead>
                    <TableHead>Reason for Deletion</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {householdRequests.map((req) => (
                    <TableRow key={req.id}>
                      {canManage && activeTab === 'PENDING' && (
                        <TableCell>
                          {req.status === 'PENDING' && (
                            <Checkbox
                              checked={selectedIds.has(req.id)}
                              onCheckedChange={() => toggleSelect(req.id)}
                              aria-label={`Select request for ${req.headFullName}`}
                            />
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <p className="font-medium text-gray-900">{req.headFullName}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {req.houseNumber} • {req.headPhone}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-gray-800">
                          {[req.householdSnapshot.ward, req.householdSnapshot.lga].filter(Boolean).join(', ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {req.householdSnapshot.state} • PU: {formatPollingUnit(req.householdSnapshot.pollingUnit)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-semibold">
                          {req.householdSnapshot.totalHouseholdMembers || 1} Members
                        </Badge>
                        {req.householdSnapshot.hasPUE && (
                          <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 ml-1.5">
                            PUE: {req.householdSnapshot.pueType || 'Active'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm text-gray-700 truncate" title={req.reason}>
                          {req.reason}
                        </p>
                        {req.adminNotes && (
                          <p className="text-xs text-muted-foreground italic truncate mt-0.5" title={req.adminNotes}>
                            Note: {req.adminNotes}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-gray-800">
                          {req.requestedBy ? `${req.requestedBy.firstName} ${req.requestedBy.lastName}` : '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">{req.requestedBy?.email}</p>
                      </TableCell>
                      <TableCell>{statusBadge(req.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(req.createdAt), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-[#013358] hover:text-[#02426F] hover:bg-[#F3F8FC]"
                            onClick={() => setHouseholdView(req)}
                            title="View Household Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {req.status === 'PENDING' && canManage && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => {
                                  setActionTarget({ id: req.id, title: `Household ${req.houseNumber} (${req.headFullName})`, action: 'approve' });
                                  setActionNotes('');
                                }}
                                title="Approve & Delete Household"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  setActionTarget({ id: req.id, title: `Household ${req.houseNumber} (${req.headFullName})`, action: 'reject' });
                                  setActionNotes('');
                                }}
                                title="Reject Request"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
          <span>
            Page {page} of {pagination.pages} ({pagination.total} total)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.pages}
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* ── Single action confirm dialog ──────────────────────── */}
      <AlertDialog open={!!actionTarget} onOpenChange={(open) => { if (!open) setActionTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionTarget?.action === 'approve'
                ? `Approve Deletion for ${actionTarget.title}?`
                : `Reject Deletion for ${actionTarget?.title}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionTarget?.action === 'approve'
                ? `This will permanently delete this record from the database. This action cannot be undone.`
                : 'The deletion request will be rejected and the record will remain active.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 pb-2 space-y-2">
            <Label className="text-sm font-medium">Notes (optional)</Label>
            <Textarea
              placeholder="Add review notes…"
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
              className={actionTarget?.action === 'approve' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
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
                ? `This will permanently delete ${selectedIds.size} record(s). This cannot be undone.`
                : `${selectedIds.size} request(s) will be rejected and the records will be kept.`}
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
              className={batchAction === 'approve' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
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

      {/* ── Farm Polygon view dialog ─────────────────────────── */}
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
                    const req = polygonView!;
                    setPolygonView(null);
                    setActionTarget({ id: req.id, title: `Farm of ${req.farmerName}`, action: 'approve' });
                    setActionNotes('');
                  }}
                >
                  <CheckCircle className="mr-1.5 h-4 w-4" /> Approve & Delete
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    const req = polygonView!;
                    setPolygonView(null);
                    setActionTarget({ id: req.id, title: `Farm of ${req.farmerName}`, action: 'reject' });
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

      {/* ── Household Snapshot Details Dialog ─────────────────── */}
      <Dialog open={!!householdView} onOpenChange={(open) => { if (!open) setHouseholdView(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Household Deletion Request Snapshot</DialogTitle>
            <DialogDescription>
              {householdView?.houseNumber} — {householdView?.headFullName}
            </DialogDescription>
          </DialogHeader>

          {householdView && (
            <div className="space-y-4 text-sm">
              {/* Snapshot Identity */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                    {householdView.headFullName}
                  </span>
                  <Badge variant="outline">{householdView.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
                  <div>
                    <span className="font-medium text-gray-700">Phone:</span> {householdView.headPhone}
                    {householdView.householdSnapshot.headPhoneVerified ? ' (Validated)' : ' (Not Validated)'}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">NIN:</span> {householdView.householdSnapshot.headNin || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Gender:</span> {householdView.householdSnapshot.headGender || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Intervention:</span> {householdView.householdSnapshot.interventionStatus || 'Captured'}
                  </div>
                </div>
              </div>

              {/* Location & Polling Unit */}
              <div className="p-3 border rounded-lg space-y-1">
                <span className="text-xs uppercase font-semibold text-muted-foreground">Location & Boundary</span>
                <p className="text-gray-800">
                  {householdView.householdSnapshot.ward}, {householdView.householdSnapshot.lga}, {householdView.householdSnapshot.state}
                </p>
                <p className="text-xs text-muted-foreground">
                  Polling Unit: <strong className="text-gray-700">{formatPollingUnit(householdView.householdSnapshot.pollingUnit)}</strong>
                </p>
                {householdView.householdSnapshot.address && (
                  <p className="text-xs text-muted-foreground">
                    Address: {householdView.householdSnapshot.address}
                  </p>
                )}
                {householdView.householdSnapshot.gpsAddress && (
                  <p className="text-xs text-muted-foreground">
                    GPS Address: {householdView.householdSnapshot.gpsAddress}
                  </p>
                )}
                {householdView.householdSnapshot.latitude && householdView.householdSnapshot.longitude && (
                  <p className="text-xs font-mono text-blue-600">
                    GPS: {householdView.householdSnapshot.latitude.toFixed(6)}, {householdView.householdSnapshot.longitude.toFixed(6)}
                  </p>
                )}
              </div>

              {/* Members & Energy */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border rounded-lg space-y-1">
                  <span className="text-xs uppercase font-semibold text-muted-foreground">Family Breakdown</span>
                  <p className="text-lg font-bold text-gray-900">
                    {householdView.householdSnapshot.totalHouseholdMembers || 1} Residents
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {householdView.householdSnapshot.wivesCount || 0} Spouses • {householdView.householdSnapshot.childrenCount || 0} Children • {householdView.householdSnapshot.otherDependentsCount || 0} Dependents
                  </p>
                </div>
                <div className="p-3 border rounded-lg space-y-1">
                  <span className="text-xs uppercase font-semibold text-muted-foreground">Energy & Connectivity</span>
                  <p className="text-sm font-semibold text-gray-900">
                    {householdView.householdSnapshot.hasPUE ? `PUE Active (${householdView.householdSnapshot.pueType})` : 'Standard Household'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Power: {householdView.householdSnapshot.primaryEnergySource || 'N/A'} • Telcos: {(householdView.householdSnapshot.telcoProviders || []).join(', ') || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Photos Preview */}
              {(householdView.householdSnapshot.houseFrontPhotoUrl || householdView.householdSnapshot.headPhotoUrl) && (
                <div className="grid grid-cols-2 gap-3">
                  {householdView.householdSnapshot.houseFrontPhotoUrl && (
                    <div className="border rounded-lg p-2 text-center">
                      <span className="text-xs text-muted-foreground block mb-1">House Front</span>
                      <img
                        src={householdView.householdSnapshot.houseFrontPhotoUrl}
                        alt="House front"
                        className="h-28 w-full object-cover rounded"
                      />
                    </div>
                  )}
                  {householdView.householdSnapshot.headPhotoUrl && (
                    <div className="border rounded-lg p-2 text-center">
                      <span className="text-xs text-muted-foreground block mb-1">Household Leader</span>
                      <img
                        src={householdView.householdSnapshot.headPhotoUrl}
                        alt="Household head"
                        className="h-28 w-full object-cover rounded"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Deletion Reason & Audit */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg space-y-1">
                <span className="text-xs uppercase font-semibold text-amber-800 dark:text-amber-300">Reason for Request</span>
                <p className="text-sm text-amber-900 dark:text-amber-200 font-medium">
                  {householdView.reason}
                </p>
                <div className="flex justify-between items-center text-xs text-amber-700 dark:text-amber-400 pt-1 border-t border-amber-200/60">
                  <span>Requested by: {householdView.requestedBy ? `${householdView.requestedBy.firstName} ${householdView.requestedBy.lastName} (${householdView.requestedBy.email})` : '—'}</span>
                  <span>{format(new Date(householdView.createdAt), 'dd MMM yyyy, HH:mm')}</span>
                </div>
              </div>

              {householdView.adminNotes && (
                <div className="p-3 bg-gray-50 border rounded-lg text-xs space-y-1">
                  <span className="font-semibold text-gray-700">Administrator Review Notes:</span>
                  <p className="text-gray-800">{householdView.adminNotes}</p>
                  {householdView.reviewedBy && (
                    <p className="text-muted-foreground mt-0.5">
                      Reviewed by: {householdView.reviewedBy.firstName} {householdView.reviewedBy.lastName}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setHouseholdView(null)}>Close</Button>
            {householdView?.status === 'PENDING' && canManage && (
              <>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    const req = householdView!;
                    setHouseholdView(null);
                    setActionTarget({ id: req.id, title: `Household ${req.houseNumber} (${req.headFullName})`, action: 'approve' });
                    setActionNotes('');
                  }}
                >
                  <CheckCircle className="mr-1.5 h-4 w-4" /> Approve & Delete
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    const req = householdView!;
                    setHouseholdView(null);
                    setActionTarget({ id: req.id, title: `Household ${req.houseNumber} (${req.headFullName})`, action: 'reject' });
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

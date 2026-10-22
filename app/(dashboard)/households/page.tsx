'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePermissions } from '@/components/PermissionProvider';
import { PERMISSIONS } from '@/lib/permissions';

// UI components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { formatPollingUnit } from '@/lib/textUtils';

// Icons
import {
  HomeIcon,
  UserGroupIcon,
  BoltIcon,
  SignalIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  BuildingOffice2Icon,
  ArrowPathIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

export default function HouseholdsDirectoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  const [households, setHouseholds] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    totalHouseholds: 0,
    totalMembers: 0,
    totalChildren: 0,
    totalCommercialCustomers: 0,
    pueAdopters: 0,
  });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [telcoFilter, setTelcoFilter] = useState('all');
  const [pueFilter, setPueFilter] = useState('all');
  const [networkFilter, setNetworkFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Deletion request state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [targetHousehold, setTargetHousehold] = useState<any | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  const handleDeleteRequest = async () => {
    if (!targetHousehold || !deleteReason.trim()) return;
    setIsSubmittingDelete(true);
    try {
      const res = await fetch('/api/households/delete-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId: targetHousehold.id,
          reason: deleteReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit delete request');
      }
      setDeleteDialogOpen(false);
      setTargetHousehold(null);
      setDeleteReason('');
      alert('Deletion request submitted successfully. It will be reviewed by an administrator.');
    } catch (err: any) {
      alert(err.message || 'Failed to submit delete request');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  const fetchHouseholds = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (search.trim()) params.append('search', search.trim());
      if (telcoFilter !== 'all') params.append('telco', telcoFilter);
      if (pueFilter === 'yes') params.append('hasPue', 'true');
      if (pueFilter === 'no') params.append('hasPue', 'false');
      if (networkFilter !== 'all') params.append('network', networkFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`/api/households?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load households (HTTP ${res.status})`);
      }
      const data = await res.json();
      setHouseholds(data.households || []);
      setStats(data.stats || {});
      setTotalPages(data.pagination?.pages || 1);
      setTotalCount(data.pagination?.total || 0);
    } catch (err: any) {
      console.error('Error fetching households:', err);
      setErrorMessage(err.message || 'Failed to load households');
    } finally {
      setLoading(false);
    }
  }, [page, search, telcoFilter, pueFilter, networkFilter, statusFilter]);

  useEffect(() => {
    if (status === 'loading' || permissionsLoading) return;
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    const userRole = (session?.user as any)?.role?.toLowerCase();
    const isPrivileged = ['admin', 'super_admin', 'manager'].includes(userRole);
    if (
      !isPrivileged &&
      !hasPermission(PERMISSIONS.HOUSEHOLDS_READ) &&
      !hasPermission(PERMISSIONS.FARMERS_READ) &&
      !hasPermission(PERMISSIONS.DASHBOARD_ACCESS)
    ) {
      router.push('/dashboard');
      return;
    }
    fetchHouseholds();
  }, [status, permissionsLoading, fetchHouseholds]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchHouseholds();
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams({ export: 'csv' });
    if (search.trim()) params.append('search', search.trim());
    if (telcoFilter !== 'all') params.append('telco', telcoFilter);
    if (pueFilter === 'yes') params.append('hasPue', 'true');
    if (pueFilter === 'no') params.append('hasPue', 'false');
    if (networkFilter !== 'all') params.append('network', networkFilter);
    if (statusFilter !== 'all') params.append('status', statusFilter);

    window.open(`/api/households?${params.toString()}`, '_blank');
  };

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E293B] dark:text-gray-100">Household Interventions</h1>
          <p className="text-sm text-[#64748B] dark:text-gray-400 mt-1">
            Capture, trace, and manage individuals, households, connectivity, and productive use of energy.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchHouseholds}
            disabled={loading}
            className="gap-1.5 border-[#DCEAF3] text-[#013358] hover:bg-[#F3F8FC]"
          >
            <ArrowPathIcon className={`size-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="gap-1.5 border-[#DCEAF3] text-[#013358] hover:bg-[#F3F8FC]"
          >
            <ArrowDownTrayIcon className="size-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Notice:</span>
            <span>{errorMessage}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchHouseholds}
            className="border-red-300 text-red-800 hover:bg-red-100"
          >
            Retry
          </Button>
        </div>
      )}

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="border-[#DCEAF3] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wide text-[#475569] dark:text-gray-400">
              Households
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#F3F8FC] text-[#013358] dark:bg-gray-700 dark:text-blue-300">
              <HomeIcon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-[#1E293B] dark:text-gray-100">
              {stats.totalHouseholds?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">Total registered</p>
          </CardContent>
        </Card>

        <Card className="border-[#DCEAF3] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wide text-[#475569] dark:text-gray-400">
              Total People
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#F3F8FC] text-[#013358] dark:bg-gray-700 dark:text-blue-300">
              <UserGroupIcon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-[#1E293B] dark:text-gray-100">
              {stats.totalMembers?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">Household residents</p>
          </CardContent>
        </Card>

        <Card className="border-[#DCEAF3] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wide text-[#475569] dark:text-gray-400">
              Children
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#F3F8FC] text-[#013358] dark:bg-gray-700 dark:text-blue-300">
              <UserGroupIcon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-[#1E293B] dark:text-gray-100">
              {stats.totalChildren?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">Dependent youth</p>
          </CardContent>
        </Card>

        <Card className="border-[#DCEAF3] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wide text-[#475569] dark:text-gray-400">
              PUE Adopters
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#F3F8FC] text-[#013358] dark:bg-gray-700 dark:text-blue-300">
              <BoltIcon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-[#1E293B] dark:text-gray-100">
              {stats.pueAdopters?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">Productive energy</p>
          </CardContent>
        </Card>

        <Card className="border-[#DCEAF3] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md col-span-2 sm:col-span-1 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wide text-[#475569] dark:text-gray-400">
              Commercial Cust.
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#F3F8FC] text-[#013358] dark:bg-gray-700 dark:text-blue-300">
              <BuildingOffice2Icon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-[#1E293B] dark:text-gray-100">
              {stats.totalCommercialCustomers?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">Local businesses</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Filter Bar */}
      <Card className="border-[#DCEAF3] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        <CardContent className="pt-4 pb-4">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Search */}
            <div className="lg:col-span-2 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search House No, Leader, NIN, Phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            {/* Telco Filter */}
            <Select value={telcoFilter} onValueChange={(val) => { setTelcoFilter(val); setPage(1); }}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Telco Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Telcos</SelectItem>
                <SelectItem value="MTN">MTN</SelectItem>
                <SelectItem value="AIRTEL">Airtel</SelectItem>
                <SelectItem value="GLO">Glo</SelectItem>
                <SelectItem value="9MOBILE">9mobile</SelectItem>
              </SelectContent>
            </Select>

            {/* Network Filter */}
            <Select value={networkFilter} onValueChange={(val) => { setNetworkFilter(val); setPage(1); }}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Network Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Networks</SelectItem>
                <SelectItem value="5G">5G</SelectItem>
                <SelectItem value="4G">4G</SelectItem>
                <SelectItem value="3G">3G</SelectItem>
                <SelectItem value="2G">2G</SelectItem>
              </SelectContent>
            </Select>

            {/* PUE Filter */}
            <Select value={pueFilter} onValueChange={(val) => { setPueFilter(val); setPage(1); }}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Productive Power (PUE)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Households</SelectItem>
                <SelectItem value="yes">PUE Active (Yes)</SelectItem>
                <SelectItem value="no">Residential Only (No)</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Captured">Captured</SelectItem>
                <SelectItem value="Validated">Validated</SelectItem>
                <SelectItem value="InterventionApproved">Approved</SelectItem>
                <SelectItem value="Disbursed">Disbursed</SelectItem>
              </SelectContent>
            </Select>
          </form>
        </CardContent>
      </Card>

      {/* 4. Table */}
      <Card className="border-[#DCEAF3] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F8FAFC] dark:bg-gray-800/80 border-b border-[#DCEAF3] dark:border-gray-700">
                <TableHead className="w-[160px] font-semibold">House Number</TableHead>
                <TableHead className="font-semibold">House Leader & NIN</TableHead>
                <TableHead className="font-semibold">Location</TableHead>
                <TableHead className="font-semibold text-center">Dependents</TableHead>
                <TableHead className="font-semibold">Telco / Network</TableHead>
                <TableHead className="font-semibold">Commercial & PUE</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="text-right font-semibold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ArrowPathIcon className="size-5 animate-spin text-[#013358]" />
                      <span className="text-xs font-medium text-gray-600">Loading household records…</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : households.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <HomeIcon className="mx-auto size-10 text-gray-300 mb-2" />
                    <p className="text-sm font-medium text-gray-700">No households captured yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Household records captured from the mobile app will automatically appear here.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                households.map((h) => (
                  <TableRow key={h.id} className="hover:bg-slate-50/50">
                    {/* House Number */}
                    <TableCell className="font-mono text-xs font-semibold text-[#013358]">
                      <Link href={`/households/${h.id}`} className="hover:underline flex items-center gap-1.5">
                        <Badge variant="outline" className="font-mono bg-[#F3F8FC] text-[#013358] border-[#DCEAF3] hover:bg-[#E3EFF7]">
                          {h.houseNumber}
                        </Badge>
                      </Link>
                    </TableCell>
                    {/* House Leader */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border">
                          {h.headPhotoUrl ? (
                            <AvatarImage src={h.headPhotoUrl} alt="Face" />
                          ) : (
                            <AvatarFallback className="bg-slate-100 text-slate-700 text-xs font-bold">
                              {h.headFirstName?.[0]}{h.headLastName?.[0]}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm text-gray-900">
                            {h.headFirstName} {h.headLastName}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>{h.headPhone}</span>
                            {h.headPhoneVerified ? (
                              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 py-0 px-1">
                                Validated
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 py-0 px-1">
                                Not Validated
                              </Badge>
                            )}
                            {h.headNin && (
                              <span className="font-mono bg-slate-100 px-1 rounded text-[11px]">
                                NIN: {h.headNin}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Location */}
                    <TableCell>
                      <p className="text-sm text-gray-800 font-medium">{h.ward}, {h.lga}</p>
                      <p className="text-xs text-muted-foreground">{h.state} • PU: {formatPollingUnit(h.pollingUnit)}</p>
                    </TableCell>

                    {/* Dependents */}
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-semibold text-xs">
                        {h.totalHouseholdMembers || (1 + (h.wivesCount || 0) + (h.childrenCount || 0) + (h.otherDependentsCount || 0))} Members
                      </Badge>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {h.wivesCount || 0} W • {h.childrenCount || 0} Ch
                      </p>
                    </TableCell>

                    {/* Telco / Network */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1 items-center">
                        {(h.telcoProviders || []).length > 0 ? (
                          h.telcoProviders.map((t: string) => (
                            <span
                              key={t}
                              className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                t === 'MTN'
                                  ? 'bg-amber-100 text-amber-800'
                                  : t === 'AIRTEL'
                                  ? 'bg-red-100 text-red-800'
                                  : t === 'GLO'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-indigo-100 text-indigo-800'
                              }`}
                            >
                              {t}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400 italic">None</span>
                        )}
                        {h.networkType && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-slate-300">
                            {h.networkType}
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Commercial & PUE */}
                    <TableCell>
                      <div className="space-y-1">
                        {h.hasPUE ? (
                          <Badge className="bg-amber-500 text-white hover:bg-amber-600 text-[11px] gap-1">
                            <BoltIcon className="size-3" /> {h.pueType || 'PUE Active'}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Residential</span>
                        )}
                        {h.commercialCustomersCount > 0 && (
                          <p className="text-[11px] text-indigo-600 font-medium">
                            {h.commercialCustomersCount} comm. clients
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge
                        variant={
                          h.interventionStatus === 'Validated'
                            ? 'secondary'
                            : h.interventionStatus === 'InterventionApproved' || h.interventionStatus === 'Disbursed'
                            ? 'default'
                            : 'outline'
                        }
                        className="text-xs capitalize"
                      >
                        {h.interventionStatus}
                      </Badge>
                    </TableCell>

                    {/* Action */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-[#013358] hover:text-[#02426F] hover:bg-[#F3F8FC]">
                          <Link href={`/households/${h.id}`}>
                            <EyeIcon className="size-4 mr-1" /> View
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                          onClick={() => {
                            setTargetHousehold(h);
                            setDeleteReason('');
                            setDeleteDialogOpen(true);
                          }}
                          title="Request Deletion"
                        >
                          <TrashIcon className="size-4 mr-1" /> Request Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 5. Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
          <span>
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, totalCount)} of {totalCount} records
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
            <span className="text-xs font-semibold px-2">Page {page} of {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Request Deletion Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Household Deletion</DialogTitle>
            <DialogDescription>
              Submit a formal request to delete this household record. An administrator must approve this request before the record is permanently removed.
            </DialogDescription>
          </DialogHeader>
          {targetHousehold && (
            <div className="space-y-3 py-2 text-sm">
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border space-y-1">
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {targetHousehold.headFirstName} {targetHousehold.headLastName}
                </p>
                <p className="text-xs font-mono text-muted-foreground">
                  Code: {targetHousehold.houseNumber} • Phone: {targetHousehold.headPhone}
                </p>
                <p className="text-xs text-muted-foreground">
                  Location: {targetHousehold.ward}, {targetHousehold.lga}, {targetHousehold.state} (PU: {formatPollingUnit(targetHousehold.pollingUnit)})
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="del-reason" className="text-xs font-medium">
                  Reason for deletion <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="del-reason"
                  placeholder="Explain why this household should be deleted (e.g. duplicate record, data entry error, demolition)..."
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              disabled={isSubmittingDelete}
              onClick={() => {
                setDeleteDialogOpen(false);
                setTargetHousehold(null);
                setDeleteReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={isSubmittingDelete || !deleteReason.trim()}
              onClick={handleDeleteRequest}
            >
              {isSubmittingDelete ? 'Submitting…' : 'Submit Deletion Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


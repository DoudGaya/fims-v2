'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { usePermissions } from '@/components/PermissionProvider';
import { PERMISSIONS } from '@/lib/permissions';

// UI components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  ArrowLeftIcon,
  HomeIcon,
  UserGroupIcon,
  MapPinIcon,
  PhoneIcon,
  IdentificationIcon,
  SignalIcon,
  BoltIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  GlobeAltIcon,
  PhotoIcon,
  TrashIcon,
  DocumentTextIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';

export default function HouseholdDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  const [household, setHousehold] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Deletion request state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  const [deleteRequestSuccess, setDeleteRequestSuccess] = useState(false);

  const handleDeleteRequest = async () => {
    if (!id || !deleteReason.trim()) return;
    setIsSubmittingDelete(true);
    try {
      const res = await fetch('/api/households/delete-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId: id,
          reason: deleteReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit delete request');
      }
      setDeleteRequestSuccess(true);
      setDeleteDialogOpen(false);
      setDeleteReason('');
      alert('Household deletion request submitted successfully. It will be reviewed by an administrator.');
    } catch (err: any) {
      alert(err.message || 'Failed to submit delete request');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  const fetchHouseholdDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/households/${id}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load household details (HTTP ${res.status})`);
      }
      const data = await res.json();
      setHousehold(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Household not found');
    } finally {
      setLoading(false);
    }
  }, [id]);

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
    fetchHouseholdDetails();
  }, [status, permissionsLoading, fetchHouseholdDetails]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!household || newStatus === household.interventionStatus) return;
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/households/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interventionStatus: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      const updated = await res.json();
      setHousehold((prev: any) => ({ ...prev, interventionStatus: updated.interventionStatus }));
    } catch (e: any) {
      console.error('Status update failed:', e);
    } finally {
      setStatusUpdating(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="w-full space-y-6 animate-pulse p-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (error || !household) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-red-600 font-semibold">{error || 'Household not found'}</p>
        <Button variant="outline" asChild>
          <Link href="/households">Back to Households</Link>
        </Button>
      </div>
    );
  }

  // Parse synthesized house number code components
  const codeParts = household.houseNumber.split('-');

  return (
    <div className="w-full min-w-0 space-y-8 animate-in fade-in duration-300">
      {/* 1. Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="p-2">
            <Link href="/households">
              <ArrowLeftIcon className="size-5 text-gray-600" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono text-gray-900 tracking-tight">
                {household.houseNumber}
              </h1>
              <Badge
                variant={
                  household.interventionStatus === 'Validated'
                    ? 'secondary'
                    : household.interventionStatus === 'InterventionApproved' || household.interventionStatus === 'Disbursed'
                    ? 'default'
                    : 'outline'
                }
              >
                {household.interventionStatus}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {household.ward}, {household.lga}, {household.state} • Polling Unit: {formatPollingUnit(household.pollingUnit)}
            </p>
          </div>
        </div>

        {/* Status Switcher & Actions */}
        <div className="flex items-center gap-3">
          {hasPermission(PERMISSIONS.HOUSEHOLDS_UPDATE) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={statusUpdating} className="gap-2">
                  <span className="text-xs text-muted-foreground">Intervention Status:</span>
                  <Badge variant="outline" className="text-xs font-semibold">
                    {household.interventionStatus}
                  </Badge>
                  <ChevronDownIcon className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {['Captured', 'Validated', 'InterventionApproved', 'Disbursed'].map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => handleStatusUpdate(s)}
                    className={household.interventionStatus === s ? 'font-semibold text-blue-700 bg-blue-50' : ''}
                  >
                    {household.interventionStatus === s && '✓ '}{s}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            variant="default"
            size="sm"
            className="bg-[#013358] hover:bg-[#024474] text-white shadow-sm"
            onClick={() => window.open(`/api/households/${id}/document`, '_blank')}
          >
            <DocumentTextIcon className="mr-1.5 size-4" /> Official Dwelling Document
          </Button>

          <Button
            variant="outline"
            size="sm"
            asChild
            className="border-emerald-200 text-emerald-800 hover:bg-emerald-50"
          >
            <a
              href={`/verify-dwelling/${household.houseNumber}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <CheckCircleIcon className="mr-1.5 size-4 text-emerald-600" /> Verify Public URL
            </a>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="border-amber-300 text-amber-700 hover:bg-amber-50"
            disabled={deleteRequestSuccess}
            onClick={() => {
              setDeleteReason('');
              setDeleteDialogOpen(true);
            }}
          >
            <TrashIcon className="mr-1.5 size-4" /> Request Deletion
          </Button>

          <Button variant="outline" size="sm" asChild>
            <Link href="/households">
              <ArrowLeftIcon className="mr-1.5 size-4" /> Back to Directory
            </Link>
          </Button>
        </div>
      </div>

      <Separator />

      {/* 2. Visual Evidence & Biometrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* House Front Picture */}
        <Card className="border-[#DCEAF3] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-[#1E293B] dark:text-gray-100">
              <PhotoIcon className="size-5 text-[#013358] dark:text-blue-300" /> House Front Capture
            </CardTitle>
            <CardDescription>Verified photo of the house exterior & front entrance</CardDescription>
          </CardHeader>
          <CardContent>
            {household.houseFrontPhotoUrl ? (
              <div
                className="relative h-64 w-full rounded-lg overflow-hidden border bg-slate-100 cursor-pointer group"
                onClick={() => setSelectedPhoto(household.houseFrontPhotoUrl)}
              >
                <img
                  src={household.houseFrontPhotoUrl}
                  alt="House Front"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                  Click to Expand
                </div>
              </div>
            ) : (
              <div className="h-64 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
                <PhotoIcon className="size-12 mb-2 stroke-1" />
                <p className="text-sm font-medium">No House Photo Captured</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Head Biometric Face Photo */}
        <Card className="border-[#DCEAF3] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-[#1E293B] dark:text-gray-100">
              <IdentificationIcon className="size-5 text-[#013358] dark:text-blue-300" /> House Leader Biometric Capture
            </CardTitle>
            <CardDescription>Facial biometric image of head of household</CardDescription>
          </CardHeader>
          <CardContent>
            {household.headPhotoUrl ? (
              <div
                className="relative h-64 w-full rounded-lg overflow-hidden border bg-slate-100 cursor-pointer group flex items-center justify-center"
                onClick={() => setSelectedPhoto(household.headPhotoUrl)}
              >
                <img
                  src={household.headPhotoUrl}
                  alt="Head Face"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                  Click to Expand
                </div>
              </div>
            ) : (
              <div className="h-64 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
                <IdentificationIcon className="size-12 mb-2 stroke-1" />
                <p className="text-sm font-medium">No Biometric Photo Captured</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3. Detailed Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Head of Household Details */}
        <Card className="border-[#DCEAF3] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-[#1E293B] dark:text-gray-100">
              <IdentificationIcon className="size-5 text-[#013358] dark:text-blue-300" /> House Leader Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-muted-foreground uppercase font-medium">Full Name</dt>
                <dd className="text-sm font-semibold text-gray-900 mt-0.5">
                  {household.headFirstName} {household.headMiddleName ? `${household.headMiddleName} ` : ''}{household.headLastName}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase font-medium">NIN (Identity)</dt>
                <dd className="text-sm font-mono font-semibold text-gray-900 mt-0.5">
                  {household.headNin || <span className="text-gray-400 italic">Not set</span>}
                </dd>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-muted-foreground uppercase font-medium">Phone Number</dt>
                <dd className="text-sm font-medium text-gray-900 mt-0.5 flex items-center gap-1.5">
                  <PhoneIcon className="size-3.5 text-muted-foreground" /> {household.headPhone}
                  {household.headPhoneVerified ? (
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 py-0 px-1.5 ml-1">
                      Validated
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 py-0 px-1.5 ml-1">
                      Not Validated
                    </Badge>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase font-medium">Gender</dt>
                <dd className="text-sm font-medium text-gray-900 mt-0.5">{household.headGender}</dd>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-muted-foreground uppercase font-medium">Marital Status</dt>
                <dd className="text-sm font-medium text-gray-900 mt-0.5">{household.headMaritalStatus || 'Married'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase font-medium">Date of Birth</dt>
                <dd className="text-sm font-medium text-gray-900 mt-0.5">
                  {household.headDateOfBirth ? new Date(household.headDateOfBirth).toLocaleDateString() : 'Not set'}
                </dd>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location & Traceability */}
        <Card className="border-[#DCEAF3] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-[#1E293B] dark:text-gray-100">
              <MapPinIcon className="size-5 text-[#013358] dark:text-blue-300" /> Location & Traceability
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Synthetic Code Breakdown */}
            <div className="p-3 bg-[#F8FAFC] dark:bg-gray-800/80 border border-[#DCEAF3] dark:border-gray-700 rounded-lg space-y-1.5">
              <p className="text-xs font-semibold text-[#475569] dark:text-gray-400 uppercase tracking-wider">
                Synthesized Traceability Identifier
              </p>
              <p className="font-mono text-sm font-bold text-[#013358] dark:text-blue-300">{household.houseNumber}</p>
              <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground pt-1">
                <span className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-[#DCEAF3] dark:border-gray-700">State: {household.state}</span>
                <span className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-[#DCEAF3] dark:border-gray-700">LGA: {household.lga}</span>
                <span className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-[#DCEAF3] dark:border-gray-700">Ward: {household.ward}</span>
                <span className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-[#DCEAF3] dark:border-gray-700">PU: {formatPollingUnit(household.pollingUnit)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-muted-foreground uppercase font-medium">Coordinates</dt>
                <dd className="text-sm font-mono text-gray-900 mt-0.5">
                  {household.latitude && household.longitude ? (
                    <a
                      href={`https://www.google.com/maps?q=${household.latitude},${household.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#013358] hover:underline flex items-center gap-1 font-semibold"
                    >
                      <GlobeAltIcon className="size-4" />
                      {household.latitude.toFixed(5)}, {household.longitude.toFixed(5)}
                    </a>
                  ) : (
                    <span className="text-gray-400 italic">Not captured</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase font-medium">GPS Accuracy</dt>
                <dd className="text-sm font-medium text-gray-900 mt-0.5">
                  {household.accuracy ? `± ${household.accuracy.toFixed(1)} meters` : 'Standard'}
                </dd>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dependents & Family Composition */}
        <Card className="border-[#DCEAF3] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-[#1E293B] dark:text-gray-100">
              <UserGroupIcon className="size-5 text-[#013358] dark:text-blue-300" /> Dependents & Household Composition
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-[#F8FAFC] dark:bg-gray-800/80 rounded-lg text-center border border-[#DCEAF3] dark:border-gray-700">
                <p className="text-xs text-[#475569] dark:text-gray-400 font-semibold uppercase">Wives</p>
                <p className="text-xl font-bold text-[#1E293B] dark:text-gray-100 mt-1">{household.wivesCount || 0}</p>
              </div>
              <div className="p-3 bg-[#F8FAFC] dark:bg-gray-800/80 rounded-lg text-center border border-[#DCEAF3] dark:border-gray-700">
                <p className="text-xs text-[#475569] dark:text-gray-400 font-semibold uppercase">Children</p>
                <p className="text-xl font-bold text-[#1E293B] dark:text-gray-100 mt-1">{household.childrenCount || 0}</p>
              </div>
              <div className="p-3 bg-[#F8FAFC] dark:bg-gray-800/80 rounded-lg text-center border border-[#DCEAF3] dark:border-gray-700">
                <p className="text-xs text-[#475569] dark:text-gray-400 font-semibold uppercase">Other Dep.</p>
                <p className="text-xl font-bold text-[#1E293B] dark:text-gray-100 mt-1">{household.otherDependentsCount || 0}</p>
              </div>
            </div>

            <div className="p-3 bg-[#F8FAFC] dark:bg-gray-800/80 border border-[#DCEAF3] dark:border-gray-700 rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Household Size</span>
              <Badge variant="secondary" className="text-sm font-bold bg-[#F3F8FC] text-[#013358] border-[#DCEAF3]">
                {household.totalHouseholdMembers || (1 + (household.wivesCount || 0) + (household.childrenCount || 0) + (household.otherDependentsCount || 0))} Persons
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Telco & Productive Use of Power (PUE) */}
        <Card className="border-[#DCEAF3] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-[#1E293B] dark:text-gray-100">
              <BoltIcon className="size-5 text-[#013358] dark:text-blue-300" /> Connectivity & Productive Energy (PUE)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Telco */}
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-medium mb-1.5">Telco Providers</dt>
              <div className="flex flex-wrap gap-1.5 items-center">
                {(household.telcoProviders || []).length > 0 ? (
                  household.telcoProviders.map((t: string) => (
                    <span
                      key={t}
                      className={`text-xs px-2.5 py-1 rounded-md font-bold ${
                        t === 'MTN'
                          ? 'bg-amber-100 text-amber-900'
                          : t === 'AIRTEL'
                          ? 'bg-red-100 text-red-900'
                          : t === 'GLO'
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-indigo-100 text-indigo-900'
                      }`}
                    >
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-400 italic">No network providers reported</span>
                )}
                {household.networkType && (
                  <Badge variant="outline" className="text-xs font-semibold">
                    {household.networkType} Coverage
                  </Badge>
                )}
              </div>
            </div>

            {/* Commercial customers */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <dt className="text-xs text-muted-foreground uppercase font-medium">Commercial Customers</dt>
                <dd className="text-sm font-bold text-indigo-700 mt-0.5">
                  {household.commercialCustomersCount || 0} Clients
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase font-medium">Primary Energy</dt>
                <dd className="text-sm font-semibold text-gray-900 mt-0.5">
                  {household.primaryEnergySource || 'None / Off-grid'}
                </dd>
              </div>
            </div>

            {/* PUE Details */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 uppercase">Productive Use of Power</span>
                <Badge className={household.hasPUE ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-700'}>
                  {household.hasPUE ? 'PUE Active' : 'Residential Only'}
                </Badge>
              </div>
              {household.hasPUE && (
                <>
                  <p className="text-sm font-semibold text-amber-950 mt-1">
                    Activity: {household.pueType || 'Unspecified machinery'}
                  </p>
                  {(household.pueEquipment || []).length > 0 && (
                    <p className="text-xs text-amber-900">
                      Equipment: {household.pueEquipment.join(', ')}
                    </p>
                  )}
                  {household.pueDailyHours && (
                    <p className="text-xs text-amber-800">
                      Average Daily Operating Hours: {household.pueDailyHours} hrs/day
                    </p>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Agent & Attribution Card */}
      <Card className="border-[#DCEAF3] dark:border-gray-700 bg-[#F8FAFC] dark:bg-gray-800/50 shadow-sm">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="size-4 text-emerald-600" />
              <span>
                Captured by Agent:{' '}
                <strong className="text-gray-900">
                  {household.agent ? `${household.agent.firstName} ${household.agent.lastName}` : household.agentId || 'Field Agent'}
                </strong>
              </span>
            </div>
            <div>
              <span>Captured on: {new Date(household.createdAt).toLocaleString()}</span>
              {household.syncedAt && (
                <span className="ml-3 text-slate-500">
                  Synced: {new Date(household.syncedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-white rounded-lg overflow-hidden shadow-2xl">
            <img src={selectedPhoto} alt="Full view" className="max-w-full max-h-[85vh] object-contain" />
            <button
              className="absolute top-3 right-3 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/90"
              onClick={() => setSelectedPhoto(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Request Deletion Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Household Deletion</DialogTitle>
            <DialogDescription>
              This will submit a deletion request for review. An administrator must approve it before the household is permanently removed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border space-y-1">
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {household.headFirstName} {household.headLastName}
              </p>
              <p className="text-xs font-mono text-muted-foreground">
                Code: {household.houseNumber} • Phone: {household.headPhone}
              </p>
              <p className="text-xs text-muted-foreground">
                Location: {household.ward}, {household.lga}, {household.state} (PU: {formatPollingUnit(household.pollingUnit)})
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="del-reason" className="text-xs font-medium">
                Reason for deletion <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="del-reason"
                placeholder="Describe why this household record should be deleted..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              disabled={isSubmittingDelete}
              onClick={() => {
                setDeleteDialogOpen(false);
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

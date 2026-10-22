'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ZoraAccessButton } from '@/components/ZoraAccessButton';
import { useRouter, useParams } from 'next/navigation';
import { usePermissions } from '@/components/PermissionProvider';
import { PERMISSIONS } from '@/lib/permissions';
import Link from 'next/link';
import * as React from 'react';
import { SendMessageDialog } from '@/components/communications/SendMessageDialog';
import { AnalysisModal } from '@/components/analysis/AnalysisModal';

// Heroicons
import {
  ArrowLeftIcon,
  PencilIcon,
  PhoneIcon,
  MapPinIcon,
  DocumentTextIcon,
  BriefcaseIcon,
  GlobeAltIcon,
  BanknotesIcon,
  UserGroupIcon,
  BuildingLibraryIcon,
  CalendarIcon,
  IdentificationIcon,
  MapIcon
} from '@heroicons/react/24/outline';

// Shadcn UI
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import dynamic from 'next/dynamic';
import { 
  ChevronDownIcon, 
  Trash2Icon, 
  Eye, 
  Download, 
  ExternalLink, 
  Check, 
  Copy, 
  ShieldCheck, 
  Award, 
  RotateCcw,
  Sparkles
} from 'lucide-react';

const FarmPolygonMapLibre = dynamic(() => import('@/components/maps/FarmPolygonMapLibre'), { ssr: false });

export default function FarmerDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const id = params?.id as string;

  const [farmer, setFarmer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editSection, setEditSection] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  // Status update state
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Farm delete request state
  const [deleteRequestFarm, setDeleteRequestFarm] = useState<any | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deletingRequest, setDeletingRequest] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);

  // Certificate generation & preview state
  const [generatingCert, setGeneratingCert] = useState(false);
  const [certSuccessMsg, setCertSuccessMsg] = useState<string | null>(null);
  const [certError, setCertError] = useState<string | null>(null);
  const [certPreviewOpen, setCertPreviewOpen] = useState(false);
  const [certPreviewLoading, setCertPreviewLoading] = useState(false);
  const [certBlobUrl, setCertBlobUrl] = useState<string>('');
  const [copiedCertId, setCopiedCertId] = useState<string | null>(null);

  const handlePreviewCertificate = async () => {
    if (!farmer?.id) return;
    setCertPreviewOpen(true);
    setCertPreviewLoading(true);
    setCertError(null);
    try {
      const res = await fetch(`/api/certificates/preview?farmerId=${farmer.id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.details || 'Failed to generate preview');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      setCertBlobUrl(url);
    } catch (e: any) {
      console.error('Certificate preview failed:', e);
      setCertError(e.message || 'Failed to load certificate preview');
    } finally {
      setCertPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    setCertPreviewOpen(false);
    if (certBlobUrl) {
      window.URL.revokeObjectURL(certBlobUrl);
      setCertBlobUrl('');
    }
  };

  const handleCopyCertId = (certId: string) => {
    navigator.clipboard.writeText(certId);
    setCopiedCertId(certId);
    setTimeout(() => setCopiedCertId(null), 2500);
  };

  const handleGenerateCertificate = async () => {
    if (!farmer?.id) return;
    setGeneratingCert(true);
    setCertError(null);
    try {
      const res = await fetch('/api/certificates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmerId: farmer.id })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.details || 'Failed to generate certificate');
      }

      // Download the returned PDF
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CCSA-Certificate-${farmer.firstName || 'Farmer'}-${farmer.lastName || ''}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setCertSuccessMsg('Certificate generated and downloaded successfully!');
      setTimeout(() => setCertSuccessMsg(null), 5000);

      // Refresh farmer to populate the new certificate in the list
      await fetchFarmerDetails();
    } catch (e: any) {
      console.error('Certificate generation failed:', e);
      setCertError(e.message || 'Certificate generation failed');
    } finally {
      setGeneratingCert(false);
    }
  };

  useEffect(() => {
    if (status === 'loading' || permissionsLoading) return;
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      if (!hasPermission(PERMISSIONS.FARMERS_READ)) {
        router.push('/dashboard');
      } else if (id) {
        fetchFarmerDetails();
      }
    }
  }, [status, permissionsLoading, router, hasPermission, id]);

  const fetchFarmerDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/farmers/${id}`);
      if (!res.ok) throw new Error('Failed to fetch farmer details');
      const data = await res.json();
      setFarmer(data);
    } catch (error: any) {
      console.error('Error fetching farmer:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (section: string) => {
    setEditSection(section);
    // Initialize form data based on section
    setFormData({ ...farmer });
    setIsEditOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/farmers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizeFarmerPayload(formData))
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Update failed server-side:", errorData);
        throw new Error(errorData.error || errorData.details || 'Failed to update farmer');
      }

      const updatedFarmer = await res.json();
      setFarmer((prev: any) => ({ ...prev, ...updatedFarmer })); // Merge updates
      setIsEditOpen(false);
      setEditSection(null);
    } catch (error) {
      console.error("Update failed", error);
      // Show toast (not implemented yet)
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!farmer || newStatus === farmer.status) return;
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/farmers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update status');
      }
      const updated = await res.json();
      setFarmer((prev: any) => ({ ...prev, status: updated.status ?? newStatus }));
    } catch (e: any) {
      console.error('Status update failed', e);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleSubmitDeleteRequest = async () => {
    if (!deleteRequestFarm || !deleteReason.trim()) return;
    setDeletingRequest(true);
    try {
      const res = await fetch('/api/farms/delete-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmId: deleteRequestFarm.id, reason: deleteReason.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to submit delete request');
      }
      setDeleteSuccessMsg(`Deletion request submitted for ${deleteRequestFarm.primaryCrop || 'farm'}.`);
      setDeleteRequestFarm(null);
      setDeleteReason('');
    } catch (e: any) {
      console.error(e);
    } finally {
      setDeletingRequest(false);
    }
  };

  const getTotalFarmArea = () => {
    if (!farmer?.farms) return 0;
    return farmer.farms.reduce((acc: number, farm: any) => acc + (farm.farmSize || 0), 0).toFixed(1);
  };

  if (status === 'loading' || loading) {
    return <FarmerSkeleton />;
  }

  if (error || !farmer) {
    return <ErrorState error={error} />;
  }

  return (
    <div className=" w-full mx-auto px-1 space-y-8 animate-in fade-in duration-500">

      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border-2 border-white shadow-md">
            <AvatarFallback className="bg-blue-600 text-white text-2xl font-bold">
              {farmer.firstName[0]}{farmer.lastName[0]}
            </AvatarFallback>
            {farmer.photoUrl && <AvatarImage src={farmer.photoUrl} alt="Profile" />}
          </Avatar>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{farmer.firstName} {farmer.lastName}</h1>
              <Badge variant={farmer.status === 'Verified' ? 'secondary' : farmer.status === 'Rejected' ? 'destructive' : 'outline'}>
                {farmer.status}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-4 mt-2">
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <BriefcaseIcon className="size-4" /> {farmer.employmentStatus || 'Farmer'}
              </p>
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <MapPinIcon className="size-4" /> {farmer.lga}, {farmer.state}
              </p>
              <Badge variant="secondary" className="text-xs">
                {farmer.farms?.length || 0} Farms
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {getTotalFarmArea()} Ha Total
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ZoraAccessButton type="farmer" id={farmer.id} />
          <Button variant="outline" asChild>
            <Link href="/farmers"><ArrowLeftIcon className="mr-2 size-4" /> Back</Link>
          </Button>
          {hasPermission(PERMISSIONS.COMMUNICATIONS_SEND) && farmer && (
            <SendMessageDialog
              recipientType="farmer"
              recipientId={farmer.id}
              recipientName={`${farmer.firstName} ${farmer.lastName}`}
              recipientEmail={farmer.email}
              recipientPhone={farmer.phone}
            />
          )}
          {/* Global Edit or Actions could go here */}
        </div>
      </div>

      <Separator />

      {/* Delete request success banner */}
      {deleteSuccessMsg && (
        <div className="flex items-center justify-between gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <span>✓ {deleteSuccessMsg}</span>
          <button className="text-xs underline" onClick={() => setDeleteSuccessMsg(null)}>Dismiss</button>
        </div>
      )}

      {/* 2. Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <TabsList className="bg-slate-100 p-1 rounded-lg">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="farms">Farms & Crops</TabsTrigger>
            <TabsTrigger value="financials">Financials & Documents</TabsTrigger>
          </TabsList>

          {/* Status switcher — only visible when user can update farmers */}
          {hasPermission(PERMISSIONS.FARMERS_UPDATE) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={statusUpdating} className="gap-2 self-start sm:self-auto">
                  {statusUpdating ? 'Updating…' : (
                    <>
                      <span className="text-xs text-muted-foreground">Status:</span>
                      <Badge variant={farmer.status === 'Verified' ? 'secondary' : farmer.status === 'Rejected' ? 'destructive' : 'outline'} className="text-xs">
                        {farmer.status}
                      </Badge>
                      <ChevronDownIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {['Enrolled', 'FarmCaptured', 'Validated', 'Verified'].map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => handleStatusUpdate(s)}
                    className={farmer.status === s ? 'font-semibold text-blue-700 bg-blue-50' : ''}
                  >
                    {farmer.status === s && '✓ '}{s}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleStatusUpdate('Rejected')}
                  className={`text-red-600 ${farmer.status === 'Rejected' ? 'font-semibold bg-red-50' : ''}`}
                >
                  {farmer.status === 'Rejected' && '✓ '}Rejected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Basic Details Section */}
            <Section
              title="Basic Details"
              onEdit={() => handleEditClick('basic')}
              hasPermission={hasPermission(PERMISSIONS.FARMERS_UPDATE)}
            >
              <DetailRow label="Full Name" value={`${farmer.firstName} ${farmer.middleName || ''} ${farmer.lastName}`} />
              <DetailRow label="Phone Number" value={farmer.phone} />
              <DetailRow label="Email Address" value={farmer.email} />
              <DetailRow label="Date of Birth" value={farmer.dateOfBirth ? new Date(farmer.dateOfBirth).toLocaleDateString() : null} />
              <DetailRow label="Gender" value={farmer.gender} />
              <DetailRow label="Marital Status" value={farmer.maritalStatus} />
              <DetailRow label="Residential Address" value={farmer.address} fullWidth />
            </Section>

            {/* Location & Cluster Section */}
            <Section
              title="Location & Cluster"
              onEdit={() => handleEditClick('location')}
              hasPermission={hasPermission(PERMISSIONS.FARMERS_UPDATE)}
            >
              <DetailRow label="State" value={farmer.state} />
              <DetailRow label="LGA" value={farmer.lga} />
              <DetailRow label="Ward" value={farmer.ward} />
              <DetailRow label="Polling Unit" value={farmer.pollingUnit} />
              <DetailRow label="Cluster Title" value={farmer.cluster?.title} />
              <DetailRow label="Cluster Lead" value={farmer.cluster?.clusterLeadFirstName ? `${farmer.cluster?.clusterLeadFirstName} ${farmer.cluster?.clusterLeadLastName}` : null} />
            </Section>

            {/* Farming Profile Section */}
            <Section
              title="Farming Profile"
              onEdit={() => handleEditClick('farming')}
              hasPermission={hasPermission(PERMISSIONS.FARMERS_UPDATE)}
            >
              <DetailRow label="Farmer ID" value={farmer.id} />
              <DetailRow label="NIN" value={farmer.nin} />
              <DetailRow 
                label="Primary Crop" 
                value={
                  farmer.primaryCrop || 
                  farmer.farms?.[0]?.primaryCrop || 
                  (farmer.farms?.length ? farmer.farms.map((f: any) => f.primaryCrop).filter(Boolean).join(', ') : null)
                } 
              />
              <DetailRow 
                label="Total Farm Size" 
                value={
                  farmer.farmSize 
                    ? `${farmer.farmSize} Ha` 
                    : (Number(getTotalFarmArea()) > 0 ? `${getTotalFarmArea()} Ha` : null)
                } 
              />
              <DetailRow 
                label="Experience" 
                value={
                  farmer.farmingExperience 
                    ? `${farmer.farmingExperience} Years` 
                    : (farmer.farms?.[0]?.farmingExperience ? `${farmer.farms[0].farmingExperience} Years` : null)
                } 
              />
              <DetailRow 
                label="Registration Date" 
                value={farmer.createdAt || farmer.registrationDate ? new Date(farmer.createdAt || farmer.registrationDate).toLocaleDateString() : null} 
              />
              <DetailRow 
                label="Agent/Enroller" 
                value={farmer.agent ? `${farmer.agent.firstName || ''} ${farmer.agent.lastName || ''}`.trim() : (farmer.agentId || 'N/A')} 
              />
            </Section>

          </div>
        </TabsContent>

        <TabsContent value="farms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Registered Farms</CardTitle>
              <CardDescription>Detailed information about land holdings and crop production.</CardDescription>
            </CardHeader>
            <CardContent>
              {farmer.farms && farmer.farms.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {farmer.farms.map((farm: any, index: number) => (
                    <AccordionItem key={farm.id} value={farm.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-4 text-left">
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-700">
                            <MapIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{farm.primaryCrop || 'Farm'} - {farm.farmSize || 0} Ha</p>
                            <p className="text-xs text-gray-500">{farm.farmState}, {farm.farmLocalGovernment}</p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="flex items-center justify-between py-2">
                          <AnalysisModal farmId={farm.id} farmName={`${farm.primaryCrop || 'Farm'} (${farm.farmSize || 0} ha)`} />
                          {hasPermission(PERMISSIONS.FARMS_DELETE) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-amber-300 text-amber-700 hover:bg-amber-50 gap-1.5"
                              onClick={() => { setDeleteRequestFarm(farm); setDeleteReason(''); }}
                            >
                              <Trash2Icon className="h-3.5 w-3.5" /> Request Deletion
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                          {/* 1. General Info */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-gray-900 border-b pb-1">General Info</h4>
                            <div className="grid grid-cols-2 gap-2">
                              <DetailRow label="Ownership" value={farm.farmOwnership} />
                              <DetailRow label="Season" value={farm.farmingSeason} />
                              <DetailRow label="Experience" value={farm.farmingExperience ? `${farm.farmingExperience} Yrs` : null} />
                              <DetailRow label="Year Established" value={farm.year} />
                            </div>
                          </div>

                          {/* 2. Location Details */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-gray-900 border-b pb-1">Location Details</h4>
                            <div className="grid grid-cols-2 gap-2">
                              <DetailRow label="State" value={farm.farmState} />
                              <DetailRow label="LGA" value={farm.farmLocalGovernment} />
                              <DetailRow label="Ward" value={farm.farmWard} />
                              <DetailRow label="Polling Unit" value={farm.farmPollingUnit} />
                              <DetailRow label="Coordinates" value={farm.farmLatitude && farm.farmLongitude ? `${farm.farmLatitude.toFixed(4)}, ${farm.farmLongitude.toFixed(4)}` : null} fullWidth />
                            </div>
                          </div>

                          {/* 3. Crop Information */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-gray-900 border-b pb-1">Crop Information</h4>
                            <div className="grid grid-cols-2 gap-2">
                              <DetailRow label="Primary Crop" value={farm.primaryCrop} />
                              <DetailRow label="Type" value={farm.produceCategory} />
                              <DetailRow label="Secondary Crops" value={Array.isArray(farm.secondaryCrop) ? farm.secondaryCrop.join(', ') : farm.secondaryCrop} fullWidth />
                              <DetailRow label="Variety" value={farm.cropVariety} />
                            </div>
                          </div>

                          {/* 4. Soil & Environment */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-gray-900 border-b pb-1">Soil & Environment</h4>
                            <div className="grid grid-cols-2 gap-2">
                              <DetailRow label="Soil Type" value={farm.soilType} />
                              <DetailRow label="Soil pH" value={farm.soilPH} />
                              <DetailRow label="Fertility Status" value={farm.soilFertility} />
                              <DetailRow label="Landforms" value={farm.landforms} />
                            </div>
                          </div>

                          {/* 5. Harvest Data */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-gray-900 border-b pb-1">Harvest Data</h4>
                            <div className="grid grid-cols-2 gap-2">
                              <DetailRow label="Yield Season" value={farm.yieldSeason} />
                              <DetailRow label="Quantity" value={farm.quantity ? `${farm.quantity} Kg` : null} />
                            </div>
                          </div>
                        </div>

                        {farm.farmPolygon && (
                          <div className="mt-6">
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">Farm Map Boundary</h4>
                            <div className="h-[300px] w-full rounded-lg overflow-hidden border">
                              <FarmPolygonMapLibre
                                polygonData={farm.farmPolygon}
                                latitude={farm.farmLatitude}
                                longitude={farm.farmLongitude}
                                height={300}
                              />
                            </div>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="mx-auto h-12 w-12 text-gray-300">
                    <MapIcon />
                  </div>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No farms registered</h3>
                  <p className="mt-1 text-sm text-gray-500">This farmer has not registered any farm lands yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financials" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Section
              title="Bank Information"
              onEdit={() => handleEditClick('finance')}
              hasPermission={hasPermission(PERMISSIONS.FARMERS_UPDATE)}
            >
              <DetailRow label="Bank Name" value={farmer.bankName} />
              <DetailRow label="Account Number" value={farmer.accountNumber} />
              <DetailRow label="Account Name" value={farmer.accountName} />
              <DetailRow label="BVN" value={farmer.bvn} />
            </Section>

            <Section 
              title="Certificates & Documents"
              action={
                farmer.certificates?.length > 0 ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateCertificate}
                    disabled={generatingCert}
                    className="border-slate-300 hover:bg-slate-50 text-slate-700 gap-1.5 text-xs shadow-sm font-medium"
                    title="Re-issue certificate with updated farmer credentials"
                  >
                    {generatingCert ? (
                      <>
                        <span className="animate-spin mr-1">⏳</span> Updating…
                      </>
                    ) : (
                      <>
                        <RotateCcw className="size-3.5 text-slate-500" /> Re-issue
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleGenerateCertificate}
                    disabled={generatingCert}
                    className="bg-[#081B33] hover:bg-[#0E2C52] text-white gap-1.5 text-xs shadow-sm font-medium"
                  >
                    {generatingCert ? (
                      <>
                        <span className="animate-spin mr-1">⏳</span> Generating…
                      </>
                    ) : (
                      <>
                        <Award className="size-4 text-amber-300" /> Generate Certificate
                      </>
                    )}
                  </Button>
                )
              }
            >
              <div className="col-span-1 md:col-span-2 space-y-4">
                {certSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-2">
                    <Check className="size-4 text-emerald-600 shrink-0" />
                    <span>{certSuccessMsg}</span>
                  </div>
                )}
                {certError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium flex items-center gap-2">
                    <span className="text-rose-500 font-bold shrink-0">✕</span>
                    <span>{certError}</span>
                  </div>
                )}
                {farmer.certificates?.length > 0 ? (
                  farmer.certificates.map((cert: any) => (
                    <div 
                      key={cert.id} 
                      className="rounded-xl border border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden"
                    >
                      {/* Official Verification Header Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span className="text-[11px] font-bold text-emerald-700 tracking-wider uppercase font-mono">
                            Verified Credential
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            2026/2027 Season
                          </span>
                        </div>
                        <Link 
                          href={`/verify-certificate/${cert.certificateId}`} 
                          target="_blank"
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 hover:underline"
                        >
                          Verify Online <ExternalLink className="size-3" />
                        </Link>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 flex flex-col sm:flex-row gap-4 items-stretch">
                        {/* Miniature Certificate Preview Thumbnail */}
                        <div 
                          onClick={() => handlePreviewCertificate()}
                          className="group relative cursor-pointer shrink-0 w-full sm:w-44 h-36 rounded-lg bg-gradient-to-br from-[#081B33] via-[#0E284A] to-[#081B33] p-2.5 text-white border border-amber-400/40 shadow-sm flex flex-col justify-between overflow-hidden transition-all hover:scale-[1.02]"
                          title="Click to preview official certificate"
                        >
                          {/* Corner Ornaments */}
                          <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-amber-300/80"></div>
                          <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-amber-300/80"></div>
                          <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-amber-300/80"></div>
                          <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-amber-300/80"></div>

                          {/* Mini Header */}
                          <div className="text-center pt-0.5">
                            <p className="text-[6.5px] font-serif uppercase tracking-widest text-amber-200/90 font-bold leading-tight">
                              Cosmopolitan University Abuja
                            </p>
                            <p className="text-[5.5px] text-emerald-400 font-medium tracking-wide">
                              Centre for Climate-Smart Agriculture
                            </p>
                          </div>

                          {/* Mini Body */}
                          <div className="text-center my-auto py-0.5">
                            <p className="text-[6px] text-amber-300/80 uppercase tracking-wider font-semibold">
                              Certificate of Registration
                            </p>
                            <p className="text-[9px] font-serif font-bold text-white tracking-wide truncate mt-0.5">
                              {farmer.firstName} {farmer.lastName}
                            </p>
                            <p className="text-[6.5px] text-slate-300 font-mono mt-0.5">
                              {cert.certificateId}
                            </p>
                          </div>

                          {/* Mini Footer */}
                          <div className="flex items-center justify-between border-t border-amber-400/20 pt-1 text-[6px] text-slate-300">
                            <div className="flex items-center gap-0.5 text-amber-300 font-bold">
                              <Award className="size-2.5 text-amber-400" />
                              <span>OFFICIAL SEAL</span>
                            </div>
                            <span className="font-mono text-slate-400">
                              {new Date(cert.issuedDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                            </span>
                          </div>

                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-[#081B33]/85 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-xs font-semibold text-white backdrop-blur-[1px]">
                            <Eye className="size-4 text-amber-300" />
                            <span>Preview</span>
                          </div>
                        </div>

                        {/* Right: Credential Information & Actions */}
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <div className="flex items-start justify-between gap-1">
                              <div>
                                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                  Certificate of Registration
                                  <ShieldCheck className="size-4 text-emerald-600 inline shrink-0" />
                                </h4>
                                <p className="text-[11px] text-slate-500 font-medium">
                                  Centre for Climate-Smart Agriculture (CCSA)
                                </p>
                              </div>
                            </div>

                            {/* Metadata */}
                            <div className="grid grid-cols-2 gap-2 mt-2.5 p-2.5 bg-slate-50/80 border border-slate-100 rounded-lg text-xs">
                              <div>
                                <span className="text-[9.5px] uppercase font-semibold text-slate-400 block tracking-wider">
                                  Certificate ID
                                </span>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="font-mono font-bold text-slate-800 text-[11px]">
                                    {cert.certificateId}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyCertId(cert.certificateId)}
                                    className="text-slate-400 hover:text-slate-700 transition p-0.5 rounded"
                                    title="Copy Certificate ID"
                                  >
                                    {copiedCertId === cert.certificateId ? (
                                      <Check className="size-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="size-3" />
                                    )}
                                  </button>
                                </div>
                              </div>

                              <div>
                                <span className="text-[9.5px] uppercase font-semibold text-slate-400 block tracking-wider">
                                  Issued Date
                                </span>
                                <span className="font-semibold text-slate-800 mt-0.5 block text-[11px]">
                                  {new Date(cert.issuedDate).toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-slate-100">
                            <Button
                              size="sm"
                              onClick={() => handlePreviewCertificate()}
                              className="bg-slate-900 hover:bg-slate-800 text-white text-xs gap-1.5 shadow-sm font-medium h-8"
                            >
                              <Eye className="size-3.5 text-amber-300" />
                              View Preview
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              disabled={generatingCert}
                              onClick={() => handleGenerateCertificate()}
                              className="border-slate-300 hover:bg-slate-50 text-slate-700 text-xs gap-1.5 font-medium h-8"
                            >
                              <Download className="size-3.5 text-slate-600" />
                              Download PDF
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                    <div className="h-12 w-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-2.5 shadow-sm">
                      <Award className="size-6 text-amber-600" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">No Certificate Issued Yet</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-3">
                      Generate an official CCSA certificate to issue a verifiable registration credential and PDF document for this farmer.
                    </p>
                    <Button
                      size="sm"
                      onClick={handleGenerateCertificate}
                      disabled={generatingCert}
                      className="bg-[#081B33] hover:bg-[#0E2C52] text-white text-xs gap-1.5 px-4 h-8 font-medium shadow-sm"
                    >
                      {generatingCert ? (
                        <>
                          <span className="animate-spin mr-1">⏳</span> Generating…
                        </>
                      ) : (
                        <>
                          <Award className="size-3.5 text-amber-300" /> Generate Official Certificate
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </Section>

            <Section title="Referees / Next of Kin">
              {farmer.referees?.length > 0 ? (
                <div className="space-y-4 col-span-2">
                  {farmer.referees.map((ref: any) => (
                    <div key={ref.id} className="flex items-center space-x-4 p-3 border rounded-lg bg-gray-50">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                        <UserGroupIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {ref.firstName} {ref.lastName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {ref.relationship}
                        </p>
                      </div>
                      <div className="inline-flex items-center text-sm font-medium text-gray-900">
                        {ref.phone}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic col-span-2">No referees listed.</p>
              )}
            </Section>
          </div>
        </TabsContent>

      </Tabs>

      {/* Farm Delete Request Dialog */}
      <Dialog open={!!deleteRequestFarm} onOpenChange={(open) => { if (!open) { setDeleteRequestFarm(null); setDeleteReason(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Farm Deletion</DialogTitle>
            <DialogDescription>
              Submit a deletion request for{' '}
              <strong>{deleteRequestFarm?.primaryCrop || 'this farm'}</strong>
              {deleteRequestFarm?.farmSize ? ` (${deleteRequestFarm.farmSize} ha)` : ''}.
              An admin must approve before the farm is permanently removed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Reason for deletion <span className="text-red-500">*</span></Label>
            <Textarea
              placeholder="Describe why this farm should be deleted…"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setDeleteRequestFarm(null); setDeleteReason(''); }}>
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleSubmitDeleteRequest}
              disabled={deletingRequest || !deleteReason.trim()}
            >
              {deletingRequest ? 'Submitting…' : '📋 Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Information</DialogTitle>
            <DialogDescription>
              Make changes to the farmer's details below. Click save when you're done.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {editSection === 'basic' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input value={formData.firstName || ''} onChange={(e) => handleChange('firstName', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input value={formData.lastName || ''} onChange={(e) => handleChange('lastName', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={formData.phone || ''} onChange={(e) => handleChange('phone', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={formData.email || ''} onChange={(e) => handleChange('email', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Textarea value={formData.address || ''} onChange={(e) => handleChange('address', e.target.value)} />
                </div>
              </>
            )}

            {editSection === 'location' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input value={formData.state || ''} onChange={(e) => handleChange('state', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>LGA</Label>
                    <Input value={formData.lga || ''} onChange={(e) => handleChange('lga', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Ward</Label>
                  <Input value={formData.ward || ''} onChange={(e) => handleChange('ward', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Polling Unit</Label>
                  <Input value={formData.pollingUnit || ''} onChange={(e) => handleChange('pollingUnit', e.target.value)} />
                </div>
              </>
            )}

            {editSection === 'farming' && (
              <>
                <div className="space-y-2">
                  <Label>Primary Crop</Label>
                  <Input value={formData.primaryCrop || ''} onChange={(e) => handleChange('primaryCrop', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Farm Size (Ha)</Label>
                    <Input type="number" value={formData.farmSize || ''} onChange={(e) => handleChange('farmSize', parseFloat(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Experience (Years)</Label>
                    <Input type="number" value={formData.farmingExperience || ''} onChange={(e) => handleChange('farmingExperience', parseInt(e.target.value))} />
                  </div>
                </div>
              </>
            )}

            {editSection === 'finance' && (
              <>
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input value={formData.bankName || ''} onChange={(e) => handleChange('bankName', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input value={formData.accountNumber || ''} onChange={(e) => handleChange('accountNumber', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <Input value={formData.accountName || ''} onChange={(e) => handleChange('accountName', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>BVN</Label>
                  <Input value={formData.bvn || ''} onChange={(e) => handleChange('bvn', e.target.value)} />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Official Certificate Full Preview Modal */}
      <Dialog 
        open={certPreviewOpen} 
        onOpenChange={(open) => {
          if (!open) handleClosePreview();
          else setCertPreviewOpen(true);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-950 border-slate-800 text-white shadow-2xl">
          <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <Award className="size-5 text-amber-400" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
                  Official Farmer Registration Certificate
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] py-0 px-1.5">
                    Verified
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Centre for Climate-Smart Agriculture · Cosmopolitan University Abuja
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => handleGenerateCertificate()}
                disabled={generatingCert}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 h-8 font-medium shadow-sm"
              >
                <Download className="size-3.5" />
                Download PDF
              </Button>
            </div>
          </div>

          <div className="flex-1 bg-slate-900 p-3 min-h-[500px] flex items-center justify-center">
            {certPreviewLoading ? (
              <div className="text-center py-16">
                <div className="animate-spin h-9 w-9 border-2 border-amber-400 border-t-transparent rounded-full mx-auto mb-3"></div>
                <p className="text-sm font-semibold text-slate-200">Rendering High-Resolution Certificate…</p>
                <p className="text-xs text-slate-400 mt-1">Generating cryptographic seal, vector borders, and geospatial maps</p>
              </div>
            ) : certBlobUrl ? (
              <iframe
                src={certBlobUrl}
                className="w-full h-[72vh] rounded-lg border border-slate-800 bg-white shadow-2xl"
                title="Official Certificate Document"
              />
            ) : (
              <div className="text-center py-16 text-slate-400">
                <p className="text-sm">Failed to render certificate preview.</p>
                <Button 
                  size="sm" 
                  onClick={() => handlePreviewCertificate()} 
                  className="mt-3 bg-blue-600 hover:bg-blue-700 text-xs text-white"
                >
                  Retry Preview
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// ----------------------------------------------------
// Reusable Sub-Components
// ----------------------------------------------------

function Section({ 
  title, 
  children, 
  onEdit, 
  hasPermission = false,
  action
}: { 
  title: string, 
  children: React.ReactNode, 
  onEdit?: () => void, 
  hasPermission?: boolean,
  action?: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <div className="flex items-center gap-2">
          {action}
          {onEdit && hasPermission && (
            <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 px-2 text-muted-foreground hover:text-primary">
              <PencilIcon className="size-4 mr-1" /> Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <Separator className="mb-4" />
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
        {children}
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value, fullWidth = false }: { label: string, value: string | number | null | undefined, fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? 'col-span-1 md:col-span-2' : 'col-span-1'}>
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-gray-900 break-words">
        {value && value !== '-' ? value : <span className="text-gray-400 italic">Not set</span>}
      </dd>
    </div>
  );
}

function FarmerSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-[300px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
      </div>
    </div>
  )
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex justify-center">
      <Card className="w-full max-w-md border-red-200 bg-red-50">
        <CardContent className="pt-6 text-center">
          <h3 className="text-lg font-medium text-red-800">Error Loading Farmer</h3>
          <p className="text-red-600 mt-2">{error}</p>
          <Button variant="outline" className="mt-4 border-red-200" asChild>
            <Link href="/farmers">Back to Farmers</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// Helper to sanitize payload (remove nested objects/readonly fields)
function sanitizeFarmerPayload(data: any) {
  const {
    id,
    createdAt,
    updatedAt,
    registrationDate,
    agentId,
    // clusterId, // We might want to keep or remove depending on if it's editable. Let's keep it.
    cluster,
    agent,
    farms,
    certificates,
    referees,
    ...updatable
  } = data;
  return updatable;
}

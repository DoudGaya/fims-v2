'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { usePermissions } from '@/components/PermissionProvider';
import { PERMISSIONS } from '@/lib/permissions';
import Link from 'next/link';
import * as React from 'react';

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
import FarmPolygonMap from '@/components/maps/FarmPolygonMap';

export default function FarmerDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const { hasPermission } = usePermissions();
  const id = params?.id as string;

  const [farmer, setFarmer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editSection, setEditSection] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      if (!hasPermission(PERMISSIONS.FARMERS_READ)) {
        router.push('/dashboard');
      } else if (id) {
        fetchFarmerDetails();
      }
    }
  }, [status, router, hasPermission, id]);

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
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/farmers"><ArrowLeftIcon className="mr-2 size-4" /> Back</Link>
          </Button>
          {/* Global Edit or Actions could go here */}
        </div>
      </div>

      <Separator />

      {/* 2. Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-lg">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="farms">Farms & Crops</TabsTrigger>
          <TabsTrigger value="financials">Financials & Documents</TabsTrigger>
        </TabsList>

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
              <DetailRow label="Primary Crop" value={farmer.primaryCrop} />
              <DetailRow label="Total Farm Size" value={farmer.farmSize ? `${farmer.farmSize} Ha` : null} />
              <DetailRow label="Experience" value={farmer.farmingExperience ? `${farmer.farmingExperience} Years` : null} />
              <DetailRow label="Registration Date" value={new Date(farmer.createdAt).toLocaleDateString()} />
              <DetailRow label="Agent/Enroller" value={farmer.agent ? `${farmer.agent.firstName} ${farmer.agent.lastName}` : 'N/A'} />
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
                              <FarmPolygonMap polygonData={farm.farmPolygon} />
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

            <Section title="Certificates & Documents">
              <div className="space-y-4">
                {farmer.certificates?.length > 0 ? (
                  farmer.certificates.map((cert: any) => (
                    <Card key={cert.id} className="border-l-4 border-l-blue-600 shadow-sm">
                      <CardContent className="pt-6">
                        <div className="flex gap-4">
                          <div className="h-16 w-16 bg-gray-50 border rounded-lg flex items-center justify-center shrink-0">
                            <DocumentTextIcon className="h-8 w-8 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              Certificate of Registration
                            </p>
                            <p className="text-xs text-gray-500">
                              ID: {cert.certificateId}
                            </p>
                            <p className="text-xs text-gray-500">
                              Issued: {new Date(cert.issuedDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700" size="sm">
                          Download PDF
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                ) : <p className="text-sm text-gray-500 italic">No certificates available.</p>}
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

    </div>
  );
}

// ----------------------------------------------------
// Reusable Sub-Components
// ----------------------------------------------------

function Section({ title, children, onEdit, hasPermission = false }: { title: string, children: React.ReactNode, onEdit?: () => void, hasPermission?: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {onEdit && hasPermission && (
          <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 px-2 text-muted-foreground hover:text-primary">
            <PencilIcon className="size-4 mr-1" /> Edit
          </Button>
        )}
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

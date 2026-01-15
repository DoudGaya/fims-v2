'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import * as React from 'react';

// Icons
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  MapPinIcon,
  UserIcon,
  CalendarIcon,
  MapIcon,
  Leaf
} from 'lucide-react';

// Shadcn UI
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import FarmPolygonMap from '@/components/maps/FarmPolygonMap';

interface Farm {
  id: string;
  farmSize: number;
  primaryCrop: string;
  secondaryCrop: string | string[];
  farmState: string;
  farmLocalGovernment: string;
  farmCity: string;
  farmWard?: string;
  farmPollingUnit?: string;
  farmCoordinates: any;
  farmPolygon: any;
  createdAt: string;
  updatedAt: string;

  // Additional Fields
  farmOwnership?: string;
  farmingSeason?: string;
  farmingExperience?: number;
  year?: number;
  produceCategory?: string;
  cropVariety?: string;
  soilType?: string;
  soilPH?: number;
  soilFertility?: string;
  landforms?: string;
  yieldSeason?: string;
  quantity?: number;
  farmLatitude?: number;
  farmLongitude?: number;

  farmer: {
    id: string;
    firstName: string;
    lastName: string;
    nin: string;
    phoneNumber?: string;
    photoUrl?: string;
  };
}

export default function FarmDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [farm, setFarm] = useState<Farm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchFarm = useCallback(async () => {
    try {
      const res = await fetch(`/api/farms/${id}`);
      if (!res.ok) {
        throw new Error('Failed to fetch farm details');
      }
      const data = await res.json();
      setFarm(data.farm);
    } catch (err) {
      console.error(err);
      setError('Failed to load farm details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchFarm();
    }
  }, [id, fetchFarm]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/farms/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete farm');
      }

      router.push('/farms');
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to delete farm'); // Could replace with Toast
      setIsDeleting(false);
    }
  };

  const formatSecondaryCrops = (crops: string | string[] | undefined | null) => {
    if (!crops) return 'None';
    if (Array.isArray(crops)) return crops.join(', ');
    return crops;
  };

  if (loading) return <FarmSkeleton />;
  if (error) return <ErrorState error={error} />;
  if (!farm) return <ErrorState error="Farm not found" />;

  return (
    <div className="w-full mx-auto px-1 space-y-8 animate-in fade-in duration-500">

      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-xl bg-green-100 flex items-center justify-center text-green-700 shadow-sm border border-green-200">
            <Leaf className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{farm.primaryCrop || 'Farm'}</h1>
              <Badge variant="outline" className="text-xs uppercase tracking-wider">{farm.produceCategory || 'Crop'}</Badge>
            </div>
            <div className="flex flex-wrap gap-4 mt-1">
              <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                <MapPinIcon className="size-4" /> {farm.farmLocalGovernment}, {farm.farmState}
              </p>
              <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                <CalendarIcon className="size-4" /> Season: {farm.farmingSeason || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/farms"><ArrowLeftIcon className="mr-2 size-4" /> Back</Link>
          </Button>

          <Button variant="secondary" asChild>
            <Link href={`/farms/${id}/edit`}>
              <PencilIcon className="mr-2 size-4" /> Edit
            </Link>
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                <TrashIcon className="mr-2 size-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the farm record and remove it from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                  {isDeleting ? 'Deleting...' : 'Delete Farm'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Separator />

      {/* 2. Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Details & Tabs (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Detailed Information Tabs */}
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="bg-slate-100 p-1 rounded-lg w-full justify-start">
              <TabsTrigger value="details" className="flex-1 md:flex-none">General Details</TabsTrigger>
              <TabsTrigger value="environment" className="flex-1 md:flex-none">Soil & Environment</TabsTrigger>
              <TabsTrigger value="harvest" className="flex-1 md:flex-none">Harvest Data</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Farm Overview</CardTitle>
                  <CardDescription>General information about the farm property.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                  <DetailRow label="Farm Size" value={`${farm.farmSize} Hectares`} />
                  <DetailRow label="Primary Crop" value={farm.primaryCrop} />
                  <DetailRow label="Secondary Crops" value={formatSecondaryCrops(farm.secondaryCrop)} />
                  <DetailRow label="Ownership" value={farm.farmOwnership} />
                  <DetailRow label="Year Established" value={farm.year} />
                  <DetailRow label="Experience" value={farm.farmingExperience ? `${farm.farmingExperience} Years` : null} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Location Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                  <DetailRow label="State" value={farm.farmState} />
                  <DetailRow label="Local Government" value={farm.farmLocalGovernment} />
                  <DetailRow label="City / Town" value={farm.farmCity} />
                  <DetailRow label="Ward" value={farm.farmWard} />
                  <DetailRow label="Polling Unit" value={farm.farmPollingUnit} />
                  <DetailRow label="Coordinates"
                    value={farm.farmLatitude && farm.farmLongitude
                      ? `${farm.farmLatitude.toFixed(5)}, ${farm.farmLongitude.toFixed(5)}`
                      : 'Not set'}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="environment" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Soil & Environmental Conditions</CardTitle>
                  <CardDescription>Physical characteristics of the land.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                  <DetailRow label="Soil Type" value={farm.soilType} />
                  <DetailRow label="Soil pH" value={farm.soilPH} />
                  <DetailRow label="Soil Fertility" value={farm.soilFertility} />
                  <DetailRow label="Landforms" value={farm.landforms} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="harvest" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Production & Harvest</CardTitle>
                  <CardDescription>Yield data and production metrics.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                  <DetailRow label="Yield Season" value={farm.yieldSeason} />
                  <DetailRow label="Recorded Quantity" value={farm.quantity ? `${farm.quantity} Kg` : null} />
                  <DetailRow label="Variety" value={farm.cropVariety} />
                  <DetailRow label="Category" value={farm.produceCategory} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column: Key Summary & Map (1/3 width) */}
        <div className="space-y-6">

          {/* Farmer Profile Card */}
          <Card className="border-l-4 border-l-blue-600">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-500 uppercase tracking-wider">Farmer Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="h-12 w-12 border">
                  <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                    {farm.farmer.firstName[0]}{farm.farmer.lastName[0]}
                  </AvatarFallback>
                  {farm.farmer.photoUrl && <AvatarImage src={farm.farmer.photoUrl} />}
                </Avatar>
                <div>
                  <h3 className="font-bold text-gray-900">{farm.farmer.firstName} {farm.farmer.lastName}</h3>
                  <p className="text-xs text-gray-500">NIN: {farm.farmer.nin}</p>
                </div>
              </div>
              <Separator className="my-3" />
              <div className="flex flex-col gap-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href={`/farmers/${farm.farmer.id}`}>
                    <UserIcon className="mr-2 h-4 w-4" /> View Full Profile
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Map Card */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-gray-50 border-b pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <MapIcon className="h-4 w-4" /> Farm Boundary
                </CardTitle>
                {farm.farmSize && <Badge variant="secondary">{farm.farmSize} Ha</Badge>}
              </div>
            </CardHeader>
            <div className="h-[300px] w-full relative bg-slate-100">
              {/* Map Component */}
              {farm.farmPolygon && Array.isArray(farm.farmPolygon) && farm.farmPolygon.length > 0 ? (
                <FarmPolygonMap polygonData={farm.farmPolygon} />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                  <MapIcon className="h-12 w-12 mb-2 opacity-20" />
                  <p className="text-sm">No map data available</p>
                </div>
              )}
            </div>
            {/* Coordinates Footer */}
            {farm.farmLatitude && (
              <div className="px-4 py-3 bg-gray-50 border-t text-xs text-center text-gray-500 font-mono">
                {farm.farmLatitude.toFixed(6)}, {farm.farmLongitude?.toFixed(6)}
              </div>
            )}
          </Card>

          {/* Timestamps */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span className="font-medium text-gray-700">{new Date(farm.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Updated:</span>
                  <span className="font-medium text-gray-700">{new Date(farm.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

    </div>
  );
}

// ----------------------------------------------------
// Helpers
// ----------------------------------------------------

function DetailRow({ label, value }: { label: string, value: string | number | null | undefined }) {
  return (
    <div className="col-span-1">
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-gray-900 break-all">
        {value && value !== '-' ? value : <span className="text-gray-400 italic">Not set</span>}
      </dd>
    </div>
  );
}

function FarmSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex gap-4">
        <Skeleton className="h-16 w-16 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-4 w-[150px]" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-[400px]" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    </div>
  )
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex justify-center">
      <Card className="w-full max-w-md border-red-200 bg-red-50">
        <CardContent className="pt-6 text-center">
          <h3 className="text-lg font-medium text-red-800">Error Loading Farm</h3>
          <p className="text-red-600 mt-2">{error}</p>
          <Button variant="outline" className="mt-4 border-red-200" asChild>
            <Link href="/farms">Back to Farms List</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

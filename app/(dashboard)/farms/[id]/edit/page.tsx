'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftIcon, SaveIcon, Loader2 } from 'lucide-react';

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
// Zod Schema matching the API but using strings for form state to handle inputs correctly
const farmFormSchema = z.object({
  farmSize: z.string().optional(),
  primaryCrop: z.string().min(1, 'Primary crop is required'),
  secondaryCrop: z.string().optional(),
  produceCategory: z.string().optional(),
  cropVariety: z.string().optional(),

  farmOwnership: z.string().optional(),
  farmingSeason: z.string().optional(),
  farmingExperience: z.string().optional(),
  year: z.string().optional(),

  farmState: z.string().min(1, 'State is required'),
  farmLocalGovernment: z.string().min(1, 'LGA is required'),
  farmCity: z.string().optional(),
  farmWard: z.string().optional(),
  farmPollingUnit: z.string().optional(),

  farmLatitude: z.string().optional(),
  farmLongitude: z.string().optional(),
  farmCoordinates: z.string().optional(),
  farmPolygon: z.string().optional(),

  soilType: z.string().optional(),
  soilPH: z.string().optional(),
  soilFertility: z.string().optional(),
  landforms: z.string().optional(),

  yieldSeason: z.string().optional(),
  quantity: z.string().optional(),
});

type FarmFormValues = z.infer<typeof farmFormSchema>;

export default function EditFarmPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [farmerName, setFarmerName] = useState('');
  const [error, setError] = useState('');

  const form = useForm<FarmFormValues>({
    resolver: zodResolver(farmFormSchema),
    defaultValues: {
      farmSize: '',
      primaryCrop: '',
      secondaryCrop: '',
      produceCategory: '',
      cropVariety: '',
      farmOwnership: '',
      farmingSeason: '',
      farmingExperience: '',
      year: '',
      farmState: '',
      farmLocalGovernment: '',
      farmCity: '',
      farmWard: '',
      farmPollingUnit: '',
      farmCoordinates: '',
      farmPolygon: '',
      soilType: '',
      soilPH: '',
      soilFertility: '',
      yieldSeason: '',
      quantity: '',
      farmLatitude: '',
      farmLongitude: '',
    },
  });

  const fetchFarm = useCallback(async () => {
    try {
      const res = await fetch(`/api/farms/${id}`);
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Fetch failed: ${res.status} ${res.statusText}`, errorText);
        throw new Error(`Failed to fetch farm: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      const farm = data.farm;

      setFarmerName(`${farm.farmer.firstName} ${farm.farmer.lastName}`);

      // Reset form with data
      form.reset({
        farmSize: farm.farmSize ? String(farm.farmSize) : '',
        primaryCrop: farm.primaryCrop || '',
        secondaryCrop: Array.isArray(farm.secondaryCrop) ? farm.secondaryCrop.join(', ') : (farm.secondaryCrop || ''),
        produceCategory: farm.produceCategory || '',
        cropVariety: farm.cropVariety || '',

        farmOwnership: farm.farmOwnership || '',
        farmingSeason: farm.farmingSeason || '',
        farmingExperience: farm.farmingExperience ? String(farm.farmingExperience) : '',
        year: farm.year ? String(farm.year) : '',

        farmState: farm.farmState || '',
        farmLocalGovernment: farm.farmLocalGovernment || '',
        farmCity: farm.farmCity || '',
        farmWard: farm.farmWard || '',
        farmPollingUnit: farm.farmPollingUnit || '',

        farmLatitude: farm.farmLatitude ? String(farm.farmLatitude) : '',
        farmLongitude: farm.farmLongitude ? String(farm.farmLongitude) : '',
        farmCoordinates: farm.farmCoordinates ? JSON.stringify(farm.farmCoordinates, null, 2) : '',
        farmPolygon: farm.farmPolygon ? JSON.stringify(farm.farmPolygon, null, 2) : '',

        soilType: farm.soilType || '',
        soilPH: farm.soilPH ? String(farm.soilPH) : '',
        soilFertility: farm.soilFertility || '',
        landforms: farm.landforms || '',

        yieldSeason: farm.yieldSeason || '',
        quantity: farm.quantity ? String(farm.quantity) : '',
      });

    } catch (err) {
      console.error(err);
      setError('Failed to load farm details');
    } finally {
      setLoading(false);
    }
  }, [id, form]);

  useEffect(() => {
    if (id) fetchFarm();
  }, [id, fetchFarm]);

  const onSubmit = async (data: FarmFormValues) => {
    setSaving(true);
    setError('');

    try {
      // Parse JSON fields safely
      let parsedCoordinates = null;
      let parsedPolygon = null;

      try {
        if (data.farmCoordinates) parsedCoordinates = JSON.parse(data.farmCoordinates);
      } catch (e) {
        // Ignore JSON parse error, or alert user
        console.warn('Invalid JSON for coordinates');
      }

      try {
        if (data.farmPolygon) parsedPolygon = JSON.parse(data.farmPolygon);
      } catch (e) {
        console.warn('Invalid JSON for polygon');
      }

      const payload = {
        ...data,
        farmSize: data.farmSize ? parseFloat(data.farmSize) : undefined,
        farmingExperience: data.farmingExperience ? parseInt(data.farmingExperience) : undefined,
        year: data.year ? parseInt(data.year) : undefined,
        soilPH: data.soilPH ? parseFloat(data.soilPH) : undefined,
        quantity: data.quantity ? parseFloat(data.quantity) : undefined,
        farmLatitude: data.farmLatitude ? parseFloat(data.farmLatitude) : undefined,
        farmLongitude: data.farmLongitude ? parseFloat(data.farmLongitude) : undefined,
        secondaryCrop: data.secondaryCrop ? data.secondaryCrop.split(',').map(s => s.trim()).filter(Boolean) : [],
        farmCoordinates: parsedCoordinates,
        farmPolygon: parsedPolygon,
      };

      const res = await fetch(`/api/farms/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const resData = await res.json();
        throw new Error(resData.error || 'Failed to update farm');
      }

      // Success
      router.push(`/farms/${id}`);
      router.refresh();

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while saving.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !farmerName) {
    return <div className="p-8 text-center text-red-600">{error}</div>;
  }

  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-1 space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Edit Farm</h1>
          <p className="text-muted-foreground mt-1">
            Updating records for <span className="font-semibold text-primary">{farmerName}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/farms/${id}`}>
              <ArrowLeftIcon className="mr-2 h-4 w-4" /> Cancel
            </Link>
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={saving} size="sm">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SaveIcon className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left Column - Main Details */}
            <div className="md:col-span-2 space-y-6">

              {/* 1. General Information */}
              <Card>
                <CardHeader>
                  <CardTitle>General Information</CardTitle>
                  <CardDescription>Basic details about the farm property.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="farmSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Farm Size (Ha)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="farmOwnership"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ownership Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select ownership" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Owned">Owned</SelectItem>
                            <SelectItem value="Leased">Leased</SelectItem>
                            <SelectItem value="Rented">Rented</SelectItem>
                            <SelectItem value="Family Land">Family Land</SelectItem>
                            <SelectItem value="Communal">Communal</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year Established</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="farmingExperience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Experience (Years)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="farmingSeason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Farming Season</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Season" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Dry">Dry Season</SelectItem>
                            <SelectItem value="Wet">Wet Season</SelectItem>
                            <SelectItem value="All Year">All Year</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* 2. Crop Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Crop Information</CardTitle>
                  <CardDescription>Details about the crops grown.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="primaryCrop"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Crop</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Maize" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="produceCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Cereal">Cereal</SelectItem>
                            <SelectItem value="Legume">Legume</SelectItem>
                            <SelectItem value="Tuber">Tuber</SelectItem>
                            <SelectItem value="Vegetable">Vegetable</SelectItem>
                            <SelectItem value="Fruit">Fruit</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="secondaryCrop"
                    render={({ field }) => (
                      <FormItem className="col-span-1 md:col-span-2">
                        <FormLabel>Secondary Crops</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Cassava, Yam (comma separated)" {...field} />
                        </FormControl>
                        <FormDescription>Separate multiple crops with commas.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cropVariety"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Crop Variety</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Hybrid, Local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* 3. Location Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Location</CardTitle>
                  <CardDescription>Geolocation and administrative areas.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="farmState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="farmLocalGovernment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LGA</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="farmCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City / Village</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="farmWard"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ward</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="farmPollingUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Polling Unit</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4 col-span-1 md:col-span-2">
                    <FormField
                      control={form.control}
                      name="farmLatitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Latitude</FormLabel>
                          <FormControl>
                            <Input type="number" step="any" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="farmLongitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Longitude</FormLabel>
                          <FormControl>
                            <Input type="number" step="any" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Right Column - Secondary Details */}
            <div className="space-y-6">

              {/* 4. Soil & Environment */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Soil & Environment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="soilType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Soil Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Soil Type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Loamy">Loamy</SelectItem>
                            <SelectItem value="Sandy">Sandy</SelectItem>
                            <SelectItem value="Clay">Clay</SelectItem>
                            <SelectItem value="Silt">Silt</SelectItem>
                            <SelectItem value="Peaty">Peaty</SelectItem>
                            <SelectItem value="Chalky">Chalky</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="soilPH"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Soil pH</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="soilFertility"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fertility Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Moderate">Moderate</SelectItem>
                            <SelectItem value="Low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="landforms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Landforms</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Flat, Hilly" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* 5. Harvest Data */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Harvest Data</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="yieldSeason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Yield Season</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 2023/2024" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity (Kg)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* 6. Advanced Data (Hidden by default or in accordion? JSON fields) */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Advanced Data</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="farmPolygon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Polygon Data (JSON)</FormLabel>
                        <FormControl>
                          <Textarea className="font-mono text-xs" rows={5} {...field} />
                        </FormControl>
                        <FormDescription>GeoJSON or coordinate array</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

            </div>
          </div>

        </form>
      </Form>
    </div>
  );
}

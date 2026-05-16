'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Farmer {
  id: string;
  firstName: string;
  lastName: string;
  nin: string;
}

function CreateFarmForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedFarmerId = searchParams.get('farmerId');

  const [loading, setLoading] = useState(false);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    farmerId: preselectedFarmerId || '',
    farmSize: '',
    primaryCrop: '',
    secondaryCrop: '',
    farmOwnership: '',
    farmState: '',
    farmLocalGovernment: '',
    farmWard: '',
    farmPollingUnit: '',
    farmingSeason: '',
    farmingExperience: '',
    farmLatitude: '',
    farmLongitude: '',
    soilType: '',
    soilFertility: '',
    farmPolygon: '',
  });

  useEffect(() => {
    const fetchFarmers = async () => {
      try {
        const res = await fetch('/api/farmers?limit=200');
        if (res.ok) {
          const data = await res.json();
          setFarmers(data.farmers);
        }
      } catch (err) {
        console.error('Failed to fetch farmers', err);
      }
    };
    fetchFarmers();
  }, []);

  const set = (name: string, value: string) =>
    setFormData(prev => ({ ...prev, [name]: value }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    set(e.target.name, e.target.value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.farmerId) throw new Error('Please select a farmer');

      let farmPolygon: any[] | undefined;
      if (formData.farmPolygon.trim()) {
        try {
          farmPolygon = JSON.parse(formData.farmPolygon);
        } catch {
          throw new Error('GPS Boundary must be valid JSON. Leave empty or fix the JSON array.');
        }
      }

      const payload: Record<string, any> = {
        farmerId: formData.farmerId,
        primaryCrop: formData.primaryCrop,
        farmOwnership: formData.farmOwnership,
        farmState: formData.farmState,
        farmLocalGovernment: formData.farmLocalGovernment,
        farmWard: formData.farmWard,
        farmPollingUnit: formData.farmPollingUnit,
        farmingSeason: formData.farmingSeason,
      };

      if (formData.farmSize) payload.farmSize = parseFloat(formData.farmSize);
      if (formData.secondaryCrop) payload.secondaryCrop = formData.secondaryCrop;
      if (formData.farmingExperience) payload.farmingExperience = parseInt(formData.farmingExperience);
      if (formData.farmLatitude) payload.farmLatitude = parseFloat(formData.farmLatitude);
      if (formData.farmLongitude) payload.farmLongitude = parseFloat(formData.farmLongitude);
      if (formData.soilType) payload.soilType = formData.soilType;
      if (formData.soilFertility) payload.soilFertility = formData.soilFertility;
      if (farmPolygon) payload.farmPolygon = farmPolygon;

      const res = await fetch('/api/farms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create farm');
      }

      const { farm } = await res.json();
      router.push(`/farmers/${farm.farmerId}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      <div>
        <Link href="/farms" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Farms
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Register New Farm</h1>
        <p className="text-sm text-muted-foreground mt-1">Add farm details for a registered farmer.</p>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Farmer */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Farmer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="farmerId">Select Farmer <span className="text-red-500">*</span></Label>
              <Select value={formData.farmerId} onValueChange={(v) => set('farmerId', v)}>
                <SelectTrigger id="farmerId">
                  <SelectValue placeholder="— Select a Farmer —" />
                </SelectTrigger>
                <SelectContent>
                  {farmers.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.firstName} {f.lastName} — {f.nin}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Crop & Farm Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Crop & Farm Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primaryCrop">Primary Crop <span className="text-red-500">*</span></Label>
              <Input id="primaryCrop" name="primaryCrop" value={formData.primaryCrop} onChange={handleChange} placeholder="e.g. Rice" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryCrop">Secondary Crops</Label>
              <Input id="secondaryCrop" name="secondaryCrop" value={formData.secondaryCrop} onChange={handleChange} placeholder="e.g. Maize, Beans" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="farmSize">Farm Size (hectares)</Label>
              <Input id="farmSize" name="farmSize" type="number" step="0.01" min="0" value={formData.farmSize} onChange={handleChange} placeholder="e.g. 2.5" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="farmOwnership">Farm Ownership <span className="text-red-500">*</span></Label>
              <Select value={formData.farmOwnership} onValueChange={(v) => set('farmOwnership', v)}>
                <SelectTrigger id="farmOwnership"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Owner">Owner</SelectItem>
                  <SelectItem value="Tenant">Tenant</SelectItem>
                  <SelectItem value="Leasehold">Leasehold</SelectItem>
                  <SelectItem value="Family Land">Family Land</SelectItem>
                  <SelectItem value="Communal">Communal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="farmingSeason">Farming Season <span className="text-red-500">*</span></Label>
              <Select value={formData.farmingSeason} onValueChange={(v) => set('farmingSeason', v)}>
                <SelectTrigger id="farmingSeason"><SelectValue placeholder="Select season" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Wet Season">Wet Season</SelectItem>
                  <SelectItem value="Dry Season">Dry Season</SelectItem>
                  <SelectItem value="Year Round">Year Round</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="farmingExperience">Farming Experience (years)</Label>
              <Input id="farmingExperience" name="farmingExperience" type="number" min="0" value={formData.farmingExperience} onChange={handleChange} placeholder="e.g. 5" />
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Farm Location</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="farmState">State <span className="text-red-500">*</span></Label>
              <Input id="farmState" name="farmState" value={formData.farmState} onChange={handleChange} placeholder="e.g. Kano" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="farmLocalGovernment">LGA <span className="text-red-500">*</span></Label>
              <Input id="farmLocalGovernment" name="farmLocalGovernment" value={formData.farmLocalGovernment} onChange={handleChange} placeholder="e.g. Nassarawa" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="farmWard">Ward <span className="text-red-500">*</span></Label>
              <Input id="farmWard" name="farmWard" value={formData.farmWard} onChange={handleChange} placeholder="e.g. Kabuwaya" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="farmPollingUnit">Polling Unit <span className="text-red-500">*</span></Label>
              <Input id="farmPollingUnit" name="farmPollingUnit" value={formData.farmPollingUnit} onChange={handleChange} placeholder="e.g. Polling Unit 003" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="farmLatitude">Latitude (GPS)</Label>
              <Input id="farmLatitude" name="farmLatitude" type="number" step="any" value={formData.farmLatitude} onChange={handleChange} placeholder="e.g. 11.9964" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="farmLongitude">Longitude (GPS)</Label>
              <Input id="farmLongitude" name="farmLongitude" type="number" step="any" value={formData.farmLongitude} onChange={handleChange} placeholder="e.g. 8.5172" />
            </div>
          </CardContent>
        </Card>

        {/* Soil */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Soil Information <span className="text-xs font-normal text-muted-foreground">(optional)</span></CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="soilType">Soil Type</Label>
              <Select value={formData.soilType} onValueChange={(v) => set('soilType', v)}>
                <SelectTrigger id="soilType"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Clay">Clay</SelectItem>
                  <SelectItem value="Sandy">Sandy</SelectItem>
                  <SelectItem value="Loam">Loam</SelectItem>
                  <SelectItem value="Sandy Loam">Sandy Loam</SelectItem>
                  <SelectItem value="Clay Loam">Clay Loam</SelectItem>
                  <SelectItem value="Silt">Silt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="soilFertility">Soil Fertility</Label>
              <Select value={formData.soilFertility} onValueChange={(v) => set('soilFertility', v)}>
                <SelectTrigger id="soilFertility"><SelectValue placeholder="Select level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* GPS Boundary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">GPS Boundary <span className="text-xs font-normal text-muted-foreground">(optional)</span></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="farmPolygon">Polygon Coordinates (JSON array)</Label>
              <Textarea
                id="farmPolygon"
                name="farmPolygon"
                value={formData.farmPolygon}
                onChange={handleChange}
                rows={4}
                placeholder={'[{"latitude": 11.99, "longitude": 8.51}, {"latitude": 12.00, "longitude": 8.52}, {"latitude": 11.98, "longitude": 8.53}]'}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">Paste at least 3 coordinate points as a JSON array. Leave empty if not available.</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/farms">Cancel</Link>
          </Button>
          <Button type="submit" disabled={loading || !formData.farmerId}>
            {loading ? 'Saving...' : 'Register Farm'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function CreateFarmPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateFarmForm />
    </Suspense>
  );
}

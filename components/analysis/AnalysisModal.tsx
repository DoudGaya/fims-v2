'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  CloudIcon, 
  BeakerIcon, 
  DropletIcon, 
  MapIcon, 
  RefreshCwIcon,
  ThermometerIcon,
  WindIcon
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface AnalysisModalProps {
  farmId: string;
  farmName?: string;
}

export function AnalysisModal({ farmId, farmName }: AnalysisModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('weather');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = async (variable: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmId, variable })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Analysis failed');
      }

      const result = await res.json();
      setData(result.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch when tab changes or modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAnalysis(activeTab);
    }
  }, [isOpen, activeTab]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-4 py-4">
          <Skeleton className="h-[125px] w-full rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-10 text-red-500">
          <p>Error: {error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchAnalysis(activeTab)} className="mt-4">
            Retry
          </Button>
        </div>
      );
    }

    if (!data) return null;

    // Render based on active tab
    switch (activeTab) {
      case 'weather':
        return (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <Card className="col-span-2 bg-blue-50 border-blue-100">
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-1">Current Condition</p>
                  <h3 className="text-3xl font-bold text-gray-900">{data.condition}</h3>
                  <p className="text-sm text-gray-500 mt-1">{data.source}</p>
                </div>
                <CloudIcon className="h-16 w-16 text-blue-400" />
              </CardContent>
            </Card>
            <Card>
              <CardBody label="Temperature" value={`${data.temperature?.toFixed(1)}°C`} icon={<ThermometerIcon className="text-orange-500" />} />
            </Card>
            <Card>
              <CardBody label="Humidity" value={`${data.humidity}%`} icon={<DropletIcon className="text-blue-500" />} />
            </Card>
            <Card>
              <CardBody label="Rainfall" value={`${data.rainfall} mm`} icon={<CloudIcon className="text-gray-500" />} />
            </Card>
            <Card>
              <CardBody label="Wind Speed" value={`${data.windSpeed} m/s`} icon={<WindIcon className="text-teal-500" />} />
            </Card>
          </div>
        );

      case 'soil_ph':
        return (
          <div className="space-y-4 mt-4">
             <Card className={data.classification === 'Acidic' ? 'bg-red-50' : data.classification === 'Alkaline' ? 'bg-purple-50' : 'bg-green-50'}>
              <CardContent className="text-center py-8">
                <h3 className="text-5xl font-bold text-gray-900">{data.ph}</h3>
                <Badge className="mt-4 text-lg px-4 py-1">{data.classification}</Badge>
                <p className="text-sm text-gray-500 mt-4">Optimal crops for this pH:</p>
                <div className="flex justify-center gap-2 mt-2">
                    {data.optimalFor?.map((c: string) => <Badge key={c} variant="outline">{c}</Badge>)}
                </div>
              </CardContent>
            </Card>
            <p className="text-xs text-center text-gray-400">Data source: OpenLandMap via Google Earth Engine</p>
          </div>
        );

      case 'soil_moisture':
        return (
          <div className="grid grid-cols-2 gap-4 mt-4">
             <Card>
               <CardContent className="pt-6">
                 <div className="text-center">
                    <p className="text-sm font-medium text-gray-500">Surface Moisture</p>
                    <h3 className="text-2xl font-bold text-blue-700">{data.surface_moisture} mm/mm</h3>
                 </div>
               </CardContent>
             </Card>
             <Card>
               <CardContent className="pt-6">
                 <div className="text-center">
                    <p className="text-sm font-medium text-gray-500">Root Zone</p>
                    <h3 className="text-2xl font-bold text-green-700">{data.root_zone_moisture} mm/mm</h3>
                 </div>
               </CardContent>
             </Card>
             <Card className="col-span-2">
                <CardContent className="py-4 flex items-center justify-between">
                    <span className="font-medium text-gray-700">Status Assessment:</span>
                    <Badge variant={data.status === 'Adequate' ? 'default' : 'destructive'}>{data.status}</Badge>
                </CardContent>
             </Card>
          </div>
        );

      case 'ndvi':
        const chartData = {
            labels: data.timeseries?.map((d: any) => d.date) || [],
            datasets: [
              {
                label: 'NDVI (Vegetation Health)',
                data: data.timeseries?.map((d: any) => d.value) || [],
                borderColor: 'rgb(34, 197, 94)',
                backgroundColor: 'rgba(34, 197, 94, 0.5)',
              },
            ],
          };
          
        return (
            <div className="space-y-4 mt-4">
                 <div className="grid grid-cols-3 gap-2">
                    <StatCard label="Avg NDVI" value={data.average?.toFixed(2)} />
                    <StatCard label="Max" value={data.max?.toFixed(2)} />
                    <StatCard label="Health" value={data.health} />
                 </div>
                 <div className="h-64 w-full border rounded-lg p-2">
                     {data.timeseries && <Line options={{ responsive: true, maintainAspectRatio: false }} data={chartData} />}
                 </div>
            </div>
        );
        
      default:
        return <div>Select an analysis type</div>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-green-600 text-green-700 hover:bg-green-50">
           <RefreshCwIcon className="h-4 w-4" /> Analyze Farm
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Farm Analysis: {farmName || 'Farm ' + farmId.slice(-4)}</DialogTitle>
          <DialogDescription>
            Real-time geospatial and weather analysis powered by Google Earth Engine.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="weather" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="weather">Weather</TabsTrigger>
            <TabsTrigger value="soil_ph">Soil pH</TabsTrigger>
            <TabsTrigger value="soil_moisture">Moisture</TabsTrigger>
            <TabsTrigger value="ndvi">Vegetation</TabsTrigger>
          </TabsList>
          
          <div className="min-h-[300px]">
             {renderContent()}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Helper Components
function CardBody({ label, value, icon }: any) {
    return (
        <CardContent className="flex flex-col items-center justify-center p-4">
            <div className="mb-2">{icon}</div>
            <p className="text-xs text-gray-500 uppercase">{label}</p>
            <p className="text-lg font-bold text-gray-900">{value}</p>
        </CardContent>
    )
}

function StatCard({ label, value }: any) {
    return (
        <Card className="bg-slate-50">
            <CardContent className="p-3 text-center">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-lg font-bold">{value}</p>
            </CardContent>
        </Card>
    )
}

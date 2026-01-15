'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import {
  Users, Sprout, Briefcase, Map, MapPin,
  TrendingUp, PieChart as PieChartIcon, Activity, Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Colors for charts
const COLORS = ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0', '#15803d'];
const PIE_COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6'];

interface AnalyticsData {
  summary: {
    totalFarmers: number;
    totalFarms: number;
    totalAgents: number;
    totalClusters: number;
    totalArea: number;
  };
  charts: {
    gender: { name: string; value: number }[];
    crops: { name: string; value: number }[];
    states: { name: string; value: number }[];
    age: { name: string; value: number }[];
    registrations: { month: string; count: number }[];
    farmSizes: { name: string; value: number }[];
    lgas?: { name: string; value: number }[];
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [lgaData, setLgaData] = useState<{ name: string; value: number }[] | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/analytics');
        if (!res.ok) throw new Error('Failed to fetch analytics');
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        console.error(err);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch LGA data when state is specific
  const fetchLgaData = async (stateName: string) => {
    try {
      // Don't set global loading, just maybe show a spinner on the LGA part or handled by UI state
      const res = await fetch(`/api/analytics?state=${encodeURIComponent(stateName)}`);
      if (!res.ok) throw new Error('Failed to fetch LGA analytics');
      const json = await res.json();
      if (json.charts && json.charts.lgas) {
        setLgaData(json.charts.lgas);
      }
    } catch (err) {
      console.error("Failed to load LGA data", err);
    }
  };

  const handleStateClick = (data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const stateName = data.activePayload[0].payload.name;
      setSelectedState(stateName);
      setLgaData(null); // Clear previous while loading
      fetchLgaData(stateName);
    }
  };

  if (loading) {
    return (
      <div className="flex w-full h-[80vh]items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-3 text-lg font-medium text-gray-600">Loading Analytics...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center flex-col gap-4 text-red-600">
        <Activity className="h-12 w-12" />
        <p className="text-xl font-semibold">{error || 'No data available'}</p>
      </div>
    );
  }

  // Calculate some derived summary stats if needed
  const avgFarmSize = data.summary.totalFarms > 0
    ? (data.summary.totalArea / data.summary.totalFarms).toFixed(2)
    : '0';

  return (
    <div className="p-6 space-y-8 w-full mx-auto animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Project Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Real-time insights into farmers, farms, and field operations.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground bg-white px-3 py-1 rounded-md border shadow-sm">
          <Activity className="h-4 w-4 text-green-600" />
          <span>Last updated: {new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Farmers" value={data.summary.totalFarmers} icon={Users} color="text-blue-600" bg="bg-blue-50" />
        <KPICard title="Total Farms" value={data.summary.totalFarms} icon={Sprout} color="text-green-600" bg="bg-green-50" />
        <KPICard title="Total Hectares" value={data.summary.totalArea.toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' Ha'} icon={Map} color="text-emerald-600" bg="bg-emerald-50" />
        <KPICard title="Active Agents" value={data.summary.totalAgents} icon={Briefcase} color="text-purple-600" bg="bg-purple-50" />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white border p-1 h-auto">
          <TabsTrigger value="overview" className="px-4 py-2">Overview</TabsTrigger>
          <TabsTrigger value="demographics" className="px-4 py-2">Demographics</TabsTrigger>
          <TabsTrigger value="agriculture" className="px-4 py-2">Agriculture</TabsTrigger>
          <TabsTrigger value="geography" className="px-4 py-2">Geography</TabsTrigger>
        </TabsList>

        <Separator />

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Registration Trend - Wide Chart */}
            <Card className="lg:col-span-2 shadow-sm border-none ring-1 ring-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-gray-500" />
                  Registration Trend
                </CardTitle>
                <CardDescription>Farmer enrollments over time (Monthly)</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.charts.registrations}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#888888" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#888888" />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="count" stroke="#16a34a" fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Quick Stats / Secondary Chart */}
            <Card className="shadow-sm border-none ring-1 ring-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-gray-500" />
                  Gender Distribution
                </CardTitle>
                <CardDescription>Farmer demographics by gender</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.charts.gender}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {data.charts.gender.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top States Summary */}
            <Card className="shadow-sm border-none ring-1 ring-gray-200">
              <CardHeader>
                <CardTitle>Top States by Enrollment</CardTitle>
                <CardDescription>Locations with highest activity</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.states.slice(0, 5)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Crops Summary */}
            <Card className="shadow-sm border-none ring-1 ring-gray-200">
              <CardHeader>
                <CardTitle>Primary Crops</CardTitle>
                <CardDescription>Most cultivated crops across all farms</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.crops.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip cursor={{ fill: '#f4f4f5' }} />
                    <Bar dataKey="value" fill="#eab308" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Demographics Tab */}
        <TabsContent value="demographics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Age Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.age}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Gender Split</CardTitle>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.charts.gender}
                      cx="50%"
                      cy="50%"
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {data.charts.gender.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Agriculture Tab */}
        <TabsContent value="agriculture" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Farm Size Distribution</CardTitle>
                <CardDescription>Categorized by Hectares (Ha)</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.farmSizes}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Crop Variety</CardTitle>
                <CardDescription>Breakdown of all primary crops</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.crops} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: '#f4f4f5' }} />
                    <Bar dataKey="value" fill="#16a34a" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Geography Tab */}
        <TabsContent value="geography" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">State Distribution</h3>
            <div className="w-[200px]">
              <Select
                value={selectedState || undefined}
                onValueChange={(value) => {
                  setSelectedState(value);
                  setLgaData(null);
                  fetchLgaData(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a state" />
                </SelectTrigger>
                <SelectContent>
                  {data.charts.states.map((state) => (
                    <SelectItem key={state.name} value={state.name}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <Card className={selectedState ? "md:col-span-1" : "md:col-span-1"}>
              <CardHeader>
                <CardTitle>State Distribution Chart</CardTitle>
                <CardDescription>Click a bar or use the selector to view LGA breakdown</CardDescription>
              </CardHeader>
              <CardContent className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.charts.states}
                    margin={{ bottom: 100 }}
                    onClick={handleStateClick}
                    className="cursor-pointer"
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {selectedState && (
              <Card className="animate-in fade-in duration-500 slide-in-from-left-4">
                <CardHeader>
                  <CardTitle>{selectedState} - LGA Breakdown</CardTitle>
                  <CardDescription>Local Government Areas in {selectedState}</CardDescription>
                </CardHeader>
                <CardContent className="h-[500px] flex items-center justify-center">
                  {!lgaData ? (
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  ) : lgaData.length === 0 ? (
                    <p className="text-muted-foreground">No LGA data available for {selectedState}</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={lgaData} margin={{ bottom: 100 }} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPICard({ title, value, icon: Icon, color, bg }: any) {
  return (
    <Card className="shadow-sm border-none ring-1 ring-gray-200 hover:ring-2 hover:ring-primary/20 transition-all">
      <CardContent className="p-6 flex items-center gap-4">
        <div className={`h-12 w-12 rounded-full ${bg} flex items-center justify-center shrink-0`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900">{typeof value === 'number' ? value.toLocaleString() : value}</h3>
        </div>
      </CardContent>
    </Card>
  );
}

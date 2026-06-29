'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  ArrowPathIcon,
  MapPinIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Farm {
  id: string;
  farmSize: number;
  primaryCrop: string;
  farmState: string;
  farmLocalGovernment: string;
  createdAt: string;
  farmer: {
    id: string;
    firstName: string;
    lastName: string;
    nin: string;
  };
}

interface AnalyticsData {
  totalFarms: number;
  totalArea: number;
  avgSize: number;
  farmsByState: { farmState: string; _count: { id: number } }[];
  farmsByCrop: { primaryCrop: string; _count: { id: number } }[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

function FarmsContent() {
  const { status } = useSession();
  const router = useRouter();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState('all');

  const fetchAnalytics = useCallback(async () => {
    if (status !== 'authenticated') return;
    try {
      const res = await fetch('/api/farms/analytics');
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error("Failed to fetch farm analytics", err);
    }
  }, [status]);

  const fetchFarms = useCallback(async () => {
    if (status !== 'authenticated') return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      if (searchTerm) params.append('search', searchTerm);
      if (filterState && filterState !== 'all') params.append('state', filterState);

      const res = await fetch(`/api/farms?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch farms');

      const data = await res.json();
      setFarms(data.farms);
      setPagination(prev => ({ ...prev, ...data.pagination }));
    } catch (error) {
      console.error('Error fetching farms:', error);
    } finally {
      setLoading(false);
    }
  }, [status, pagination.page, pagination.limit, searchTerm, filterState]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchFarms();
      fetchAnalytics();
    }
  }, [status, router, fetchFarms, fetchAnalytics]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchFarms();
  };

  const handleReset = () => {
    setSearchTerm('');
    setFilterState('all');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  if (status === 'loading') {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6 px-1">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-lg border border-[#DCEAF3] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#013358]">FIMS Operations</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-[#1E293B]">Farm Management</h1>
          <p className="mt-1 text-[#64748B]">
            Track and manage farm lands, crops, and geographical data.
          </p>
        </div>

        <Button asChild>
          <Link href="/farms/create">
            <PlusIcon className="mr-2 h-4 w-4" />
            Add New Farm
          </Link>
        </Button>

      </div>

      {/* Analytics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-[#DCEAF3] bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wide text-[#475569]">Total Farms</CardTitle>
            <MapPinIcon className="h-4 w-4 text-[#013358]" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-[#1E293B]">{analytics?.totalFarms?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-[#DCEAF3] bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wide text-[#475569]">Total Area (Hectares)</CardTitle>
            <div className="h-2 w-2 rounded-full bg-[#3B82F6]" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-[#1E293B]">{analytics?.totalArea?.toLocaleString(undefined, { maximumFractionDigits: 1 }) || 0} Ha</div>
          </CardContent>
        </Card>

        <Card className="border-[#DCEAF3] bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wide text-[#475569]">Average Farm Size</CardTitle>
            <div className="h-2 w-2 rounded-full bg-[#10B981]" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-[#1E293B]">{analytics?.avgSize?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || 0} Ha</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-[#DCEAF3] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#1E293B]">Farms by State</CardTitle>
            <div className="text-sm text-[#64748B]">Distribution of farms across states</div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer minHeight={1} minWidth={1} width="100%" height="100%">
                <BarChart
                  data={analytics?.farmsByState.map(item => ({ name: item.farmState, value: item._count.id }))}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value" fill="#013358" radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#DCEAF3] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#1E293B]">Primary Crops</CardTitle>
            <div className="text-sm text-[#64748B]">Most common crops being cultivated</div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer minHeight={1} minWidth={1} width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics?.farmsByCrop.map(item => ({ name: item.primaryCrop, value: item._count.id }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {[
                      '#013358',
                      '#02426F',
                      '#10B981',
                      '#F59E0B',
                      '#3B82F6',
                    ].map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <Card className="border-[#DCEAF3] bg-white shadow-sm">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by farmer name or NIN..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full md:w-[200px]">
              <Select value={filterState} onValueChange={setFilterState}>
                <SelectTrigger>
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {analytics?.farmsByState.map((item) => (
                    <SelectItem key={item.farmState} value={item.farmState}>
                      {item.farmState}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">
              Filter
            </Button>
            <Button variant="outline" type="button" onClick={handleReset}>
              Reset
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-[#DCEAF3] bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Farm Details</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Farmer</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex justify-center items-center">
                    <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-500" />
                    <span className="ml-2">Loading farms...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : farms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No farms found.
                </TableCell>
              </TableRow>
            ) : (
              farms.map((farm) => (
                <TableRow key={farm.id} className="cursor-pointer">
                  <TableCell>
                    <div className="font-semibold text-[#1E293B]">{farm.primaryCrop}</div>
                    <div className="text-sm text-[#64748B]">{farm.farmSize ? `${farm.farmSize} Hectares` : 'Size Unknown'}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm text-[#64748B]">
                      <MapPinIcon className="mr-1 h-4 w-4 text-[#94A3B8]" />
                      {farm.farmState}, {farm.farmLocalGovernment}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-semibold text-[#1E293B]">{farm.farmer.firstName} {farm.farmer.lastName}</div>
                    <div className="text-xs text-[#64748B]">{farm.farmer.nin}</div>
                  </TableCell>
                  <TableCell className="text-[#64748B]">
                    {new Date(farm.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/farms/${farm.id}`}>
                          <EyeIcon className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/farms/${farm.id}/edit`}>
                          <PencilIcon className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-[#64748B]">
          Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page <= 1}
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page >= pagination.pages}
          >
            Next
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function FarmsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FarmsContent />
    </Suspense>
  );
}

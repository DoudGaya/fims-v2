'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePermissions } from '@/components/PermissionProvider';
import { PERMISSIONS } from '@/lib/permissions';
import {
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckBadgeIcon,
  XCircleIcon,
  ClockIcon,
  EllipsisHorizontalIcon
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

// Interface definitions
interface Farmer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  state: string;
  status: string;
  nin: string;
  cluster?: {
    title: string;
  };
  createdAt: string;
}

interface AnalyticsData {
  totalFarmers: number;
  farmersByStatus: Record<string, number>;
  farmersByState: { state: string; _count: { id: number } }[];
  recentRegistrations: unknown[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

function FarmersContent() {
  const { status } = useSession();
  const router = useRouter();
  const { hasPermission } = usePermissions();

  // Data States
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Batch Selection States
  const [selectedFarmers, setSelectedFarmers] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

  // Filter States
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState('all'); // 'all' or state name
  const [filterStatus, setFilterStatus] = useState('all');

  // Fetch Analytics
  const fetchAnalytics = useCallback(async () => {
    if (status !== 'authenticated') return;
    try {
      const res = await fetch('/api/farmers/analytics');
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error("Failed to fetch analytics", err);
    }
  }, [status]);

  // Fetch Farmers
  const fetchFarmers = useCallback(async () => {
    if (status !== 'authenticated') return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      if (searchTerm) params.append('search', searchTerm);
      if (filterState && filterState !== 'all') params.append('state', filterState);
      if (filterStatus && filterStatus !== 'all') params.append('status', filterStatus);

      const res = await fetch(`/api/farmers?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch farmers');

      const data = await res.json();
      setFarmers(data.farmers);
      setPagination(prev => ({ ...prev, ...data.pagination }));
    } catch (error) {
      console.error('Error fetching farmers:', error);
    } finally {
      setLoading(false);
    }
  }, [status, pagination.page, pagination.limit, searchTerm, filterState, filterStatus]);

  // Initial Load
  useEffect(() => {
    if (status === 'authenticated') {
      fetchFarmers();
      fetchAnalytics();
    }
  }, [status, fetchFarmers, fetchAnalytics]);

  // Event Handlers
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchFarmers();
  };

  const handleReset = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterState('all');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Batch Selection Handlers
  const toggleSelectAll = () => {
    if (selectedFarmers.size === farmers.length) {
      setSelectedFarmers(new Set());
    } else {
      setSelectedFarmers(new Set(farmers.map(f => f.id)));
    }
  };

  const toggleSelectFarmer = (id: string) => {
    const newSelected = new Set(selectedFarmers);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedFarmers(newSelected);
  };

  const updateFarmerStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/farmers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        // Fetch fresh data to ensure consistency
        await fetchFarmers();
        await fetchAnalytics();
      } else {
        const error = await res.json();
        console.error('Failed to update status:', error);
        alert(`Failed to update status: ${error.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error updating status', err);
      alert('Error updating farmer status. Please try again.');
    }
  };

  const batchUpdateStatus = async (newStatus: string) => {
    if (selectedFarmers.size === 0) {
      alert('Please select at least one farmer');
      return;
    }

    if (!confirm(`Update ${selectedFarmers.size} farmer(s) to status: ${newStatus}?`)) {
      return;
    }

    setBatchLoading(true);
    try {
      const res = await fetch('/api/farmers/batch-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          farmerIds: Array.from(selectedFarmers),
          status: newStatus 
        })
      });

      if (res.ok) {
        // Fetch fresh data
        await fetchFarmers();
        await fetchAnalytics();
        setSelectedFarmers(new Set());
        alert(`Successfully updated ${selectedFarmers.size} farmer(s)`);
      } else {
        const error = await res.json();
        console.error('Batch update failed:', error);
        alert(`Failed to update farmers: ${error.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error in batch update', err);
      alert('Error updating farmers. Please try again.');
    } finally {
      setBatchLoading(false);
    }
  };

  if (status === 'loading') { // Initial Auth Check
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6 px-1">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-lg border border-[#DCEAF3] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#013358]">FIMS Operations</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-[#1E293B] dark:text-white">Farmers Management</h1>
          <p className="mt-1 text-[#64748B]">
            Overview and management of registered farmers across all regions.
          </p>
        </div>
        {hasPermission(PERMISSIONS.FARMERS_CREATE) && (
          <Button asChild>
            <Link href="/farmers/create">
              <PlusIcon className="mr-2 h-4 w-4" />
              Register Farmer
            </Link>
          </Button>
        )}
      </div>

      {/* Analytics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="col-span-1 border-[#DCEAF3] bg-white shadow-sm lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wide text-[#475569]">Total Farmers</CardTitle>
            <UsersIcon className="h-4 w-4 text-[#013358]" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-[#1E293B]">{analytics?.totalFarmers?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>

        <Card className="col-span-1 border-[#DCEAF3] bg-white shadow-sm lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wide text-[#475569]">Enrolled</CardTitle>
            <div className="h-2 w-2 rounded-full bg-[#02426F]" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-[#1E293B]">{analytics?.farmersByStatus?.['Enrolled']?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>

        <Card className="col-span-1 border-[#DCEAF3] bg-white shadow-sm lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wide text-[#475569]">Farm Captured</CardTitle>
            <div className="h-2 w-2 rounded-full bg-[#3B82F6]" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-[#1E293B]">{analytics?.farmersByStatus?.['FarmCaptured']?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>

        <Card className="col-span-1 border-[#DCEAF3] bg-white shadow-sm lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wide text-[#475569]">Validated</CardTitle>
            <div className="h-2 w-2 rounded-full bg-[#F59E0B]" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-[#1E293B]">{analytics?.farmersByStatus?.['Validated']?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>

        <Card className="col-span-1 border-[#DCEAF3] bg-white shadow-sm lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wide text-[#475569]">Verified</CardTitle>
            <div className="h-2 w-2 rounded-full bg-[#10B981]" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-[#1E293B]">{analytics?.farmersByStatus?.['Verified']?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-[#DCEAF3] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#1E293B]">Registration Status</CardTitle>
            <div className="text-sm text-[#64748B]">Distribution of farmer onboarding stages</div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer minHeight={1} minWidth={1} width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Object.entries(analytics?.farmersByStatus || {}).map(([name, value]) => ({ name, value }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {Object.keys(analytics?.farmersByStatus || {}).map((entry, index) => {
                      // Map status to specific colors
                      const colors: Record<string, string> = {
                        'Enrolled': '#02426F',
                        'FarmCaptured': '#3B82F6',
                        'Validated': '#F59E0B',
                        'Verified': '#10B981',
                        'Rejected': '#EF4444',
                        'Pending': '#94A3B8',
                      };
                      return <Cell key={`cell-${index}`} fill={colors[entry] || '#94A3B8'} />;
                    })}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#DCEAF3] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#1E293B]">Top Locations</CardTitle>
            <div className="text-sm text-[#64748B]">Farmers by State</div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer minHeight={1} minWidth={1} width="100%" height="100%">
                <BarChart
                  data={analytics?.farmersByState.map(item => ({ name: item.state, value: item._count.id }))}
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
      </div>

      {/* Filters & Actions */}
      <Card className="border-[#DCEAF3] bg-white shadow-sm">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search farmers by name, phone, NIN..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full md:w-[200px]">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Enrolled">Enrolled</SelectItem>
                  <SelectItem value="FarmCaptured">Farm Captured</SelectItem>
                  <SelectItem value="Validated">Validated</SelectItem>
                  <SelectItem value="Verified">Verified</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-[200px]">
              <Select value={filterState} onValueChange={setFilterState}>
                <SelectTrigger>
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {analytics?.farmersByState.map((item) => (
                    <SelectItem key={item.state} value={item.state}>
                      {item.state}
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

      {/* Batch Actions */}
      {selectedFarmers.size > 0 && (
        <Card className="border-[#DCEAF3] bg-[#F3F8FC] shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="default">
                  {selectedFarmers.size} farmer{selectedFarmers.size !== 1 ? 's' : ''} selected
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFarmers(new Set())}
                  className="h-8"
                >
                  Clear Selection
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => batchUpdateStatus('Validated')}
                  disabled={batchLoading}
                  className="border-[#DCEAF3] bg-white hover:bg-[#F3F8FC]"
                >
                  <CheckBadgeIcon className="mr-1 h-4 w-4 text-[#F59E0B]" />
                  Validate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => batchUpdateStatus('Verified')}
                  disabled={batchLoading}
                  className="border-[#DCEAF3] bg-white hover:bg-[#F3F8FC]"
                >
                  <CheckBadgeIcon className="mr-1 h-4 w-4 text-[#10B981]" />
                  Verify
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => batchUpdateStatus('Enrolled')}
                  disabled={batchLoading}
                  className="border-[#DCEAF3] bg-white hover:bg-[#F3F8FC]"
                >
                  <ClockIcon className="mr-1 h-4 w-4 text-[#02426F]" />
                  Reset
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => batchUpdateStatus('Rejected')}
                  disabled={batchLoading}
                  className="border-[#FECACA] bg-white hover:bg-red-50"
                >
                  <XCircleIcon className="mr-1 h-4 w-4 text-[#EF4444]" />
                  Reject
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-[#DCEAF3] bg-white shadow-sm dark:bg-gray-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <input
                  type="checkbox"
                  checked={selectedFarmers.size === farmers.length && farmers.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 cursor-pointer"
                />
              </TableHead>
              <TableHead className="w-[300px]">Farmer</TableHead>
              <TableHead>ID / NIN</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex justify-center items-center">
                    <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-500" />
                    <span className="ml-2">Loading farmers...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : farmers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No farmers found.
                </TableCell>
              </TableRow>
            ) : (
              farmers.map((farmer) => (
                <TableRow
                  key={farmer.id}
                  className={`cursor-pointer ${selectedFarmers.has(farmer.id) ? 'bg-[#F3F8FC]' : ''}`}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedFarmers.has(farmer.id)}
                      onChange={() => toggleSelectFarmer(farmer.id)}
                      className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                  </TableCell>
                  <TableCell onClick={() => router.push(`/farmers/${farmer.id}`)}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3F8FC] text-sm font-bold text-[#013358]">
                        {farmer.firstName[0]}{farmer.lastName[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-[#1E293B] dark:text-gray-100">{farmer.firstName} {farmer.lastName}</div>
                        <div className="text-xs text-[#64748B]">{farmer.phone}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell onClick={() => router.push(`/farmers/${farmer.id}`)}>
                    <div className="text-sm">{farmer.nin || 'N/A'}</div>
                    <div className="text-xs font-mono text-[#64748B]">ID: {farmer.id.substring(0, 8)}...</div>
                  </TableCell>
                  <TableCell onClick={() => router.push(`/farmers/${farmer.id}`)}>
                    <div className="text-sm font-medium">{farmer.state}</div>
                    <div className="text-xs text-[#64748B]">{farmer.cluster?.title || 'No Cluster'}</div>
                  </TableCell>
                  <TableCell onClick={() => router.push(`/farmers/${farmer.id}`)}>
                    <Badge variant="outline"
                      className={`
                      ${farmer.status === 'Verified' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : ''}
                      ${farmer.status === 'Validated' ? 'border-amber-200 bg-amber-50 text-amber-800' : ''}
                      ${farmer.status === 'Enrolled' ? 'border-[#DCEAF3] bg-[#F3F8FC] text-[#013358]' : ''}
                      ${farmer.status === 'FarmCaptured' ? 'border-blue-200 bg-blue-50 text-blue-700' : ''}
                      ${farmer.status === 'Rejected' ? 'border-red-200 bg-red-50 text-red-700' : ''}
                      ${farmer.status === 'Pending' ? 'border-slate-200 bg-slate-50 text-slate-700' : ''}
                    `}
                    >
                      {farmer.status}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={() => router.push(`/farmers/${farmer.id}`)} className="text-[#64748B]">
                    {new Date(farmer.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <EllipsisHorizontalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => router.push(`/farmers/${farmer.id}`)}>
                          <EyeIcon className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                        {hasPermission(PERMISSIONS.FARMERS_UPDATE) && (
                          <>
                            <DropdownMenuItem onClick={() => router.push(`/farmers/${farmer.id}/edit`)}>
                              <PencilIcon className="mr-2 h-4 w-4" /> Edit Farmer
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => updateFarmerStatus(farmer.id, 'Validated')}>
                              <CheckBadgeIcon className="mr-2 h-4 w-4 text-indigo-600" /> Validate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFarmerStatus(farmer.id, 'Verified')}>
                              <CheckBadgeIcon className="mr-2 h-4 w-4 text-green-600" /> Verify
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFarmerStatus(farmer.id, 'Enrolled')}>
                              <ClockIcon className="mr-2 h-4 w-4 text-blue-600" /> Reset to Enrolled
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFarmerStatus(farmer.id, 'Rejected')}>
                              <XCircleIcon className="mr-2 h-4 w-4 text-red-600" /> Reject
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-gray-500 dark:text-gray-400">
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

// Icon helper
function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  );
}

export default function FarmersPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FarmersContent />
    </Suspense>
  );
}

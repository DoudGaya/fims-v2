'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/components/PermissionProvider';
import { PERMISSIONS } from '@/lib/permissions';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  UserGroupIcon,
  CheckBadgeIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function ClusterDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const [cluster, setCluster] = useState<any>(null);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 });
  const [analytics, setAnalytics] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      if (!hasPermission(PERMISSIONS.CLUSTERS_READ)) {
        router.push('/dashboard');
      } else {
        fetchClusterDetails();
      }
    }
  }, [status, router, hasPermission, id, currentPage, statusFilter]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (status === 'authenticated') fetchClusterDetails();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchClusterDetails = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '100',
        search: searchTerm,
        status: statusFilter
      });

      const res = await fetch(`/api/clusters/${id}?${queryParams}`);
      if (!res.ok) {
        throw new Error('Failed to fetch cluster details');
      }
      const data = await res.json();
      setCluster(data.cluster);
      setFarmers(data.farmers);
      setPagination(data.pagination);
      setAnalytics(data.analytics);
    } catch (error: any) {
      console.error('Error fetching cluster:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this cluster? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/clusters/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete cluster');
      }

      router.push('/clusters');
    } catch (error: any) {
      alert(error.message);
      setIsDeleting(false);
    }
  };



  // Stats
  const totalFarmers = pagination.total || 0;
  // Note: active/pending counts in the summary cards might need to come from analytics if we want them accurate globally, 
  // currently we can guess them from analytics status stats.
  const activeFarmers = analytics?.status?.find((s: any) => s.status === 'approved' || s.status === 'active')?._count?.status || 0;
  const pendingFarmers = analytics?.status?.find((s: any) => s.status === 'pending')?._count?.status || 0;

  // Chart Data Preparation from Analytics
  const statusChartData = analytics?.status?.map((s: any) => ({
    name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
    value: s._count.status
  })) || [];

  const COLORS = ['#16a34a', '#eab308', '#9ca3af'];

  // Gender Data
  const genderChartData = analytics?.gender?.map((g: any) => ({
    name: g.gender ? g.gender.charAt(0).toUpperCase() + g.gender.slice(1).toLowerCase() : 'Unknown',
    value: g._count.gender
  })).filter((item: any) => item.name === 'Male' || item.name === 'Female') || [];

  const GENDER_COLORS = ['#3b82f6', '#ec4899', '#8b5cf6', '#9ca3af'];

  // Growth Data (Farmers by Month from dates list)
  const growthChartData = analytics?.growth?.reduce((acc: any[], item: any) => {
    const date = new Date(item.createdAt);
    const monthYear = date.toLocaleString('default', { month: 'short', year: '2-digit' });

    const existing = acc.find(x => x.name === monthYear);
    if (existing) {
      existing.farmers += 1;
    } else {
      acc.push({ name: monthYear, farmers: 1, date: date });
    }
    return acc;
  }, []).sort((a: any, b: any) => a.date - b.date).slice(-6) || [];

  // Location Data
  const locationChartData = analytics?.location?.map((l: any) => ({
    name: l.lga || 'Unknown',
    farmers: l._count.lga
  })).sort((a: any, b: any) => b.farmers - a.farmers).slice(0, 5) || [];


  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error || !cluster) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded text-red-700">
          {error || 'Cluster not found'}
        </div>
        <div className="mt-4">
          <Link href="/clusters" className="text-blue-600 hover:underline">&larr; Back to Clusters</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/clusters" className="hover:text-gray-900">Clusters</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{cluster.title}</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight">{cluster.title}</h2>
          <div className="flex items-center gap-2">
            <Badge variant={cluster.isActive ? 'default' : 'secondary'} className={cluster.isActive ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-gray-100 text-gray-800"}>
              {cluster.isActive ? 'Active Cluster' : 'Inactive Cluster'}
            </Badge>
            <span className="text-sm text-gray-500">{cluster.description}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/clusters/${id}/edit`}>
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit Details
            </Link>
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Farmers</CardTitle>
            <UserGroupIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFarmers}</div>
            <p className="text-xs text-muted-foreground">Assigned to this cluster</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Farmers</CardTitle>
            <CheckBadgeIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeFarmers}</div>
            <p className="text-xs text-muted-foreground">Approved and Verified accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <ExclamationCircleIcon className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingFarmers}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="farmers">Assigned Farmers</TabsTrigger>
          <TabsTrigger value="overview">Overview & Lead Info</TabsTrigger>
        </TabsList>

        <TabsContent value="farmers" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-lg border">
            <div className="relative w-full sm:w-[300px]">
              <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search farmers..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <FunnelIcon className="h-4 w-4 mr-2 text-gray-500" />
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Farmer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {farmers.length > 0 ? (
                  farmers.map((farmer: any) => (
                    <TableRow key={farmer.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={`https://ui-avatars.com/api/?name=${farmer.firstName}+${farmer.lastName}&background=random`} />
                            <AvatarFallback>{farmer.firstName[0]}{farmer.lastName[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold">{farmer.firstName} {farmer.lastName}</div>
                            <div className="text-xs text-gray-500">{farmer.nin || 'No NIN'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{farmer.phone}</div>
                          <div className="text-gray-500 text-xs">{farmer.email || '-'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {farmer.state}, {farmer.lga}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          farmer.status === 'approved' ? 'default' :
                            farmer.status === 'pending' ? 'secondary' : 'outline'
                        } className={
                          farmer.status === 'approved' ? 'bg-green-100 text-green-800' :
                            farmer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'text-gray-600'
                        }>
                          {farmer.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(farmer.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/farmers/${farmer.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No farmers found matching your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Pagination Controls */}
          {pagination.pages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(p => Math.max(1, p - 1));
                      }}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>

                  {(() => {
                    const getPageNumbers = () => {
                      const totalPages = pagination.pages;
                      const current = currentPage;
                      const delta = 2; // Number of pages to show on each side of current
                      const range = [];
                      const rangeWithDots = [];
                      let l;

                      range.push(1);
                      for (let i = current - delta; i <= current + delta; i++) {
                        if (i < totalPages && i > 1) {
                          range.push(i);
                        }
                      }
                      range.push(totalPages);

                      for (let i of range) {
                        if (l) {
                          if (i - l === 2) {
                            rangeWithDots.push(l + 1);
                          } else if (i - l !== 1) {
                            rangeWithDots.push('...');
                          }
                        }
                        rangeWithDots.push(i);
                        l = i;
                      }
                      return rangeWithDots;
                    };

                    return getPageNumbers().map((page, index) => (
                      <PaginationItem key={index}>
                        {page === '...' ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(page as number);
                            }}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ));
                  })()}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(p => Math.min(pagination.pages, p + 1));
                      }}
                      className={currentPage === pagination.pages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          {/* Charts Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Status Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Cluster Composition</CardTitle>
                <CardDescription>Distribution of farmers by status</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusChartData.map((entry: any, index: any) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gender Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Gender Distribution</CardTitle>
                <CardDescription>Farmers by gender</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {genderChartData.map((entry: any, index: any) => (
                        <Cell key={`cell-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Growth Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Registration Trends</CardTitle>
                <CardDescription>New farmers added per month</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={growthChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
                      cursor={{ fill: 'transparent' }}
                    />
                    <Bar dataKey="farmers" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Location Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Location Trends</CardTitle>
                <CardDescription>Top LGAs in this cluster</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={locationChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
                      cursor={{ fill: 'transparent' }}
                    />
                    <Bar dataKey="farmers" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Cluster Lead Information</CardTitle>
                <CardDescription>Primary contact for this cluster</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Full Name</div>
                    <div className="text-sm">{cluster.clusterLeadFirstName} {cluster.clusterLeadLastName}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Phone</div>
                    <div className="text-sm">{cluster.clusterLeadPhone}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Email</div>
                    <div className="text-sm">{cluster.clusterLeadEmail}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">NIN</div>
                    <div className="text-sm">{cluster.clusterLeadNIN || 'N/A'}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-sm font-medium text-gray-500">Address</div>
                    <div className="text-sm">{cluster.clusterLeadAddress || 'N/A'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financial Details</CardTitle>
                <CardDescription>Banking information for disbursements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Bank Name</div>
                    <div className="text-sm">{cluster.clusterLeadBankName || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Account Number</div>
                    <div className="text-sm">{cluster.clusterLeadAccountNumber || 'N/A'}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-sm font-medium text-gray-500">Account Name</div>
                    <div className="text-sm">{cluster.clusterLeadAccountName || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">BVN</div>
                    <div className="text-sm">{cluster.clusterLeadBVN || 'N/A'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

    </div>
  );
}

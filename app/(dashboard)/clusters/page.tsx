'use client';

import { useState, useEffect, useCallback } from 'react';
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
  UserGroupIcon,
  BuildingOfficeIcon,
  UsersIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface Cluster {
  id: string;
  title: string;
  description: string;
  clusterLeadFirstName: string;
  clusterLeadLastName: string;
  clusterLeadEmail: string;
  clusterLeadPhone: string;
  isActive: boolean;
  createdAt: string;
  _count: {
    farmers: number;
  };
}

interface PageStats {
  totalClusters: number;
  activeClusters: number;
  totalFarmers: number;
  totalFarms: number;
}

interface ChartData {
  name: string;
  value: number;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

export default function ClustersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PageStats | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 0,
    totalCount: 0
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  // const [limit] = useState(50); // Fixed limit for now
  const limit = 50;

  const fetchClusters = useCallback(async () => {
    if (status !== 'authenticated') return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', pagination.currentPage.toString());
      params.append('limit', limit.toString());
      if (searchTerm) params.append('search', searchTerm);

      const res = await fetch(`/api/clusters?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403) {
          console.error('Permission denied');
        }
        throw new Error('Failed to fetch clusters');
      }

      const data = await res.json();
      setClusters(data.clusters);
      setStats(data.stats);
      setChartData(data.topClusters || []);
      setPagination({
        currentPage: data.currentPage,
        totalPages: data.totalPages,
        totalCount: data.totalCount
      });
    } catch (error) {
      console.error('Error fetching clusters:', error);
    } finally {
      setLoading(false);
    }
  }, [status, pagination.currentPage, limit, searchTerm]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      if (!hasPermission(PERMISSIONS.CLUSTERS_READ)) {
        router.push('/dashboard');
      } else {
        fetchClusters();
      }
    }
  }, [status, router, fetchClusters, hasPermission]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    fetchClusters();
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
    }
  };

  const CHART_COLORS = ['#16a34a', '#2563eb', '#ea580c', '#db2777', '#7c3aed'];

  if (status === 'loading') {
    return <div className="p-8 text-center text-gray-500">Loading cluster data...</div>;
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Cluster Management</h1>
          <p className="text-gray-500">Monitor cluster performance and manage leads.</p>
        </div>
        <Link href="/clusters/create">
          <Button className="bg-green-600 hover:bg-green-700 text-white gap-2">
            <PlusIcon className="h-4 w-4" />
            New Cluster
          </Button>
        </Link>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clusters</CardTitle>
              <UserGroupIcon className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClusters}</div>
              <p className="text-xs text-gray-500">{stats.activeClusters} Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Farmers</CardTitle>
              <UsersIcon className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFarmers.toLocaleString()}</div>
              <p className="text-xs text-gray-500">Across all clusters</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Farms</CardTitle>
              <BuildingOfficeIcon className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFarms.toLocaleString()}</div>
              <p className="text-xs text-gray-500">Registered assets</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Data Integrity</CardTitle>
              <ChartBarIcon className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">98%</div>
              <p className="text-xs text-gray-500">Completion rate</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content: Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search clusters..."
                className="pl-9 bg-gray-50 border-gray-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => {
              setSearchTerm('');
              setPagination(prev => ({ ...prev, currentPage: 1 }));
              setTimeout(fetchClusters, 0);
            }}>
              <ArrowPathIcon className="h-4 w-4" />
            </Button>
            <Button onClick={handleSearch} variant="secondary">Message</Button> {/* Placeholder for bulk action */}
          </div>

          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            {!loading && clusters.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <p>No clusters found matching your criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 font-medium">Cluster Name</th>
                      <th className="px-6 py-3 font-medium">Lead</th>
                      <th className="px-6 py-3 font-medium">Farmers</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {clusters.map((cluster) => (
                      <tr key={cluster.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {cluster.title}
                          <div className="text-xs text-gray-500 font-normal truncate max-w-[200px]">{cluster.description}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          <div>{cluster.clusterLeadFirstName} {cluster.clusterLeadLastName}</div>
                          <div className="text-xs text-gray-400">{cluster.clusterLeadPhone}</div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="secondary" className="font-normal text-gray-600">
                            {cluster._count.farmers}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={cluster.isActive ? 'default' : 'destructive'} className={cluster.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200 shadow-none border-0' : ''}>
                            {cluster.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                              <Link href={`/clusters/${cluster.id}`}>
                                <EyeIcon className="h-4 w-4 text-gray-500" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                              <Link href={`/clusters/${cluster.id}/edit`}>
                                <PencilIcon className="h-4 w-4 text-blue-500" />
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-100">
                <div className="text-xs text-gray-500">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar / Chart */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Clusters</CardTitle>
              <CardDescription>By Registered Farmers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} orientation="left" />
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-100">
            <CardHeader>
              <CardTitle className="text-blue-900">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full bg-white text-blue-700 hover:bg-blue-50 border border-blue-200 shadow-sm justify-start" variant="outline">
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Sync All Clusters
              </Button>
              <Button className="w-full bg-white text-blue-700 hover:bg-blue-50 border border-blue-200 shadow-sm justify-start" variant="outline">
                <UsersIcon className="h-4 w-4 mr-2" />
                Manage Leads
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

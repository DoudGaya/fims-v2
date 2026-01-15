'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/components/PermissionProvider';
import { PERMISSIONS } from '@/lib/permissions';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisHorizontalIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  MapPinIcon,
  InboxArrowDownIcon,
  PhoneIcon,
  ArrowDownTrayIcon
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

interface Agent {
  id: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  isActive: boolean;
  lastLogin: string;
  createdAt: string;
  _count: {
    farmers: number;
  };
  agent: {
    state: string;
    localGovernment: string;
    assignedState: string;
    assignedLGA: string;
    status: string;
  } | null;
}

interface AnalyticsData {
  totalAgents: number;
  activeAgents: number;
  inactiveAgents: number;
  newApplications: number;
  interviewing: number;
  agentsByStatus: Record<string, number>;
  agentsByState: { state: string; count: number }[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function AgentsClient() {
  const { status } = useSession();
  const { hasPermission } = usePermissions();
  const router = useRouter();

  // Data States
  const [agents, setAgents] = useState<Agent[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Filter States
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Fetch Analytics
  const fetchAnalytics = useCallback(async () => {
    if (status !== 'authenticated') return;
    setAnalyticsLoading(true);
    try {
      const res = await fetch('/api/agents/analytics');
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error("Failed to fetch analytics", err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [status]);

  // Fetch Agents
  const fetchAgents = useCallback(async () => {
    if (status !== 'authenticated') return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      if (search) params.append('search', search);
      if (filterStatus && filterStatus !== 'all') params.append('status', filterStatus);

      const res = await fetch(`/api/agents?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch agents');

      const data = await res.json();
      setAgents(data.agents);
      setPagination(prev => ({ ...prev, ...data.pagination }));
    } catch (err) {
      console.error('Error loading agents', err);
    } finally {
      setLoading(false);
    }
  }, [status, pagination.page, pagination.limit, search, filterStatus]);

  // Initial Load
  useEffect(() => {
    fetchAgents();
    fetchAnalytics();
  }, [fetchAgents, fetchAnalytics]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchAgents();
  };

  const handleReset = () => {
    setSearch('');
    setFilterStatus('all');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agent? This action cannot be undone.')) {
      return;
    }

    setDeleting(id);
    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete agent');
      }

      fetchAgents();
      fetchAnalytics(); // Refresh stats
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  };


  const handleExport = async () => {
    try {
      setDownloading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterStatus && filterStatus !== 'all') params.append('status', filterStatus);

      const response = await fetch(`/api/agents/export?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agents_report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    // Optimistic updat or simple loading? simple loading for now
    if (!confirm(`Are you sure you want to change status to "${newStatus}"? This will send an email to the agent.`)) return;

    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, isActive: newStatus === 'Enrolled' || newStatus === 'active' })
      });

      if (!res.ok) throw new Error('Failed to update status');

      // Refresh
      fetchAgents();
      fetchAnalytics();
      alert(`Status updated to ${newStatus}`);
    } catch (error) {
      console.error(error);
      alert('Failed to update status');
    }
  };

  if (status === 'loading') {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const getStatusBadge = (agent: Agent) => {
    const status = agent.agent?.status || (agent.isActive ? 'active' : 'inactive');

    switch (status.toLowerCase()) {
      case 'active':
      case 'enrolled':
        return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200">Active</Badge>;
      case 'applied':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200">New Application</Badge>;
      case 'callforinterview':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200">Interviewing</Badge>;
      case 'accepted':
        return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200">Onboarding</Badge>;
      case 'rejected':
      case 'inactive':
        return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-200">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 px-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Agents Management</h1>
          <p className="text-muted-foreground mt-1">
            Recruit, onboard, and manage field agents.
          </p>
        </div>
        {hasPermission(PERMISSIONS.AGENTS_CREATE) && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={downloading}
            >
              <ArrowDownTrayIcon className={`mr-2 h-4 w-4 ${downloading ? 'animate-bounce' : ''}`} />
              {downloading ? 'Generating...' : 'Generate Report'}
            </Button>
            <Button asChild className="bg-ccsa-blue hover:bg-blue-800">
              <Link href="/agents/new">
                <PlusIcon className="mr-2 h-4 w-4" />
                Add Agent
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Analytics Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="col-span-1 border-blue-200 bg-blue-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
            <CardTitle className="text-xs font-medium text-blue-800">Applications</CardTitle>
            <InboxArrowDownIcon className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold text-blue-900">
              {analyticsLoading ? '...' : analytics?.newApplications || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 border-yellow-200 bg-yellow-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
            <CardTitle className="text-xs font-medium text-yellow-800">Interviewing</CardTitle>
            <PhoneIcon className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold text-yellow-900">
              {analyticsLoading ? '...' : analytics?.interviewing || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 border-green-200 bg-green-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
            <CardTitle className="text-xs font-medium text-green-800">Active</CardTitle>
            <CheckCircleIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold text-green-900">
              {analyticsLoading ? '...' : analytics?.activeAgents || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 border-gray-200 bg-gray-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
            <CardTitle className="text-xs font-medium text-gray-800">Total</CardTitle>
            <UserIcon className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold text-gray-900">
              {analyticsLoading ? '...' : analytics?.totalAgents || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-1 border-red-200 bg-red-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
            <CardTitle className="text-xs font-medium text-red-800">Inactive</CardTitle>
            <XCircleIcon className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold text-red-900">
              {analyticsLoading ? '...' : analytics?.inactiveAgents || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Application Status</CardTitle>
            <div className="text-sm text-gray-500">Distribution of agent recruitment pipeline</div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Object.entries(analytics?.agentsByStatus || {}).map(([name, value]) => ({ name, value }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {Object.keys(analytics?.agentsByStatus || {}).map((entry, index) => {
                      const colors: Record<string, string> = {
                        'active': '#22c55e', // green
                        'Enrolled': '#22c55e',
                        'Applied': '#3b82f6', // blue
                        'CallForInterview': '#eab308', // yellow
                        'Accepted': '#6366f1', // indigo
                        'rejected': '#ef4444',
                        'inactive': '#9ca3af',
                        'pending': '#94a3b8' // slate-400
                      };
                      return <Cell key={`cell-${index}`} fill={colors[entry] || '#94a3b8'} />;
                    })}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Assignments</CardTitle>
            <div className="text-sm text-gray-500">Agents by Assigned State</div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics?.agentsByState?.map(item => ({ name: item.state, value: item.count })) || []}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full md:w-[200px]">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Applied">New Applications</SelectItem>
                  <SelectItem value="CallForInterview">Interviewing</SelectItem>
                  <SelectItem value="Accepted">Onboarding</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="bg-ccsa-blue hover:bg-blue-800">
              Filter
            </Button>
            <Button variant="outline" type="button" onClick={handleReset}>
              Reset
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="rounded-md border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50">
              <TableHead>Agent</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Performance</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex justify-center items-center">
                    <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-500" />
                    <span className="ml-2">Loading agents...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : agents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No agents found.
                </TableCell>
              </TableRow>
            ) : (
              agents.map((agent) => (
                <TableRow key={agent.id} className="hover:bg-gray-50/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                        {agent.displayName?.substring(0, 2).toUpperCase() || <UserIcon className="h-5 w-5" />}
                      </div>
                      <div>
                        <Link href={`/agents/${agent.id}`} className="font-medium text-gray-900 hover:underline">
                          {agent.displayName}
                        </Link>
                        <div className="text-xs text-gray-500">{agent.email}</div>
                        <div className="text-xs text-gray-500">{agent.phoneNumber}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {agent.agent?.assignedState ? (
                      <div>
                        <div className="text-sm font-medium">{agent.agent.assignedState}</div>
                        <div className="text-xs text-gray-500">{agent.agent.assignedLGA || 'No LGA'}</div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm font-medium">{agent.agent?.state || <span className="text-gray-400 italic">N/A</span>}</div>
                        <div className="text-xs text-gray-500">{agent.agent?.localGovernment || ''}</div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(agent)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium">{agent._count.farmers}</div>
                      <span className="text-xs text-muted-foreground">Farmers</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm">
                    {new Date(agent.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <EllipsisHorizontalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => router.push(`/agents/${agent.id}`)}>
                          <PencilIcon className="mr-2 h-4 w-4" />
                          View/Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                        {hasPermission(PERMISSIONS.AGENTS_UPDATE) && (
                          <>
                            <DropdownMenuItem onClick={() => handleStatusChange(agent.id, 'CallForInterview')}>
                              <PhoneIcon className="mr-2 h-4 w-4" />
                              Call For Interview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(agent.id, 'Accepted')}>
                              <CheckCircleIcon className="mr-2 h-4 w-4 text-green-600" />
                              Accept Application
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(agent.id, 'Rejected')}>
                              <XCircleIcon className="mr-2 h-4 w-4 text-red-600" />
                              Reject Application
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(agent.id, 'Enrolled')}>
                              <UserIcon className="mr-2 h-4 w-4 text-blue-600" />
                              Enroll / Activate
                            </DropdownMenuItem>
                          </>
                        )}
                        {hasPermission(PERMISSIONS.AGENTS_DELETE) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600 cursor-pointer"
                              onClick={() => handleDelete(agent.id)}
                            >
                              <TrashIcon className="mr-2 h-4 w-4" /> Delete Agent
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
        <div className="text-sm text-gray-500">
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

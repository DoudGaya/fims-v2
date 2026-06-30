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
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface Agent {
  id: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  role: string;
  isActive: boolean;
  lastLogin: string;
  createdAt: string;
  surveyCount: number;
  _count: {
    farmers: number;
  };
  agent: {
    state: string;
    localGovernment: string;
    assignedState: string;
    assignedLGA: string;
    status: string;
    nin?: string;
    gender?: string;
    employmentStatus?: string;
    totalFarmersRegistered?: number;
    performanceRating?: number | null;
  } | null;
}

interface AnalyticsData {
  totalAgents: number;
  activeAgents: number;
  inactiveAgents: number;
  newApplications: number;
  interviewing: number;
  enrollmentCount: number;
  correctionCount: number;
  surveyCount: number;
  agentsByStatus: Record<string, number>;
  agentsByState: { state: string; count: number }[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

type LocationOption = string | { name?: string | null };

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const getLocationName = (location: LocationOption) =>
  typeof location === 'string' ? location : location.name || '';

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
  const [error, setError] = useState<string | null>(null);

  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

  // Filter States
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [filterState, setFilterState] = useState('');
  const [filterLGA, setFilterLGA] = useState('');
  const [filterCluster, setFilterCluster] = useState('all');
  const [locations, setLocations] = useState<{ states: string[], lgas: Record<string, string[]> }>({ states: [], lgas: {} });

  // Fetch Locations
  useEffect(() => {
    // This is a placeholder. In a real app, you'd fetch this from the API
    // For now, we will just use a hardcoded list or empty
    // Ideally call /api/locations/states and similar
     const fetchLocations = async () => {
        try {
          const res = await fetch('/api/locations/states');
          if (res.ok) {
            const data = await res.json();
            
            let statesList: string[] = [];
            
            if (Array.isArray(data)) {
                statesList = data.map((state: LocationOption) => getLocationName(state)).filter(Boolean);
            } else if (data.states && Array.isArray(data.states)) {
                statesList = data.states.map((state: LocationOption) => getLocationName(state)).filter(Boolean);
            }

            setLocations(prev => ({ ...prev, states: statesList }));
          }
        } catch (e) { console.error(e) }
     };
     fetchLocations();
  }, []);

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
      if (filterType && filterType !== 'all') params.append('roleType', filterType);
      if (filterState && filterState !== 'all') params.append('state', filterState);
      if (filterLGA) params.append('lga', filterLGA);
      if (filterCluster && filterCluster !== 'all') params.append('cluster', filterCluster);

      if (dateRange.from) params.append('startDate', dateRange.from.toISOString());
      if (dateRange.to) params.append('endDate', dateRange.to.toISOString());

      const res = await fetch(`/api/agents?${params.toString()}`);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.details || errData.error || 'Failed to fetch agents');
      }

      const data = await res.json();
      setAgents(data.agents);
      setPagination(prev => ({ ...prev, ...data.pagination }));
      setError(null);
    } catch (err: unknown) {
      console.error('Error loading agents', err);
      setError(getErrorMessage(err, 'An error occurred while fetching agents'));
    } finally {
      setLoading(false);
    }
  }, [status, pagination.page, pagination.limit, search, filterStatus, filterType, filterState, filterLGA, filterCluster, dateRange]);

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
    setFilterType('all');
    setFilterState('all');
    setFilterLGA('');
    setFilterCluster('all');
    setDateRange({ from: undefined, to: undefined });
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
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to delete agent'));
    } finally {
      setDeleting(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (agents.every(a => selectedIds.has(a.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(agents.map(a => a.id)));
    }
  };

  const handleBatchAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    const label = action === 'delete' ? 'permanently delete' : action;
    if (!confirm(`${label.charAt(0).toUpperCase() + label.slice(1)} ${selectedIds.size} agent(s)?`)) return;
    setBatchLoading(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), action }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Batch action failed'); }
      setSelectedIds(new Set());
      fetchAgents();
      fetchAnalytics();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Batch action failed'));
    } finally {
      setBatchLoading(false);
    }
  };


  const handleExport = async () => {
    try {
      setDownloading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterStatus && filterStatus !== 'all') params.append('status', filterStatus);
      if (filterType && filterType !== 'all') params.append('roleType', filterType);
      if (filterState && filterState !== 'all') params.append('state', filterState);
      if (filterLGA) params.append('lga', filterLGA);
      if (filterCluster && filterCluster !== 'all') params.append('cluster', filterCluster);
      if (dateRange.from) params.append('startDate', dateRange.from.toISOString());
      if (dateRange.to) params.append('endDate', dateRange.to.toISOString());

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

  if (status === 'loading') {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const getRoleTypeBadge = (role: string) => {
    switch (role) {
      case 'agent':
        return <Badge className="border-[#DCEAF3] bg-[#F3F8FC] text-[#013358] hover:bg-[#DCEAF3]">Enrollment</Badge>;
      case 'data_correction_agent':
        return <Badge className="border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100">Correction</Badge>;
      case 'survey_agent':
        return <Badge className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100">Survey</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getStatusBadge = (agent: Agent) => {
    const status = agent.agent?.status || (agent.isActive ? 'active' : 'inactive');

    switch (status.toLowerCase()) {
      case 'active':
      case 'enrolled':
        return <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100">Active</Badge>;
      case 'applied':
        return <Badge className="border-[#DCEAF3] bg-[#F3F8FC] text-[#013358] hover:bg-[#DCEAF3]">New Application</Badge>;
      case 'callforinterview':
        return <Badge className="border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100">Interviewing</Badge>;
      case 'accepted':
        return <Badge className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100">Onboarding</Badge>;
      case 'rejected':
      case 'inactive':
        return <Badge className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-lg border border-[#DCEAF3] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#013358]">FIMS Workforce</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-[#1E293B] dark:text-white">Agents Management</h1>
          <p className="mt-1 text-[#64748B]">
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
            <Button asChild>
              <Link href="/agents/new">
                <PlusIcon className="mr-2 h-4 w-4" />
                Add Agent
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Analytics Cards */}
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-8">
        <Card className="col-span-1 border-[#DCEAF3] bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wide text-[#475569]">Applications</CardTitle>
            <InboxArrowDownIcon className="h-4 w-4 text-[#02426F]" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold text-[#1E293B]">
              {analyticsLoading ? '...' : analytics?.newApplications || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 border-[#DCEAF3] bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wide text-[#475569]">Interviewing</CardTitle>
            <PhoneIcon className="h-4 w-4 text-[#F59E0B]" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold text-[#1E293B]">
              {analyticsLoading ? '...' : analytics?.interviewing || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 border-[#DCEAF3] bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wide text-[#475569]">Active</CardTitle>
            <CheckCircleIcon className="h-4 w-4 text-[#10B981]" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold text-[#1E293B]">
              {analyticsLoading ? '...' : analytics?.activeAgents || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 border-[#DCEAF3] bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wide text-[#475569]">Total</CardTitle>
            <UserIcon className="h-4 w-4 text-[#013358]" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold text-[#1E293B]">
              {analyticsLoading ? '...' : analytics?.totalAgents || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-1 border-[#DCEAF3] bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wide text-[#475569]">Inactive</CardTitle>
            <XCircleIcon className="h-4 w-4 text-[#EF4444]" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold text-[#1E293B]">
              {analyticsLoading ? '...' : analytics?.inactiveAgents || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 border-[#DCEAF3] bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wide text-[#475569]">Enrollment</CardTitle>
            <UserIcon className="h-4 w-4 text-[#02426F]" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold text-[#1E293B]">
              {analyticsLoading ? '...' : analytics?.enrollmentCount || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 border-[#DCEAF3] bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wide text-[#475569]">Correction</CardTitle>
            <PencilIcon className="h-4 w-4 text-[#F59E0B]" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold text-[#1E293B]">
              {analyticsLoading ? '...' : analytics?.correctionCount || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 border-[#DCEAF3] bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wide text-[#475569]">Survey</CardTitle>
            <CheckCircleIcon className="h-4 w-4 text-[#3B82F6]" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold text-[#1E293B]">
              {analyticsLoading ? '...' : analytics?.surveyCount || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-[#DCEAF3] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#1E293B]">Application Status</CardTitle>
            <div className="text-sm text-[#64748B]">Distribution of agent recruitment pipeline</div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer minHeight={1} minWidth={1} width="100%" height="100%">
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
                        'active': '#10B981',
                        'Enrolled': '#10B981',
                        'Applied': '#02426F',
                        'CallForInterview': '#F59E0B',
                        'Accepted': '#3B82F6',
                        'rejected': '#EF4444',
                        'inactive': '#94A3B8',
                        'pending': '#8EBAD4'
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
            <CardTitle className="text-[#1E293B]">Top Assignments</CardTitle>
            <div className="text-sm text-[#64748B]">Agents by Assigned State</div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer minHeight={1} minWidth={1} width="100%" height="100%">
                <BarChart
                  data={analytics?.agentsByState?.map(item => ({ name: item.state, value: item.count })) || []}
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
          {error && (
            <div className="mb-4 p-4 text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-700 flex justify-between items-center">
              <div>
                <p className="font-medium">Error loading agents</p>
                <p className="text-sm">{error}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-white border-red-300 text-red-700 hover:bg-red-50"
                onClick={() => { setError(null); fetchAgents(); }}
              >
                Retry
              </Button>
            </div>
          )}
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 flex-wrap">
            <div className="flex-1 relative min-w-52">
              <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[170px] justify-start text-left font-normal",
                    !dateRange.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? format(dateRange.from, "LLL dd, y") : <span>Start Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange.from}
                  onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[170px] justify-start text-left font-normal",
                    !dateRange.to && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.to ? format(dateRange.to, "LLL dd, y") : <span>End Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange.to}
                  onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <div className="w-full md:w-[180px]">
              <Select value={filterState} onValueChange={setFilterState}>
                <SelectTrigger>
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {locations.states.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            <div className="w-full md:w-[180px]">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="enrollment">Enrollment</SelectItem>
                  <SelectItem value="correction">Correction</SelectItem>
                  <SelectItem value="survey">Survey</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-60">
              <Select value={filterCluster} onValueChange={setFilterCluster}>
                <SelectTrigger>
                  <SelectValue placeholder="Cluster" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clusters</SelectItem>
                  <SelectItem value="Audu Bako">Audu Bako College, Kano</SelectItem>
                  <SelectItem value="OYSCATECH">OYSCATECH, Oyo</SelectItem>
                  <SelectItem value="Adamawa State College">Adamawa State College</SelectItem>
                  <SelectItem value="College of Agriculture, Science">CAST, Lafia</SelectItem>
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
      <div className="overflow-hidden rounded-lg border border-[#DCEAF3] bg-white shadow-sm dark:bg-gray-900">
        {/* Batch action bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 border-b border-[#DCEAF3] bg-[#F3F8FC] px-4 py-2">
            <span className="text-sm font-semibold text-[#013358]">{selectedIds.size} selected</span>
            <Button size="sm" variant="outline" disabled={batchLoading} onClick={() => handleBatchAction('activate')}>Activate</Button>
            <Button size="sm" variant="outline" disabled={batchLoading} onClick={() => handleBatchAction('deactivate')}>Deactivate</Button>
            {hasPermission(PERMISSIONS.AGENTS_DELETE) && (
              <Button size="sm" variant="destructive" disabled={batchLoading} onClick={() => handleBatchAction('delete')}>Delete</Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={agents.length > 0 && agents.every(a => selectedIds.has(a.id))}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>NIN</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Performance</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                    <div className="flex justify-center items-center">
                      <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-500" />
                      <span className="ml-2">Loading agents...</span>
                    </div>
                  </TableCell>
              </TableRow>
            ) : agents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                  No agents found.
                </TableCell>
              </TableRow>
            ) : (
              agents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(agent.id)}
                      onCheckedChange={() => toggleSelect(agent.id)}
                      aria-label={`Select ${agent.displayName}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3F8FC] text-xs font-bold text-[#013358]">
                        {agent.displayName?.substring(0, 2).toUpperCase() || <UserIcon className="h-5 w-5" />}
                      </div>
                      <div>
                        <Link href={`/agents/${agent.id}`} className="font-semibold text-[#1E293B] hover:text-[#02426F] hover:underline dark:text-gray-100">
                          {agent.displayName}
                        </Link>
                        <div className="text-xs text-[#64748B]">{agent.email}</div>
                        <div className="mt-0.5 font-mono text-xs text-[#94A3B8]">
                          {agent.phoneNumber && !agent.phoneNumber.startsWith('temp_') ? agent.phoneNumber : <span className="italic opacity-50">No Phone</span>}
                        </div>
                        {agent.agent?.employmentStatus && (
                          <span className="mt-0.5 inline-flex items-center rounded-full border border-[#DCEAF3] bg-[#F3F8FC] px-1.5 py-0.5 text-[10px] text-[#013358]">
                            {agent.agent.employmentStatus}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-[#64748B]">
                    {agent.agent?.nin ? agent.agent.nin : <span className="text-gray-300">-</span>}
                  </TableCell>
                   <TableCell className="text-sm">
                    {agent.agent?.gender || <span className="text-gray-300">-</span>}
                  </TableCell>
                  <TableCell>
                    {agent.agent?.assignedState ? (
                      <div>
                        <div className="text-sm font-semibold text-[#1E293B]">{agent.agent.assignedState}</div>
                        <div className="text-xs text-[#64748B]">{agent.agent.assignedLGA || '-'}</div>
                      </div>
                    ) : (
                      <div className="opacity-60">
                         <div className="text-sm">{agent.agent?.state || 'Unassigned'}</div>
                         <div className="text-xs text-[#94A3B8]">{agent.agent?.localGovernment}</div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(agent)}
                  </TableCell>
                  <TableCell>
                    {getRoleTypeBadge(agent.role)}
                  </TableCell>
                  <TableCell>
                    {agent.role === 'agent' && (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-[#013358]">{agent._count.farmers}</span>
                          <span className="text-xs text-muted-foreground">enrolled</span>
                        </div>
                        {agent.agent?.performanceRating != null && (
                          <div className="text-[11px] text-gray-400">{agent.agent.performanceRating.toFixed(1)} / 5.0</div>
                        )}
                      </div>
                    )}
                    {agent.role === 'data_correction_agent' && (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">{agent.agent?.totalFarmersRegistered ?? 0}</span>
                          <span className="text-xs text-muted-foreground">corrected</span>
                        </div>
                        {agent.agent?.performanceRating != null && (
                          <div className="text-[11px] text-gray-400">{agent.agent.performanceRating.toFixed(1)} / 5.0</div>
                        )}
                      </div>
                    )}
                    {agent.role === 'survey_agent' && (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-[#3B82F6]">{agent.surveyCount}</span>
                          <span className="text-xs text-muted-foreground">surveys</span>
                        </div>
                        {agent.agent?.performanceRating != null && (
                          <div className="text-[11px] text-gray-400">{agent.agent.performanceRating.toFixed(1)} / 5.0</div>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-[#64748B]">
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
                        {hasPermission(PERMISSIONS.AGENTS_DELETE) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600 cursor-pointer"
                              onClick={() => handleDelete(agent.id)}
                              disabled={deleting === agent.id}
                            >
                              <TrashIcon className="mr-2 h-4 w-4" /> {deleting === agent.id ? 'Deleting...' : 'Delete Agent'}
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

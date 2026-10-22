'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { ZoraAccessButton } from '@/components/ZoraAccessButton';
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
  UserGroupIcon,
  HomeIcon,
  ClipboardDocumentCheckIcon,
  BuildingStorefrontIcon,
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
  householdCount?: number;
  correctionCount: number;
  surveyCount: number;
  agriBusinessCount?: number;
  agentsByStatus: Record<string, number>;
  agentsByState: { state: string; count: number }[];
}

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT - Abuja', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara'
];

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
  const [locations, setLocations] = useState<{ states: string[], lgas: Record<string, string[]> }>({ states: NIGERIAN_STATES, lgas: {} });

  // Fetch Locations
  useEffect(() => {
     const fetchLocations = async () => {
        try {
          const res = await fetch('/api/locations/states');
          if (res.ok) {
            const data = await res.json();
            
            let rawList: any[] = [];
            if (Array.isArray(data)) rawList = data;
            else if (Array.isArray(data.data)) rawList = data.data;
            else if (Array.isArray(data.states)) rawList = data.states;

            const extracted = rawList
              .map((state: LocationOption) => getLocationName(state).trim())
              .filter(Boolean)
              .map(name => name.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()));

            const combined = Array.from(new Set([...NIGERIAN_STATES, ...extracted])).sort((a, b) => a.localeCompare(b));
            setLocations(prev => ({ ...prev, states: combined }));
          }
        } catch (e) {
          console.error('Error fetching states:', e);
        }
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
        return <Badge className="border-[#DCEAF3] bg-[#F3F8FC] text-[#013358] hover:bg-[#DCEAF3]">Farmer Enrollment</Badge>;
      case 'household_agent':
        return <Badge className="border-teal-200 bg-teal-50 text-blue-800 hover:bg-teal-100">Household</Badge>;
      case 'data_correction_agent':
        return <Badge className="border-amber-200 bg-amber-50 text-blue-900 hover:bg-amber-100">Correction</Badge>;
      case 'survey_agent':
        return <Badge className="border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100">Survey</Badge>;
      case 'agri_business_agent':
        return <Badge className="border-indigo-200 bg-indigo-50 text-blue-900 hover:bg-indigo-100">Agri-Business</Badge>;
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
      <div className="flex flex-col gap-4 rounded-lg border border-[#DCEAF3] dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#013358] dark:text-blue-400">FIMS Workforce</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-[#1E293B] dark:text-white">Agents Management</h1>
          <p className="mt-1 text-[#64748B] dark:text-gray-400">
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
              <Link href="/agents/create">
                <PlusIcon className="mr-2 h-4 w-4" />
                Add Agent
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Workforce & Lifecycle Metrics */}
      {/* Workforce & Lifecycle Metrics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-gray-400">
            Workforce Status &amp; Recruitment Pipeline
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4" style={{ gap: '1rem' }}>
          <Card className="border-[#DCEAF3] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow transition-shadow p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-gray-400">Total Workforce</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#013358]/10 text-[#013358] dark:bg-blue-900/30 dark:text-blue-300">
                <UserGroupIcon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-[#1E293B] dark:text-gray-100">
                {analyticsLoading ? '...' : analytics?.totalAgents || 0}
              </div>
              <p className="text-[11px] text-[#94A3B8] dark:text-gray-500 mt-0.5">Registered field agents</p>
            </div>
          </Card>

          <Card className="border-[#DCEAF3] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow transition-shadow p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-gray-400">Active Deployed</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CheckCircleIcon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {analyticsLoading ? '...' : analytics?.activeAgents || 0}
              </div>
              <p className="text-[11px] text-[#94A3B8] dark:text-gray-500 mt-0.5">Operational in field</p>
            </div>
          </Card>

          <Card className="border-[#DCEAF3] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow transition-shadow p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-gray-400">Inactive / Paused</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                <XCircleIcon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-rose-700 dark:text-rose-400">
                {analyticsLoading ? '...' : analytics?.inactiveAgents || 0}
              </div>
              <p className="text-[11px] text-[#94A3B8] dark:text-gray-500 mt-0.5">Suspended or dormant</p>
            </div>
          </Card>

          <Card className="border-[#DCEAF3] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow transition-shadow p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-gray-400">Applications</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                <InboxArrowDownIcon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-[#1E293B] dark:text-gray-100">
                {analyticsLoading ? '...' : analytics?.newApplications || 0}
              </div>
              <p className="text-[11px] text-[#94A3B8] dark:text-gray-500 mt-0.5">Awaiting vetting</p>
            </div>
          </Card>

          <Card className="border-[#DCEAF3] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow transition-shadow p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-gray-400">Interviewing</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                <PhoneIcon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {analyticsLoading ? '...' : analytics?.interviewing || 0}
              </div>
              <p className="text-[11px] text-[#94A3B8] dark:text-gray-500 mt-0.5">Interview stage</p>
            </div>
          </Card>
        </div>

        {/* Deployments by Specialization */}
        <div className="pt-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-gray-400 mb-3">
            Agent Specializations &amp; Deployments
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4" style={{ gap: '1rem' }}>
            <Card className="border-[#DCEAF3] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow transition-shadow p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-gray-400">Farmer Enrollment</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#013358]/10 text-[#013358] dark:bg-blue-900/30 dark:text-blue-300">
                  <UserIcon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-[#013358] dark:text-blue-300">
                  {analyticsLoading ? '...' : analytics?.enrollmentCount || 0}
                </div>
                <p className="text-[11px] text-[#94A3B8] dark:text-gray-500 mt-0.5">Farmer &amp; farm capture</p>
              </div>
            </Card>

            <Card className="border-[#DCEAF3] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow transition-shadow p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-gray-400">Household Capture</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
                  <HomeIcon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-teal-700 dark:text-teal-300">
                  {analyticsLoading ? '...' : analytics?.householdCount || 0}
                </div>
                <p className="text-[11px] text-[#94A3B8] dark:text-gray-500 mt-0.5">Intervention households</p>
              </div>
            </Card>

            <Card className="border-[#DCEAF3] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow transition-shadow p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-gray-400">Field Survey</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                  <ClipboardDocumentCheckIcon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {analyticsLoading ? '...' : analytics?.surveyCount || 0}
                </div>
                <p className="text-[11px] text-[#94A3B8] dark:text-gray-500 mt-0.5">Surveys &amp; questionnaires</p>
              </div>
            </Card>

            <Card className="border-[#DCEAF3] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow transition-shadow p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-gray-400">Data Correction</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  <PencilIcon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                  {analyticsLoading ? '...' : analytics?.correctionCount || 0}
                </div>
                <p className="text-[11px] text-[#94A3B8] dark:text-gray-500 mt-0.5">Audit &amp; corrections</p>
              </div>
            </Card>

            <Card className="border-[#DCEAF3] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow transition-shadow p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-gray-400">Agri-Business</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                  <BuildingStorefrontIcon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                  {analyticsLoading ? '...' : analytics?.agriBusinessCount || 0}
                </div>
                <p className="text-[11px] text-[#94A3B8] dark:text-gray-500 mt-0.5">Commercial onboarding</p>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-[#DCEAF3] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#1E293B] dark:text-gray-100">Application Status</CardTitle>
            <div className="text-sm text-[#64748B] dark:text-gray-400">Distribution of agent recruitment pipeline</div>
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

        <Card className="border-[#DCEAF3] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#1E293B] dark:text-gray-100">Top Assignments</CardTitle>
            <div className="text-sm text-[#64748B] dark:text-gray-400">Agents by Assigned State</div>
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
      <Card className="border-[#DCEAF3] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
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
                className="bg-white dark:bg-gray-800 border-red-300 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
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

            <div className="w-full md:w-[200px]">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Agent Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agent Types</SelectItem>
                  <SelectItem value="enrollment">Farmer Enrollment</SelectItem>
                  <SelectItem value="household">Household Intervention</SelectItem>
                  <SelectItem value="survey">Field Survey</SelectItem>
                  <SelectItem value="correction">Data Correction</SelectItem>
                  <SelectItem value="agribusiness">Agri-Business</SelectItem>
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
      <div className="overflow-hidden rounded-lg border border-[#DCEAF3] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
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
                        <Link href={`/agents/${agent.id}`} className="font-semibold text-[#1E293B] dark:text-gray-100 hover:text-[#02426F] hover:underline">
                          {agent.displayName}
                        </Link>
                        <div className="text-xs text-[#64748B] dark:text-gray-400">{agent.email}</div>
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
                  <TableCell className="font-mono text-xs text-[#64748B] dark:text-gray-400">
                    {agent.agent?.nin ? agent.agent.nin : <span className="text-gray-300">-</span>}
                  </TableCell>
                   <TableCell className="text-sm">
                    {agent.agent?.gender || <span className="text-gray-300">-</span>}
                  </TableCell>
                  <TableCell>
                    {agent.agent?.assignedState ? (
                      <div>
                        <div className="text-sm font-semibold text-[#1E293B] dark:text-gray-100">{agent.agent.assignedState}</div>
                        <div className="text-xs text-[#64748B] dark:text-gray-400">{agent.agent.assignedLGA || '-'}</div>
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
                    {agent.role === 'household_agent' && (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-teal-700 dark:text-teal-400">Intervention</span>
                          <span className="text-xs text-muted-foreground">households</span>
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
                    {agent.role === 'agri_business_agent' && (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">Commercial</span>
                          <span className="text-xs text-muted-foreground">stakeholders</span>
                        </div>
                        {agent.agent?.performanceRating != null && (
                          <div className="text-[11px] text-gray-400">{agent.agent.performanceRating.toFixed(1)} / 5.0</div>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-[#64748B] dark:text-gray-400">
                    {new Date(agent.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <ZoraAccessButton type="agent" id={agent.id} />
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

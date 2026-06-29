'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowPathIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { Handshake, MapPinned } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Stakeholder = {
  id: string;
  businessName: string;
  businessType: string;
  contactName: string;
  email: string;
  phone?: string | null;
  state?: string | null;
  lga?: string | null;
  interests: string[];
  targetCrops: string[];
  status: string;
  kybStatus: string;
  createdAt: string;
  _count: { applications: number; agreements: number; outreachPlans: number };
  applications: { id: string; title: string; status: string; applicationType: string }[];
};

type AgriBusinessStats = {
  total: number;
  new: number;
  active: number;
  kybPending: number;
  agreements: number;
};

type StatCardProps = {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  note?: string;
};

const emptyStats: AgriBusinessStats = { total: 0, new: 0, active: 0, kybPending: 0, agreements: 0 };
const statuses = ['NEW', 'KYB_PENDING', 'UNDER_REVIEW', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'REJECTED'];
const kybStatuses = ['NOT_SUBMITTED', 'SUBMITTED', 'VERIFIED', 'NEEDS_MORE_INFO', 'REJECTED'];

function badgeClass(status: string) {
  const normalized = status.toLowerCase();
  if (['active', 'approved', 'verified'].includes(normalized)) return 'bg-green-100 text-green-700 border-green-200';
  if (['new', 'submitted', 'kyb_pending', 'under_review'].includes(normalized)) return 'bg-blue-100 text-[#013358] border-blue-200';
  if (['needs_more_info', 'suspended'].includes(normalized)) return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-red-100 text-red-700 border-red-200';
}

function StatCard({ title, value, icon: Icon, note }: StatCardProps) {
  return (
    <Card className="border-[#DCEAF3]">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#F3F8FC] text-[#013358]">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#475569]">{title}</p>
          <p className="mt-1 text-2xl font-bold text-[#1E293B] dark:text-white">{value}</p>
          {note && <p className="text-xs text-muted-foreground">{note}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AgriBusinessPipelinePage() {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [stats, setStats] = useState<AgriBusinessStats>(emptyStats);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchStakeholders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '80' });
      if (search) params.set('search', search);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      const res = await fetch(`/api/agribusiness/stakeholders?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load agri-business stakeholders');
      setStakeholders(data.stakeholders || []);
      setStats(data.stats || emptyStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agri-business stakeholders');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, search]);

  useEffect(() => {
    fetchStakeholders();
  }, [fetchStakeholders]);

  const updateStakeholder = async (id: string, updates: Record<string, string>) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/agribusiness/stakeholders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setStakeholders((prev) => prev.map((item) => (item.id === id ? data.stakeholder : item)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 py-4">
      <div className="overflow-hidden rounded-lg border border-[#DCEAF3] brand-gradient-dark p-6 text-white shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#DCEAF3]">
              <Handshake className="h-4 w-4" />
              Agri-Business and Agri-Entrepreneurship
            </div>
            <h1 className="text-3xl font-bold tracking-normal">Stakeholder Partnership Pipeline</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#DCEAF3]">
              Manage KYB, business interests, applications, partnership agreements, and outreach
              plans that connect verified stakeholders with FIMS farmer cohorts.
            </p>
          </div>
          <Button asChild className="bg-white text-[#013358] hover:bg-[#F3F8FC]">
            <Link href="/agribusiness" target="_blank">Open Public Page</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Stakeholders" value={stats.total} icon={BuildingOffice2Icon} />
        <StatCard title="New" value={stats.new} icon={UsersIcon} />
        <StatCard title="KYB pending" value={stats.kybPending} icon={ShieldCheckIcon} />
        <StatCard title="Active" value={stats.active} icon={CheckCircleIcon} />
        <StatCard title="Agreements" value={stats.agreements} icon={DocumentTextIcon} />
      </div>

      <Card className="border-[#DCEAF3]">
        <CardContent className="p-5">
          <form
            className="flex flex-col gap-3 md:flex-row md:items-center"
            onSubmit={(event) => {
              event.preventDefault();
              fetchStakeholders();
            }}
          >
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-3.5 h-4 w-4 text-[#94A3B8]" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search business, contact, email, type..."
                className="pl-9"
              />
            </div>
            <div className="w-full md:w-56">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statuses.map((status) => <SelectItem key={status} value={status}>{status.replaceAll('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">Filter</Button>
            <Button type="button" variant="outline" onClick={fetchStakeholders} disabled={loading}>
              <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <Card className="border-[#DCEAF3]">
        <CardHeader className="border-b border-[#E5E7EB]">
          <CardTitle>Agri-Business Stakeholders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F8FAFC]">
                <TableHead className="px-4">Business</TableHead>
                <TableHead>Interests</TableHead>
                <TableHead>Applications</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>KYB</TableHead>
                <TableHead>Outreach</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                    Loading stakeholders...
                  </TableCell>
                </TableRow>
              ) : stakeholders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                    No stakeholders found yet.
                  </TableCell>
                </TableRow>
              ) : (
                stakeholders.map((stakeholder) => (
                  <TableRow key={stakeholder.id}>
                    <TableCell className="px-4">
                      <div className="max-w-sm">
                        <p className="font-bold text-[#1E293B] dark:text-white">{stakeholder.businessName}</p>
                        <p className="text-xs text-muted-foreground">{stakeholder.businessType}</p>
                        <p className="mt-1 text-xs text-[#475569]">{stakeholder.contactName} - {stakeholder.email}</p>
                        {(stakeholder.state || stakeholder.lga) && (
                          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPinned className="h-3 w-3" />
                            {[stakeholder.lga, stakeholder.state].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-xs flex-wrap gap-1.5">
                        {[...stakeholder.interests, ...stakeholder.targetCrops].slice(0, 5).map((item) => (
                          <Badge key={item} variant="outline" className="border-[#DCEAF3] bg-[#F3F8FC] text-[#013358]">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold">{stakeholder._count.applications} application(s)</p>
                      <p className="text-xs text-muted-foreground">{stakeholder._count.agreements} agreement(s)</p>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={stakeholder.status}
                        onValueChange={(value) => updateStakeholder(stakeholder.id, { status: value })}
                        disabled={updatingId === stakeholder.id}
                      >
                        <SelectTrigger className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map((status) => <SelectItem key={status} value={status}>{status.replaceAll('_', ' ')}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={stakeholder.kybStatus}
                        onValueChange={(value) => updateStakeholder(stakeholder.id, { kybStatus: value })}
                        disabled={updatingId === stakeholder.id}
                      >
                        <SelectTrigger className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {kybStatuses.map((status) => <SelectItem key={status} value={status}>{status.replaceAll('_', ' ')}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Badge className={`mt-2 border ${badgeClass(stakeholder.kybStatus)}`}>{stakeholder.kybStatus.replaceAll('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold">{stakeholder._count.outreachPlans} plan(s)</p>
                      <p className="text-xs text-muted-foreground">{new Date(stakeholder.createdAt).toLocaleDateString()}</p>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

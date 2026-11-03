'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePermissions } from '@/components/PermissionProvider';
import { PERMISSIONS } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeftIcon,
  PencilIcon,
  UserIcon,
  MapPinIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  BuildingLibraryIcon,
  HomeIcon,
  ClipboardDocumentCheckIcon,
  DocumentMagnifyingGlassIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { SendMessageDialog } from '@/components/communications/SendMessageDialog';
import { hierarchicalData } from '@/lib/data/hierarchical-data';

interface AgentDetails {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  _count: { farmers: number; capturedHouseholds?: number };
  agent: {
    id?: string;
    nin?: string;
    middleName?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    maritalStatus?: string | null;
    employmentStatus?: string | null;
    employmentType?: string | null;
    photoUrl?: string | null;
    phone?: string | null;
    whatsAppNumber?: string | null;
    alternativePhone?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    localGovernment?: string | null;
    ward?: string | null;
    pollingUnit?: string | null;
    assignedState?: string | null;
    assignedLGA?: string | null;
    assignedWards?: string[];
    bankName?: string | null;
    accountName?: string | null;
    accountNumber?: string | null;
    bvn?: string | null;
    status?: string | null;
    performanceRating?: number | null;
    totalFarmersRegistered?: number;
  } | null;
  canEnrollHouseholds?: boolean;
  stats?: {
    farmersCount: number;
    householdsCount: number;
    surveyResponsesCount: number;
    correctionsCount: number;
  };
}

const formatLocation = (name: string) => {
  if (!name) return '';
  return name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const states = hierarchicalData.map((d: any) => formatLocation(d.state));

function parseAddressBlob(raw?: string | null): { plain: string; parts: Record<string, string> } {
  if (!raw) return { plain: '', parts: {} };
  const labels = ['Enrollment Code', 'Cluster', 'Course of Study', 'Job History', 'Cover Note', 'Residential Address'];
  const parts: Record<string, string> = {};
  let plain = raw;
  for (const label of labels) {
    const regex = new RegExp(`${label}:\n?([\\s\\S]*?)(?=\n\n(?:${labels.join('|')}):|$)`, 'i');
    const m = raw.match(regex);
    if (m) { parts[label] = m[1].trim(); plain = plain.replace(m[0], '').trim(); }
    else {
      const r2 = new RegExp(`${label}:[ \t]*([^\n]*)`, 'i');
      const m2 = raw.match(r2);
      if (m2) { parts[label] = m2[1].trim(); plain = plain.replace(m2[0], '').trim(); }
    }
  }
  return { plain: parts['Residential Address'] || plain.replace(/\n{3,}/g, '\n\n').trim(), parts };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children || children === '—' || children === 'N/A') {
    return (
      <div>
        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
        <dd className="mt-1 text-sm text-gray-400 dark:text-gray-600">—</dd>
      </div>
    );
  }
  return (
    <div>
      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{children}</dd>
    </div>
  );
}

function ApplicationStatusBadge({ status, isActive }: { status?: string | null; isActive: boolean }) {
  const map: Record<string, string> = {
    Applied:          'bg-gray-100 text-gray-700 ring-gray-400/30 dark:bg-gray-700 dark:text-gray-300',
    CallForInterview: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20 dark:bg-yellow-900/20 dark:text-yellow-400',
    Accepted:         'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/20 dark:text-blue-400',
    Enrolled:         'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/20 dark:text-green-400',
    Rejected:         'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/20 dark:text-red-400',
    inactive:         'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-900/20 dark:text-orange-400',
  };
  const s = status || (isActive ? 'Enrolled' : 'inactive');
  const cls = map[s] ?? (isActive
    ? 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/20 dark:text-green-400'
    : 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/20 dark:text-red-400');
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {s === 'CallForInterview' ? 'Call For Interview' : s}
    </span>
  );
}

function AgentTypeBadge({ role }: { role: string }) {
  if (role === 'agent')                  return <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-900/20 dark:text-blue-400 dark:ring-blue-500/30">Farmer Enrollment</span>;
  if (role === 'household_agent')        return <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-teal-50 text-teal-800 ring-1 ring-inset ring-teal-600/20 dark:bg-teal-900/20 dark:text-teal-400 dark:ring-teal-500/30">Household Enrollment</span>;
  if (role === 'data_correction_agent')  return <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-500/30">Correction</span>;
  if (role === 'survey_agent')           return <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20 dark:bg-purple-900/20 dark:text-purple-400 dark:ring-purple-500/30">Survey</span>;
  if (role === 'agri_business_agent')    return <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20 dark:bg-indigo-900/20 dark:text-indigo-400 dark:ring-indigo-500/30">Agri-Business</span>;
  return <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700">{role}</span>;
}

export default function AgentDetailsClient({ id }: { id: string }) {
  const { hasPermission } = usePermissions();
  const [agent, setAgent] = useState<AgentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Status state
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Operational Assignment Quick-Edit state
  const [editAssignmentOpen, setEditAssignmentOpen] = useState(false);
  const [assignedRole, setAssignedRole] = useState('agent');
  const [assignedState, setAssignedState] = useState('');
  const [assignedLGA, setAssignedLGA] = useState('');
  const [assignedCluster, setAssignedCluster] = useState('');
  const [clustersList, setClustersList] = useState<{ id: string; title: string }[]>([]);
  const [assignmentUpdating, setAssignmentUpdating] = useState(false);
  const [assignmentMsg, setAssignmentMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchAgentDetails();
    fetchClusters();
  }, [id]);

  const fetchClusters = async () => {
    try {
      const res = await fetch('/api/public/clusters');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.clusters)) {
          setClustersList(data.clusters);
        }
      }
    } catch (err) {
      console.error('Failed to load clusters:', err);
    }
  };

  const fetchAgentDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/agents/${id}`);
      if (!res.ok) throw new Error('Failed to fetch agent details');
      const data: AgentDetails = await res.json();
      setAgent(data);

      const { parts } = parseAddressBlob(data.agent?.address);
      setAssignedRole(data.role || 'agent');
      setAssignedState(data.agent?.assignedState || '');
      setAssignedLGA(data.agent?.assignedLGA || '');
      setAssignedCluster(parts['Cluster'] || '');
    } catch (err) {
      setError('Error loading agent details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    setStatusUpdating(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update status');
      }
      setStatusMsg({ type: 'success', text: `Status updated to "${newStatus}"` });
      setNewStatus('');
      await fetchAgentDetails();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update status' });
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAssignmentSave = async () => {
    setAssignmentUpdating(true);
    setAssignmentMsg(null);
    try {
      const payload: any = {
        role: assignedRole,
        assignedState,
        assignedLGA,
        cluster: assignedCluster === 'none' ? '' : assignedCluster,
      };

      const res = await fetch(`/api/agents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update operational assignment');
      }

      setAssignmentMsg({ type: 'success', text: 'Operational assignment & role updated successfully' });
      await fetchAgentDetails();
      setTimeout(() => setAssignmentMsg(null), 4000);
    } catch (err: any) {
      setAssignmentMsg({ type: 'error', text: err.message || 'Failed to update assignment' });
    } finally {
      setAssignmentUpdating(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500 dark:text-gray-400">Loading agent details…</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;
  if (!agent) return <div className="p-6 text-center text-gray-500 dark:text-gray-400">Agent not found</div>;

  const initials = `${agent.firstName?.[0] ?? ''}${agent.lastName?.[0] ?? ''}`.toUpperCase() || '?';
  const photoUrl = agent.agent?.photoUrl;
  const { plain: plainAddress, parts: addressParts } = parseAddressBlob(agent.agent?.address);

  // Selected state node for LGA options
  const selectedStateNode = hierarchicalData.find(
    (s: any) => formatLocation(s.state) === assignedState
  );

  // Performance metrics based on agent role
  const isHouseholdAgent = agent.role === 'household_agent';
  const isSurveyAgent = agent.role === 'survey_agent';
  const isCorrectionAgent = agent.role === 'data_correction_agent';
  const isAgriBusinessAgent = agent.role === 'agri_business_agent';

  const farmersCount = agent.stats?.farmersCount ?? agent._count?.farmers ?? 0;
  const householdsCount = agent.stats?.householdsCount ?? agent._count?.capturedHouseholds ?? 0;
  const surveyCount = agent.stats?.surveyResponsesCount ?? 0;
  const correctionsCount = agent.stats?.correctionsCount ?? 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Nav */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/agents" className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <Link href="/agents" className="text-gray-500 dark:text-gray-400 hover:underline">Agents</Link>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <span className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-xs">{agent.displayName}</span>
      </div>

      {/* Profile Banner */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-6 py-6 flex flex-col sm:flex-row gap-6 items-start">
          {/* Passport Photo */}
          <div className="shrink-0 flex flex-col items-center gap-3">
            {photoUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl}
                  alt={agent.displayName}
                  className="h-28 w-28 rounded-xl object-cover ring-2 ring-gray-200 dark:ring-gray-700 shadow"
                />
                <Button variant="outline" size="sm" className="w-full text-xs h-7" asChild>
                  <a href={photoUrl} download={`agent-${agent.id}-photo`}>
                    Download Image
                  </a>
                </Button>
              </>
            ) : (
              <div className="h-28 w-28 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex flex-col items-center justify-center text-indigo-600 dark:text-indigo-300 shadow ring-2 ring-gray-200 dark:ring-gray-700 select-none">
                <span className="text-4xl font-bold">{initials}</span>
                <span className="mt-1 text-[10px] text-indigo-400 dark:text-indigo-500">No photo</span>
              </div>
            )}
          </div>

          {/* Identity & quick stats */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{agent.displayName}</h1>
              <div className="flex gap-2 flex-wrap pt-0.5">
                <AgentTypeBadge role={agent.role} />
                <ApplicationStatusBadge status={agent.agent?.status} isActive={agent.isActive} />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-8 gap-y-3">
              <div className="text-sm">
                <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-0.5">Email</p>
                <p className="text-gray-800 dark:text-gray-200 truncate">{agent.email}</p>
              </div>
              <div className="text-sm">
                <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-0.5">Phone</p>
                <p className="text-gray-800 dark:text-gray-200">{agent.agent?.phone || agent.phoneNumber || '—'}</p>
              </div>
              <div className="text-sm">
                <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-0.5">Location</p>
                <p className="text-gray-800 dark:text-gray-200">
                  {agent.agent?.state || '—'}{agent.agent?.localGovernment ? `, ${agent.agent.localGovernment}` : ''}
                </p>
              </div>
              <div className="text-sm">
                <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-0.5">Joined</p>
                <p className="text-gray-800 dark:text-gray-200">{new Date(agent.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Role-specific summary quicklink */}
            {isHouseholdAgent && householdsCount > 0 && (
              <div className="mt-3">
                <Link href={`/households?agentId=${agent.id}`} className="text-sm text-teal-600 dark:text-teal-400 hover:underline">
                  {householdsCount} household{householdsCount !== 1 ? 's' : ''} captured &rarr;
                </Link>
              </div>
            )}
            {!isHouseholdAgent && farmersCount > 0 && (
              <div className="mt-3">
                <Link href={`/farmers?agentId=${agent.id}`} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                  {farmersCount} farmer{farmersCount !== 1 ? 's' : ''} registered &rarr;
                </Link>
              </div>
            )}
          </div>

          {/* Edit actions & request update */}
          <div className="shrink-0 self-start flex flex-wrap gap-2">
            {hasPermission(PERMISSIONS.AGENTS_UPDATE) && (
              <Link
                href={`/agents/${id}/edit`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <PencilIcon className="-ml-1 mr-2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                Edit Profile
              </Link>
            )}
            {hasPermission(PERMISSIONS.COMMUNICATIONS_SEND) && (
              <>
                <SendMessageDialog
                  recipientType="agent"
                  recipientId={agent.id}
                  recipientName={agent.displayName}
                  recipientEmail={agent.email}
                  recipientPhone={agent.agent?.phone || agent.phoneNumber}
                />
                <SendMessageDialog
                  recipientType="agent"
                  recipientId={agent.id}
                  recipientName={agent.displayName}
                  recipientEmail={agent.email}
                  recipientPhone={agent.agent?.phone || agent.phoneNumber}
                  defaultSubject="Please Update Your CCSA Profile"
                  defaultBody={`Hello ${agent.firstName},\n\nPlease use the secure link below to update your agent profile records (including NIN, bank details, and operational address).\n\nUpdate link:\n${window.location.origin}/update/agent/${agent.id}\n\nThank you,\nCCSA Admin`}
                  trigger={
                    <Button size="sm" variant="outline" className="gap-2 border-[#013358] text-[#013358] hover:bg-blue-50 dark:hover:bg-blue-900/20">
                      Request Update
                    </Button>
                  }
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">

          {/* ── Operational Assignment (With In-Place Editor) ── */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-blue-100 dark:border-blue-900/50">
            <div className="px-5 py-4 bg-blue-50/50 dark:bg-blue-950/20 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BriefcaseIcon className="h-5 w-5 text-[#013358] dark:text-blue-400" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Operational Assignment &amp; Role
                </h3>
              </div>
              {hasPermission(PERMISSIONS.AGENTS_UPDATE) && (
                <Button
                  size="sm"
                  variant={editAssignmentOpen ? 'secondary' : 'outline'}
                  onClick={() => setEditAssignmentOpen(!editAssignmentOpen)}
                  className="text-xs h-8"
                >
                  {editAssignmentOpen ? 'Cancel' : 'Change Assignment'}
                </Button>
              )}
            </div>

            <div className="px-5 py-5 space-y-5">
              {/* Quick Assignment Form */}
              {editAssignmentOpen && hasPermission(PERMISSIONS.AGENTS_UPDATE) ? (
                <div className="bg-blue-50/40 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-200 dark:border-blue-800 space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Update the agent&apos;s operational type, geographical deployment, and cluster directly without navigating away.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Agent Role / Type */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Agent Type / Role</label>
                      <Select value={assignedRole} onValueChange={setAssignedRole}>
                        <SelectTrigger className="bg-white dark:bg-gray-800">
                          <SelectValue placeholder="Select Agent Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="agent">Enrollment Agent (Farmers)</SelectItem>
                          <SelectItem value="household_agent">Household Enrollment Agent</SelectItem>
                          <SelectItem value="data_correction_agent">Correction Agent</SelectItem>
                          <SelectItem value="survey_agent">Survey Agent</SelectItem>
                          <SelectItem value="agri_business_agent">Agri-Business Agent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Assigned State */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Assigned State</label>
                      <Select
                        value={assignedState}
                        onValueChange={(val) => {
                          setAssignedState(val);
                          setAssignedLGA('');
                        }}
                      >
                        <SelectTrigger className="bg-white dark:bg-gray-800">
                          <SelectValue placeholder="Select Assigned State" />
                        </SelectTrigger>
                        <SelectContent>
                          {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Assigned LGA */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Assigned LGA</label>
                      <Select
                        value={assignedLGA}
                        onValueChange={setAssignedLGA}
                        disabled={!assignedState}
                      >
                        <SelectTrigger className="bg-white dark:bg-gray-800">
                          <SelectValue placeholder={assignedState ? "Select Assigned LGA" : "Choose state first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedStateNode?.lgas.map((l: any) => {
                            const n = formatLocation(l.lga);
                            return <SelectItem key={n} value={n}>{n}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Assigned Cluster */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Assigned Cluster</label>
                      <Select
                        value={assignedCluster || 'none'}
                        onValueChange={(val) => setAssignedCluster(val === 'none' ? '' : val)}
                      >
                        <SelectTrigger className="bg-white dark:bg-gray-800">
                          <SelectValue placeholder="Assign Cluster" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Cluster (Unassigned)</SelectItem>
                          {clustersList.map((c) => (
                            <SelectItem key={c.id} value={c.title}>
                              {c.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      size="sm"
                      onClick={handleAssignmentSave}
                      disabled={assignmentUpdating}
                      className="bg-[#013358] hover:bg-blue-800"
                    >
                      {assignmentUpdating && <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />}
                      {assignmentUpdating ? 'Saving...' : 'Save Assignment'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditAssignmentOpen(false)}
                      disabled={assignmentUpdating}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}

              {assignmentMsg && (
                <div className={`p-3 rounded-md text-sm flex items-center gap-2 ${
                  assignmentMsg.type === 'success'
                    ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300 border border-green-200'
                    : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300 border border-red-200'
                }`}>
                  <CheckCircleIcon className="h-4 w-4 shrink-0" />
                  {assignmentMsg.text}
                </div>
              )}

              {/* View current assignment */}
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <Field label="Current Role / Agent Type">
                  <AgentTypeBadge role={agent.role} />
                </Field>
                <Field label="Assigned Cluster">
                  {addressParts['Cluster'] ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 px-3 py-1 text-xs font-semibold text-[#013358] dark:text-blue-300 border border-[#DCEAF3] dark:border-blue-700">
                      <BuildingLibraryIcon className="h-3.5 w-3.5" />
                      {addressParts['Cluster']}
                    </span>
                  ) : (
                    'Not Assigned'
                  )}
                </Field>
                <Field label="Assigned State">{agent.agent?.assignedState || 'Not Assigned'}</Field>
                <Field label="Assigned LGA">{agent.agent?.assignedLGA || 'Not Assigned'}</Field>
                {agent.agent?.assignedWards && agent.agent.assignedWards.length > 0 && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Assigned Wards</dt>
                    <dd className="mt-2 flex flex-wrap gap-1">
                      {agent.agent.assignedWards.map(w => (
                        <span key={w} className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-xs text-blue-700 dark:text-blue-300">{w}</span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* ── Personal Information ── */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">Personal Information</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <Field label="Full Name">
                  {agent.firstName} {agent.agent?.middleName ? `${agent.agent.middleName} ` : ''}{agent.lastName}
                </Field>
                <Field label="Email">{agent.email}</Field>
                <Field label="Phone">{agent.agent?.phone || agent.phoneNumber}</Field>
                <Field label="WhatsApp">{agent.agent?.whatsAppNumber || '—'}</Field>
                <Field label="Alternative Phone">{agent.agent?.alternativePhone || '—'}</Field>
                <Field label="NIN">
                  {agent.agent?.nin ? (
                    <span className="font-mono">{agent.agent.nin}</span>
                  ) : (
                    '—'
                  )}
                </Field>
                <Field label="BVN">
                  {agent.agent?.bvn ? (
                    <span className="font-mono">{agent.agent.bvn}</span>
                  ) : (
                    '—'
                  )}
                </Field>
                <Field label="Date of Birth">
                  {agent.agent?.dateOfBirth ? new Date(agent.agent.dateOfBirth).toLocaleDateString() : '—'}
                </Field>
                <Field label="Gender">{agent.agent?.gender || '—'}</Field>
                <Field label="Marital Status">{agent.agent?.maritalStatus || '—'}</Field>
                <Field label="Joined">{new Date(agent.createdAt).toLocaleDateString()}</Field>
                <Field label="Last Login">
                  {agent.lastLogin ? new Date(agent.lastLogin).toLocaleString() : 'Never'}
                </Field>
              </dl>
            </div>
          </div>

          {/* ── Residential Location ── */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
              <MapPinIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">Residential Location</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <Field label="State">{agent.agent?.state || '—'}</Field>
                <Field label="LGA">{agent.agent?.localGovernment || '—'}</Field>
                <Field label="Ward">{agent.agent?.ward || '—'}</Field>
                <Field label="Polling Unit">{agent.agent?.pollingUnit || '—'}</Field>
                <Field label="City">{agent.agent?.city || '—'}</Field>
                {plainAddress && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Residential Address / Note</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 whitespace-pre-line">{plainAddress}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* ── Education & Background ── */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
              <AcademicCapIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">Education &amp; Background</h3>
            </div>
            <div className="px-4 py-5 sm:p-6 space-y-5">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <Field label="Education Level">{agent.agent?.employmentStatus || '—'}</Field>
                <Field label="Course of Study">{agent.agent?.employmentType || addressParts['Course of Study'] || '—'}</Field>
                {addressParts['Enrollment Code'] && (
                  <Field label="Enrollment Code"><span className="font-mono">{addressParts['Enrollment Code']}</span></Field>
                )}
                {addressParts['Cluster'] && (
                  <Field label="Cluster">{addressParts['Cluster']}</Field>
                )}
              </dl>
              {addressParts['Job History'] && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Work History</dt>
                  <dd className="mt-2 text-sm text-gray-900 dark:text-gray-100 whitespace-pre-line bg-gray-50 dark:bg-gray-700/40 rounded-md p-3">{addressParts['Job History']}</dd>
                </div>
              )}
              {addressParts['Cover Note'] && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Motivation / Cover Note</dt>
                  <dd className="mt-2 text-sm text-gray-900 dark:text-gray-100 italic bg-gray-50 dark:bg-gray-700/40 rounded-md p-3">{addressParts['Cover Note']}</dd>
                </div>
              )}
            </div>
          </div>

          {/* ── Bank Details ── */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
              <BuildingLibraryIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">Bank Details</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-5">
                <Field label="Bank Name">{agent.agent?.bankName || '—'}</Field>
                <Field label="Account Number">
                  <span className="font-mono">{agent.agent?.accountNumber || '—'}</span>
                </Field>
                <Field label="Account Name">{agent.agent?.accountName || '—'}</Field>
              </dl>
            </div>
          </div>

        </div>

        {/* Sidebar */}
        <div className="space-y-6">

          {/* Application Status update */}
          {hasPermission(PERMISSIONS.AGENTS_UPDATE) && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
              <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">Application Status</h3>
              </div>
              <div className="px-4 py-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Current</span>
                  <ApplicationStatusBadge status={agent.agent?.status} isActive={agent.isActive} />
                </div>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Change status to…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Applied">Applied</SelectItem>
                    <SelectItem value="CallForInterview">Call For Interview</SelectItem>
                    <SelectItem value="Accepted">Accepted</SelectItem>
                    <SelectItem value="Enrolled">Enrolled / Active</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  className="w-full bg-[#013358] hover:bg-blue-800"
                  onClick={handleStatusUpdate}
                  disabled={!newStatus || statusUpdating}
                >
                  {statusUpdating ? 'Updating…' : 'Update Status'}
                </Button>
                {statusMsg && (
                  <p className={`text-xs ${statusMsg.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {statusMsg.text}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Performance Card — Tailored by Agent Type */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Agent Performance</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Based on agent enrollment assignment</p>
            </div>

            <div className="px-4 py-5 sm:p-6 space-y-4">
              {/* Primary Role Metric */}
              {isHouseholdAgent ? (
                <div className="flex items-center">
                  <div className="shrink-0 bg-teal-600 rounded-md p-3">
                    <HomeIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4 w-0 flex-1">
                    <dl>
                      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Households Enrolled
                      </dt>
                      <dd>
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {householdsCount}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              ) : isSurveyAgent ? (
                <div className="flex items-center">
                  <div className="shrink-0 bg-purple-600 rounded-md p-3">
                    <ClipboardDocumentCheckIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4 w-0 flex-1">
                    <dl>
                      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Surveys Completed
                      </dt>
                      <dd>
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {surveyCount}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              ) : isCorrectionAgent ? (
                <div className="flex items-center">
                  <div className="shrink-0 bg-amber-600 rounded-md p-3">
                    <DocumentMagnifyingGlassIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4 w-0 flex-1">
                    <dl>
                      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Corrections Handled
                      </dt>
                      <dd>
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {correctionsCount}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              ) : isAgriBusinessAgent ? (
                <div className="flex items-center">
                  <div className="shrink-0 bg-indigo-600 rounded-md p-3">
                    <BriefcaseIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4 w-0 flex-1">
                    <dl>
                      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Agri-Business Stakeholders
                      </dt>
                      <dd>
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          Active
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              ) : (
                <div className="flex items-center">
                  <div className="shrink-0 bg-blue-600 rounded-md p-3">
                    <BriefcaseIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4 w-0 flex-1">
                    <dl>
                      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Farmers Registered
                      </dt>
                      <dd>
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {farmersCount}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              )}

              {/* Multi-Metric Breakdown (if agent has activity in multiple categories) */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700/60 grid grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-50 dark:bg-gray-700/40 p-2 rounded">
                  <span className="text-gray-500 dark:text-gray-400 block">Farmers</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{farmersCount}</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/40 p-2 rounded">
                  <span className="text-gray-500 dark:text-gray-400 block">Households</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{householdsCount}</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/40 p-2 rounded">
                  <span className="text-gray-500 dark:text-gray-400 block">Surveys</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{surveyCount}</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/40 p-2 rounded">
                  <span className="text-gray-500 dark:text-gray-400 block">Corrections</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{correctionsCount}</span>
                </div>
              </div>
            </div>

            {/* Quick-links based on role */}
            <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 text-xs">
              {isHouseholdAgent ? (
                <Link href={`/households?agentId=${agent.id}`} className="font-medium text-teal-600 dark:text-teal-400 hover:underline">
                  View all enrolled households &rarr;
                </Link>
              ) : isSurveyAgent ? (
                <Link href="/surveys" className="font-medium text-purple-600 dark:text-purple-400 hover:underline">
                  View survey responses &rarr;
                </Link>
              ) : isCorrectionAgent ? (
                <Link href="/corrections" className="font-medium text-amber-600 dark:text-amber-400 hover:underline">
                  View data corrections &rarr;
                </Link>
              ) : isAgriBusinessAgent ? (
                <Link href="/agribusiness" className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                  View agribusiness leads &rarr;
                </Link>
              ) : (
                <Link href={`/farmers?agentId=${agent.id}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                  View all registered farmers &rarr;
                </Link>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

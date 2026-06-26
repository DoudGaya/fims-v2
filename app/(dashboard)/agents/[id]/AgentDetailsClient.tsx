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
} from '@heroicons/react/24/outline';
import { SendMessageDialog } from '@/components/communications/SendMessageDialog';

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
  _count: { farmers: number };
  agent: {
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
}

function parseAddressBlob(raw?: string | null): { plain: string; parts: Record<string, string> } {
  if (!raw) return { plain: '', parts: {} };
  const labels = ['Enrollment Code', 'Cluster', 'Course of Study', 'Job History', 'Cover Note'];
  const parts: Record<string, string> = {};
  let plain = raw;
  for (const label of labels) {
    const regex = new RegExp(`${label}:\n?([\\s\\S]*?)(?=\n\n(?:${labels.join('|')}):)`, 'i');
    const m = raw.match(regex);
    if (m) { parts[label] = m[1].trim(); plain = plain.replace(m[0], '').trim(); }
    else {
      const r2 = new RegExp(`${label}:[ \t]*([^\n]*)`, 'i');
      const m2 = raw.match(r2);
      if (m2) { parts[label] = m2[1].trim(); plain = plain.replace(m2[0], '').trim(); }
    }
  }
  return { plain: plain.replace(/\n{3,}/g, '\n\n').trim(), parts };
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
  if (role === 'agent')                  return <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-900/20 dark:text-blue-400 dark:ring-blue-500/30">Enrollment</span>;
  if (role === 'data_correction_agent')  return <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-500/30">Correction</span>;
  if (role === 'survey_agent')           return <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20 dark:bg-purple-900/20 dark:text-purple-400 dark:ring-purple-500/30">Survey</span>;
  return null;
}

export default function AgentDetailsClient({ id }: { id: string }) {
  const { hasPermission } = usePermissions();
  const [agent, setAgent] = useState<AgentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchAgentDetails();
  }, [id]);

  const fetchAgentDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/agents/${id}`);
      if (!res.ok) throw new Error('Failed to fetch agent details');
      setAgent(await res.json());
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

  if (loading) return <div className="p-6 text-center text-gray-500 dark:text-gray-400">Loading agent details…</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;
  if (!agent) return <div className="p-6 text-center text-gray-500 dark:text-gray-400">Agent not found</div>;

  const initials = `${agent.firstName?.[0] ?? ''}${agent.lastName?.[0] ?? ''}`.toUpperCase() || '?';
  const photoUrl = agent.agent?.photoUrl;
  const { plain: plainAddress, parts: addressParts } = parseAddressBlob(agent.agent?.address);

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
          {/* Passport Photo — single instance */}
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
            {agent._count.farmers > 0 && (
              <div className="mt-3">
                <Link href={`/farmers?agentId=${agent.id}`} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                  {agent._count.farmers} farmer{agent._count.farmers !== 1 ? 's' : ''} registered &rarr;
                </Link>
              </div>
            )}
          </div>

          {/* Edit action */}
          {hasPermission(PERMISSIONS.AGENTS_UPDATE) && (
            <div className="shrink-0 self-start">
              <Link
                href={`/agents/${id}/edit`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <PencilIcon className="-ml-1 mr-2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                Edit Profile
              </Link>
            </div>
          )}
          {hasPermission(PERMISSIONS.COMMUNICATIONS_SEND) && (
            <div className="shrink-0 self-start flex gap-2">
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
                  <Button size="sm" variant="outline" className="gap-2 border-ccsa-blue text-ccsa-blue hover:bg-blue-50 dark:hover:bg-blue-900/20">
                    Request Update
                  </Button>
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">

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
                <Field label="Email"><span className="break-all">{agent.email}</span></Field>
                <Field label="Phone">{agent.agent?.phone || agent.phoneNumber || '—'}</Field>
                <Field label="WhatsApp">{agent.agent?.whatsAppNumber || '—'}</Field>
                <Field label="Alternative Phone">{agent.agent?.alternativePhone || '—'}</Field>
                <Field label="Gender">{agent.agent?.gender || '—'}</Field>
                <Field label="Date of Birth">
                  {agent.agent?.dateOfBirth ? new Date(agent.agent.dateOfBirth).toLocaleDateString() : '—'}
                </Field>
                <Field label="Marital Status">{agent.agent?.maritalStatus || '—'}</Field>
                <Field label="NIN">
                  <span className="font-mono">
                    {agent.agent?.nin?.startsWith('APP-') ? 'Pending verification' : (agent.agent?.nin || 'N/A')}
                  </span>
                </Field>
                <Field label="BVN">
                  <span className="font-mono">{agent.agent?.bvn ? `****${agent.agent.bvn.slice(-4)}` : '—'}</span>
                </Field>
                <Field label="Application Status">
                  <ApplicationStatusBadge status={agent.agent?.status} isActive={agent.isActive} />
                </Field>
                <Field label="Agent Type"><AgentTypeBadge role={agent.role} /></Field>
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
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 whitespace-pre-line">{plainAddress}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* ── Operational Assignment ── */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
              <BriefcaseIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">Operational Assignment</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
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

          {/* ── Education & Background ── */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
              <AcademicCapIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">Education &amp; Background</h3>
            </div>
            <div className="px-4 py-5 sm:p-6 space-y-5">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <Field label="Education Level">{agent.agent?.employmentStatus || '—'}</Field>
                <Field label="Course of Study">{agent.agent?.employmentType || '—'}</Field>
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
                  className="w-full"
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

          {/* Performance */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">Performance</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="shrink-0 bg-indigo-500 rounded-md p-3">
                  <BriefcaseIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Farmers Registered</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900 dark:text-gray-100">{agent._count.farmers}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-4 sm:px-6">
              <div className="text-sm">
                <Link href={`/farmers?agentId=${agent.id}`} className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
                  View all registered farmers
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

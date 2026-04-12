'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePermissions } from '@/components/PermissionProvider';
import { PERMISSIONS } from '@/lib/permissions';
import {
  ArrowLeftIcon,
  PencilIcon,
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  CalendarIcon,
  EnvelopeIcon,
  BriefcaseIcon,
} from '@heroicons/react/24/outline';

interface AgentDetails {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: string;
  isActive: boolean;
  lastLogin: string;
  createdAt: string;
  _count: { farmers: number };
  agent: {
    nin?: string;
    state?: string;
    localGovernment?: string;
    assignedState?: string;
    assignedLGA?: string;
    status?: string;
    photoUrl?: string;
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
  } | null;
}

export default function AgentDetailsClient({ id }: { id: string }) {
  const { hasPermission } = usePermissions();
  const [agent, setAgent] = useState<AgentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (loading) return <div className="p-6 text-center text-gray-500 dark:text-gray-400">Loading agent details…</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;
  if (!agent) return <div className="p-6 text-center text-gray-500 dark:text-gray-400">Agent not found</div>;

  const initials = `${agent.firstName?.[0] ?? ''}${agent.lastName?.[0] ?? ''}`.toUpperCase() || '?';
  const photoUrl = agent.agent?.photoUrl;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/agents"
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-4">
            {/* Avatar */}
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt={agent.displayName}
                className="h-14 w-14 rounded-full object-cover ring-2 ring-white dark:ring-gray-800 shadow"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold text-xl shadow ring-2 ring-white dark:ring-gray-800 select-none">
                {initials}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{agent.displayName}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Agent Profile</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          {hasPermission(PERMISSIONS.AGENTS_UPDATE) && (
            <Link
              href={`/agents/${id}/edit`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <PencilIcon className="-ml-1 mr-2 h-5 w-5 text-gray-500 dark:text-gray-400" />
              Edit
            </Link>
          )}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">Personal Information</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</label>
                  <div className="mt-1 flex items-center text-gray-900 dark:text-gray-100">
                    <UserIcon className="h-5 w-5 mr-2 text-gray-400 dark:text-gray-500 shrink-0" />
                    {agent.firstName} {agent.lastName}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                  <div className="mt-1 flex items-center text-gray-900 dark:text-gray-100 break-all">
                    <EnvelopeIcon className="h-5 w-5 mr-2 text-gray-400 dark:text-gray-500 shrink-0" />
                    {agent.email}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                  <div className="mt-1 flex items-center text-gray-900 dark:text-gray-100">
                    <PhoneIcon className="h-5 w-5 mr-2 text-gray-400 dark:text-gray-500 shrink-0" />
                    {agent.phoneNumber}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">NIN</label>
                  <div className="mt-1 text-gray-900 dark:text-gray-100 font-mono">
                    {agent.agent?.nin || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                      agent.isActive
                        ? 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/20 dark:text-green-400 dark:ring-green-500/30'
                        : 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-500/30'
                    }`}>
                      {agent.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Agent Type</label>
                  <div className="mt-1">
                    {agent.role === 'agent' && (
                      <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-900/20 dark:text-blue-400 dark:ring-blue-500/30">Enrollment</span>
                    )}
                    {agent.role === 'data_correction_agent' && (
                      <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-500/30">Correction</span>
                    )}
                    {agent.role === 'survey_agent' && (
                      <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20 dark:bg-purple-900/20 dark:text-purple-400 dark:ring-purple-500/30">Survey</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Joined</label>
                  <div className="mt-1 flex items-center text-gray-900 dark:text-gray-100">
                    <CalendarIcon className="h-5 w-5 mr-2 text-gray-400 dark:text-gray-500 shrink-0" />
                    {new Date(agent.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Assignment Details */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">Assignment Details</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Assigned State</label>
                  <div className="mt-1 flex items-center text-gray-900 dark:text-gray-100">
                    <MapPinIcon className="h-5 w-5 mr-2 text-gray-400 dark:text-gray-500 shrink-0" />
                    {agent.agent?.assignedState || 'Not Assigned'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Assigned LGA</label>
                  <div className="mt-1 text-gray-900 dark:text-gray-100">
                    {agent.agent?.assignedLGA || 'Not Assigned'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Residence State</label>
                  <div className="mt-1 text-gray-900 dark:text-gray-100">
                    {agent.agent?.state || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Residence LGA</label>
                  <div className="mt-1 text-gray-900 dark:text-gray-100">
                    {agent.agent?.localGovernment || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bank Details (shown only when data exists) */}
          {(agent.agent?.bankName || agent.agent?.accountNumber) && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">Bank Details</h3>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Bank Name</label>
                    <div className="mt-1 text-gray-900 dark:text-gray-100">{agent.agent?.bankName || 'N/A'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Account Number</label>
                    <div className="mt-1 text-gray-900 dark:text-gray-100 font-mono">{agent.agent?.accountNumber || 'N/A'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Account Name</label>
                    <div className="mt-1 text-gray-900 dark:text-gray-100">{agent.agent?.accountName || 'N/A'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Passport Photo */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">Passport Photo</h3>
            </div>
            <div className="px-4 py-5 flex justify-center">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt={agent.displayName}
                  className="h-40 w-40 rounded-lg object-cover ring-2 ring-gray-200 dark:ring-gray-700 shadow"
                />
              ) : (
                <div className="h-40 w-40 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex flex-col items-center justify-center text-indigo-600 dark:text-indigo-300 shadow ring-2 ring-gray-200 dark:ring-gray-700 select-none">
                  <span className="text-5xl font-bold">{initials}</span>
                  <span className="mt-2 text-xs text-indigo-400 dark:text-indigo-500">No photo</span>
                </div>
              )}
            </div>
          </div>

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

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  BriefcaseIcon
} from '@heroicons/react/24/outline';

interface AgentDetails {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  isActive: boolean;
  lastLogin: string;
  createdAt: string;
  _count: {
    farmers: number;
  };
  agent: {
    nin: string;
    state: string;
    localGovernment: string;
    assignedState: string;
    assignedLGA: string;
    status: string;
  } | null;
}

export default function AgentDetailsClient({ id }: { id: string }) {
  const router = useRouter();
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
      if (!res.ok) {
        throw new Error('Failed to fetch agent details');
      }
      const data = await res.json();
      setAgent(data);
    } catch (err) {
      setError('Error loading agent details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6 text-center">Loading agent details...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;
  if (!agent) return <div className="p-6 text-center">Agent not found</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/agents"
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{agent.displayName}</h1>
            <p className="text-sm text-gray-500">Agent Profile</p>
          </div>
        </div>
        <div className="flex gap-3">
          {hasPermission(PERMISSIONS.AGENTS_UPDATE) && (
            <Link
              href={`/agents/${id}/edit`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <PencilIcon className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
              Edit
            </Link>
          )}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Personal Information</h3>
            </div>
            <div className="px-4 py-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Full Name</label>
                  <div className="mt-1 flex items-center text-gray-900">
                    <UserIcon className="h-5 w-5 mr-2 text-gray-400" />
                    {agent.firstName} {agent.lastName}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Email</label>
                  <div className="mt-1 flex items-center text-gray-900">
                    <EnvelopeIcon className="h-5 w-5 mr-2 text-gray-400" />
                    {agent.email}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Phone</label>
                  <div className="mt-1 flex items-center text-gray-900">
                    <PhoneIcon className="h-5 w-5 mr-2 text-gray-400" />
                    {agent.phoneNumber}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">NIN</label>
                  <div className="mt-1 text-gray-900">
                    {agent.agent?.nin || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                      agent.isActive 
                        ? 'bg-green-50 text-green-700 ring-green-600/20' 
                        : 'bg-red-50 text-red-700 ring-red-600/20'
                    }`}>
                      {agent.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Joined</label>
                  <div className="mt-1 flex items-center text-gray-900">
                    <CalendarIcon className="h-5 w-5 mr-2 text-gray-400" />
                    {new Date(agent.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Assignment Details</h3>
            </div>
            <div className="px-4 py-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Assigned State</label>
                  <div className="mt-1 flex items-center text-gray-900">
                    <MapPinIcon className="h-5 w-5 mr-2 text-gray-400" />
                    {agent.agent?.assignedState || 'Not Assigned'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Assigned LGA</label>
                  <div className="mt-1 text-gray-900">
                    {agent.agent?.assignedLGA || 'Not Assigned'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Residence State</label>
                  <div className="mt-1 text-gray-900">
                    {agent.agent?.state || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Residence LGA</label>
                  <div className="mt-1 text-gray-900">
                    {agent.agent?.localGovernment || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Performance</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                  <BriefcaseIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Farmers Registered</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">{agent._count.farmers}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-4 sm:px-6">
              <div className="text-sm">
                <Link href={`/farmers?agentId=${agent.id}`} className="font-medium text-indigo-600 hover:text-indigo-500">
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

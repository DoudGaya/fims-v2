'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  Cog6ToothIcon, 
  ServerIcon, 
  UsersIcon, 
  ShieldCheckIcon,
  DocumentCheckIcon
} from '@heroicons/react/24/outline';

interface Stats {
  users: { total: number; agents: number; recent: number };
  farmers: { total: number };
  farms: { total: number; recent: number };
  certificates: { total: number; recent: number };
  system: { status: string; version: string };
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/settings/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch stats', error);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchStats();
    }
  }, [session]);

  const settingsLinks = [
    {
      name: 'Role Management',
      description: 'Manage system roles and permissions',
      href: '/settings/roles',
      icon: ShieldCheckIcon,
      color: 'bg-purple-500'
    },
    {
      name: 'System Logs',
      description: 'View system activity and audit logs',
      href: '/settings/logs',
      icon: DocumentCheckIcon,
      color: 'bg-blue-500'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings & System</h1>
        <p className="mt-1 text-sm text-gray-500">
          System configuration and overview.
        </p>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ServerIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">System Status</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {loading ? '...' : stats?.system.status === 'healthy' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Healthy
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Issues Detected
                        </span>
                      )}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <span className="text-gray-500">Version: {stats?.system.version}</span>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {loading ? '...' : stats?.users.total}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <span className="text-green-600 font-medium">+{stats?.users.recent}</span>
              <span className="text-gray-500"> new this week</span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Navigation */}
      <h2 className="text-lg font-medium text-gray-900 mt-8">Configuration</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {settingsLinks.map((link) => (
          <Link
            key={link.name}
            href={link.href}
            className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500"
          >
            <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${link.color}`}>
              <link.icon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900">{link.name}</p>
              <p className="text-sm text-gray-500 truncate">{link.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

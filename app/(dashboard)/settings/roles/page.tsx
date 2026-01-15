'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, ShieldCheckIcon, EyeIcon, PlusIcon } from '@heroicons/react/24/outline';

interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
}

export default function RolesPage() {
  const [systemRoles, setSystemRoles] = useState<Role[]>([]);
  const [customRoles, setCustomRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await fetch('/api/roles');
        if (res.ok) {
          const data = await res.json();
          setSystemRoles(data.systemRoles || []);
          setCustomRoles(data.customRoles || []);
        }
      } catch (error) {
        console.error('Failed to fetch roles', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRoles();
  }, []);

  const RoleList = ({ roles, title }: { roles: Role[], title: string }) => (
    <div className="mb-8">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul role="list" className="divide-y divide-gray-200">
          {roles.map((role) => (
            <li key={role.id}>
              <Link href={`/settings/roles/${role.id}`} className="block hover:bg-gray-50">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ShieldCheckIcon className={`h-6 w-6 ${role.isSystem ? 'text-gray-400' : 'text-green-600'}`} />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900 truncate">{role.name}</p>
                        <p className="text-sm text-gray-500">{role.description}</p>
                      </div>
                    </div>
                    <div className="ml-2 flex-shrink-0 flex items-center">
                      {role.isSystem && (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 mr-2">
                          System
                        </span>
                      )}
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
          {roles.length === 0 && (
            <li className="px-4 py-4 sm:px-6 text-sm text-gray-500 text-center">
              No roles found.
            </li>
          )}
        </ul>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/settings" className="mr-4 text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage system roles and their permissions.
            </p>
          </div>
        </div>
        <Link
          href="/settings/roles/create"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-ccsa-blue hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ccsa-blue"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          Create Role
        </Link>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading roles...</div>
      ) : (
        <>
          <RoleList roles={systemRoles} title="System Roles" />
          <RoleList roles={customRoles} title="Custom Roles" />
        </>
      )}
    </div>
  );
}

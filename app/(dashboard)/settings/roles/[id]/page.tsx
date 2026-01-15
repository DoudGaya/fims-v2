'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function RoleDetailsPage() {
  const params = useParams();
  const { id } = params;
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const res = await fetch(`/api/roles/${id}`);
        if (res.ok) {
          const data = await res.json();
          setRole(data.role);
        }
      } catch (error) {
        console.error('Failed to fetch role', error);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchRole();
    }
  }, [id]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!role) return <div className="p-8 text-center">Role not found</div>;

  return (
    <div className="max-w-3xl mx-auto py-6">
      <div className="mb-6">
        <Link
          href="/settings/roles"
          className="flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Roles
        </Link>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Role Details
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Permissions and details for {role.name}.
          </p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Role Name</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {role.name}
                {role.isSystem && (
                  <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                    System Role
                  </span>
                )}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {role.description}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Permissions</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {role.permissions && role.permissions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {role.permissions.map((perm) => (
                      <span
                        key={perm}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-green-100 text-green-800"
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-500 italic">No permissions assigned</span>
                )}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Created At</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {new Date(role.createdAt).toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

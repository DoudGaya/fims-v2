'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { farmerSchema } from '@/lib/validation';
import { usePermissions } from '@/components/PermissionProvider';
import { PERMISSIONS } from '@/lib/permissions';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function CreateFarmerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [clusters, setClusters] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm({
    resolver: zodResolver(farmerSchema),
    defaultValues: {
    }
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      if (!hasPermission(PERMISSIONS.FARMERS_CREATE)) {
        router.push('/farmers');
      } else {
        fetchClusters();
      }
    }
  }, [status, router, hasPermission]);

  const fetchClusters = async () => {
    try {
      const res = await fetch('/api/clusters');
      if (res.ok) {
        const data = await res.json();
        setClusters(data);
      }
    } catch (error) {
      console.error('Error fetching clusters:', error);
    }
  };

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      const res = await fetch('/api/farmers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create farmer');
      }

      router.push('/farmers');
    } catch (error: any) {
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto py-6">
      <div className="mb-6 flex items-center">
        <Link href="/farmers" className="mr-4 text-gray-500 hover:text-gray-700">
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Register New Farmer</h1>
      </div>

      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        {submitError && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{submitError}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            {/* Personal Information */}
            <div className="sm:col-span-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Personal Information</h3>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                First Name
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="firstName"
                  {...register('firstName')}
                  className="shadow-sm focus:ring-ccsa-blue focus:border-ccsa-blue block w-full sm:text-sm border-gray-300 rounded-md"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName.message as string}</p>
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="middleName" className="block text-sm font-medium text-gray-700">
                Middle Name
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="middleName"
                  {...register('middleName')}
                  className="shadow-sm focus:ring-ccsa-blue focus:border-ccsa-blue block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                Last Name
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="lastName"
                  {...register('lastName')}
                  className="shadow-sm focus:ring-ccsa-blue focus:border-ccsa-blue block w-full sm:text-sm border-gray-300 rounded-md"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName.message as string}</p>
                )}
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="phone"
                  {...register('phone')}
                  className="shadow-sm focus:ring-ccsa-blue focus:border-ccsa-blue block w-full sm:text-sm border-gray-300 rounded-md"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone.message as string}</p>
                )}
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="nin" className="block text-sm font-medium text-gray-700">
                NIN
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="nin"
                  {...register('nin')}
                  className="shadow-sm focus:ring-ccsa-blue focus:border-ccsa-blue block w-full sm:text-sm border-gray-300 rounded-md"
                />
                {errors.nin && (
                  <p className="mt-1 text-sm text-red-600">{errors.nin.message as string}</p>
                )}
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
                Gender
              </label>
              <div className="mt-1">
                <select
                  id="gender"
                  {...register('gender')}
                  className="shadow-sm focus:ring-ccsa-blue focus:border-ccsa-blue block w-full sm:text-sm border-gray-300 rounded-md"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                {errors.gender && (
                  <p className="mt-1 text-sm text-red-600">{errors.gender.message as string}</p>
                )}
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">
                Date of Birth
              </label>
              <div className="mt-1">
                <input
                  type="date"
                  id="dateOfBirth"
                  {...register('dateOfBirth')}
                  className="shadow-sm focus:ring-ccsa-blue focus:border-ccsa-blue block w-full sm:text-sm border-gray-300 rounded-md"
                />
                {errors.dateOfBirth && (
                  <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth.message as string}</p>
                )}
              </div>
            </div>

            {/* Location Information */}
            <div className="sm:col-span-6 pt-4 border-t border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Location & Cluster</h3>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                State
              </label>
              <div className="mt-1">
                <select
                  id="state"
                  {...register('state')}
                  className="shadow-sm focus:ring-ccsa-blue focus:border-ccsa-blue block w-full sm:text-sm border-gray-300 rounded-md"
                >
                  <option value="">Select State</option>
                  <option value="Kano">Kano</option>
                  <option value="Kaduna">Kaduna</option>
                  <option value="Jigawa">Jigawa</option>
                  {/* Add more states as needed */}
                </select>
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="clusterId" className="block text-sm font-medium text-gray-700">
                Cluster
              </label>
              <div className="mt-1">
                <select
                  id="clusterId"
                  {...register('clusterId')}
                  className="shadow-sm focus:ring-ccsa-blue focus:border-ccsa-blue block w-full sm:text-sm border-gray-300 rounded-md"
                >
                  <option value="">Select Cluster</option>
                  {clusters.map((cluster) => (
                    <option key={cluster.id} value={cluster.id}>
                      {cluster.name} ({cluster.state})
                    </option>
                  ))}
                </select>
                {errors.clusterId && (
                  <p className="mt-1 text-sm text-red-600">{errors.clusterId.message as string}</p>
                )}
              </div>
            </div>

            <div className="sm:col-span-6">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <div className="mt-1">
                <textarea
                  id="address"
                  rows={3}
                  {...register('address')}
                  className="shadow-sm focus:ring-ccsa-blue focus:border-ccsa-blue block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>

            {/* Farming Information */}
            <div className="sm:col-span-6 pt-4 border-t border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Farming Information</h3>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="primaryCrop" className="block text-sm font-medium text-gray-700">
                Primary Crop
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="primaryCrop"
                  {...register('primaryCrop')}
                  className="shadow-sm focus:ring-ccsa-blue focus:border-ccsa-blue block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="farmSize" className="block text-sm font-medium text-gray-700">
                Farm Size (Hectares)
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  step="0.01"
                  id="farmSize"
                  {...register('farmSize', { valueAsNumber: true })}
                  className="shadow-sm focus:ring-ccsa-blue focus:border-ccsa-blue block w-full sm:text-sm border-gray-300 rounded-md"
                />
                {errors.farmSize && (
                  <p className="mt-1 text-sm text-red-600">{errors.farmSize.message as string}</p>
                )}
              </div>
            </div>

          </div>

          <div className="pt-5">
            <div className="flex justify-end">
              <Link
                href="/farmers"
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ccsa-blue"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-ccsa-blue hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ccsa-blue disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usePermissions } from '@/components/PermissionProvider';
import { PERMISSIONS } from '@/lib/permissions';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const clusterSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  clusterLeadFirstName: z.string().min(1, "First Name is required"),
  clusterLeadLastName: z.string().min(1, "Last Name is required"),
  clusterLeadEmail: z.string().email("Invalid email address"),
  clusterLeadPhone: z.string().min(1, "Phone number is required"),
  clusterLeadNIN: z.string().optional(),
  clusterLeadState: z.string().optional(),
  clusterLeadLGA: z.string().optional(),
  clusterLeadWard: z.string().optional(),
  clusterLeadPollingUnit: z.string().optional(),
  clusterLeadPosition: z.string().optional(),
  clusterLeadAddress: z.string().optional(),
  clusterLeadDateOfBirth: z.string().optional(), // Handled as string in form, converted in API
  clusterLeadGender: z.string().optional(),
  clusterLeadMaritalStatus: z.string().optional(),
  clusterLeadEmploymentStatus: z.string().optional(),
  clusterLeadBVN: z.string().optional(),
  clusterLeadBankName: z.string().optional(),
  clusterLeadAccountNumber: z.string().optional(),
  clusterLeadAccountName: z.string().optional(),
  clusterLeadAlternativePhone: z.string().optional(),
  clusterLeadWhatsAppNumber: z.string().optional(),
  isActive: z.boolean().optional(),
});

type ClusterFormData = z.infer<typeof clusterSchema>;

export default function CreateClusterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClusterFormData>({
    resolver: zodResolver(clusterSchema),
    defaultValues: {
      isActive: true
    }
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      // if (!hasPermission(PERMISSIONS.CLUSTERS_CREATE)) {
      //   router.push('/clusters');
      // }
    }
  }, [status, router, hasPermission]);

  const onSubmit = async (data: ClusterFormData) => {
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      const res = await fetch('/api/clusters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create cluster');
      }

      router.push('/clusters');
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
    <div className="max-w-4xl mx-auto py-6">
      <div className="mb-6 flex items-center">
        <Link href="/clusters" className="mr-4 text-gray-500 hover:text-gray-700">
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create New Cluster</h1>
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 divide-y divide-gray-200">
          <div className="space-y-6 sm:space-y-5">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">Cluster Information</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Basic details about the cluster.
              </p>
            </div>

            <div className="space-y-6 sm:space-y-5">
              <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
                  Cluster Title *
                </label>
                <div className="mt-1 sm:mt-0 sm:col-span-2">
                  <input
                    type="text"
                    id="title"
                    {...register('title')}
                    className="max-w-lg block w-full shadow-sm focus:ring-green-500 focus:border-green-500 sm:max-w-xs sm:text-sm border-gray-300 rounded-md"
                  />
                  {errors.title && <p className="mt-2 text-sm text-red-600">{errors.title.message}</p>}
                </div>
              </div>

              <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
                  Description
                </label>
                <div className="mt-1 sm:mt-0 sm:col-span-2">
                  <textarea
                    id="description"
                    rows={3}
                    {...register('description')}
                    className="max-w-lg shadow-sm block w-full focus:ring-green-500 focus:border-green-500 sm:text-sm border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 space-y-6 sm:space-y-5">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">Cluster Lead Information</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Personal and contact details of the cluster lead.
              </p>
            </div>

            <div className="space-y-6 sm:space-y-5">
              <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
                <label htmlFor="clusterLeadFirstName" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
                  First Name *
                </label>
                <div className="mt-1 sm:mt-0 sm:col-span-2">
                  <input
                    type="text"
                    id="clusterLeadFirstName"
                    {...register('clusterLeadFirstName')}
                    className="max-w-lg block w-full shadow-sm focus:ring-green-500 focus:border-green-500 sm:max-w-xs sm:text-sm border-gray-300 rounded-md"
                  />
                  {errors.clusterLeadFirstName && <p className="mt-2 text-sm text-red-600">{errors.clusterLeadFirstName.message}</p>}
                </div>
              </div>

              <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
                <label htmlFor="clusterLeadLastName" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
                  Last Name *
                </label>
                <div className="mt-1 sm:mt-0 sm:col-span-2">
                  <input
                    type="text"
                    id="clusterLeadLastName"
                    {...register('clusterLeadLastName')}
                    className="max-w-lg block w-full shadow-sm focus:ring-green-500 focus:border-green-500 sm:max-w-xs sm:text-sm border-gray-300 rounded-md"
                  />
                  {errors.clusterLeadLastName && <p className="mt-2 text-sm text-red-600">{errors.clusterLeadLastName.message}</p>}
                </div>
              </div>

              <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
                <label htmlFor="clusterLeadEmail" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
                  Email *
                </label>
                <div className="mt-1 sm:mt-0 sm:col-span-2">
                  <input
                    type="email"
                    id="clusterLeadEmail"
                    {...register('clusterLeadEmail')}
                    className="max-w-lg block w-full shadow-sm focus:ring-green-500 focus:border-green-500 sm:max-w-xs sm:text-sm border-gray-300 rounded-md"
                  />
                  {errors.clusterLeadEmail && <p className="mt-2 text-sm text-red-600">{errors.clusterLeadEmail.message}</p>}
                </div>
              </div>

              <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
                <label htmlFor="clusterLeadPhone" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
                  Phone *
                </label>
                <div className="mt-1 sm:mt-0 sm:col-span-2">
                  <input
                    type="text"
                    id="clusterLeadPhone"
                    {...register('clusterLeadPhone')}
                    className="max-w-lg block w-full shadow-sm focus:ring-green-500 focus:border-green-500 sm:max-w-xs sm:text-sm border-gray-300 rounded-md"
                  />
                  {errors.clusterLeadPhone && <p className="mt-2 text-sm text-red-600">{errors.clusterLeadPhone.message}</p>}
                </div>
              </div>

              <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
                <label htmlFor="clusterLeadNIN" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
                  NIN
                </label>
                <div className="mt-1 sm:mt-0 sm:col-span-2">
                  <input
                    type="text"
                    id="clusterLeadNIN"
                    {...register('clusterLeadNIN')}
                    className="max-w-lg block w-full shadow-sm focus:ring-green-500 focus:border-green-500 sm:max-w-xs sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
                <label htmlFor="clusterLeadAddress" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
                  Address
                </label>
                <div className="mt-1 sm:mt-0 sm:col-span-2">
                  <input
                    type="text"
                    id="clusterLeadAddress"
                    {...register('clusterLeadAddress')}
                    className="max-w-lg block w-full shadow-sm focus:ring-green-500 focus:border-green-500 sm:max-w-xs sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              {/* Bank Details */}
              <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
                <label htmlFor="clusterLeadBankName" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
                  Bank Name
                </label>
                <div className="mt-1 sm:mt-0 sm:col-span-2">
                  <input
                    type="text"
                    id="clusterLeadBankName"
                    {...register('clusterLeadBankName')}
                    className="max-w-lg block w-full shadow-sm focus:ring-green-500 focus:border-green-500 sm:max-w-xs sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
                <label htmlFor="clusterLeadAccountNumber" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
                  Account Number
                </label>
                <div className="mt-1 sm:mt-0 sm:col-span-2">
                  <input
                    type="text"
                    id="clusterLeadAccountNumber"
                    {...register('clusterLeadAccountNumber')}
                    className="max-w-lg block w-full shadow-sm focus:ring-green-500 focus:border-green-500 sm:max-w-xs sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
                <label htmlFor="clusterLeadAccountName" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
                  Account Name
                </label>
                <div className="mt-1 sm:mt-0 sm:col-span-2">
                  <input
                    type="text"
                    id="clusterLeadAccountName"
                    {...register('clusterLeadAccountName')}
                    className="max-w-lg block w-full shadow-sm focus:ring-green-500 focus:border-green-500 sm:max-w-xs sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
                <label htmlFor="clusterLeadBVN" className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
                  BVN
                </label>
                <div className="mt-1 sm:mt-0 sm:col-span-2">
                  <input
                    type="text"
                    id="clusterLeadBVN"
                    {...register('clusterLeadBVN')}
                    className="max-w-lg block w-full shadow-sm focus:ring-green-500 focus:border-green-500 sm:max-w-xs sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-5">
            <div className="flex justify-end">
              <Link
                href="/clusters"
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Cluster'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

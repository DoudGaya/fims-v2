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

// Agent validation schema
const agentSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  state: z.string().optional(),
  lga: z.string().optional(),
  assignedState: z.string().optional(),
  assignedLGA: z.string().optional(),
  nin: z.string().optional(),
});

export default function CreateAgentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(agentSchema),
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      if (!hasPermission(PERMISSIONS.AGENTS_CREATE)) {
        router.push('/agents');
      }
    }
  }, [status, router, hasPermission]);

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create agent');
      }

      router.push('/agents');
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
        <Link href="/agents" className="mr-4 text-gray-500 hover:text-gray-700">
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Register New Agent</h1>
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

            <div className="sm:col-span-3">
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

            <div className="sm:col-span-3">
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
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  id="email"
                  {...register('email')}
                  className="shadow-sm focus:ring-ccsa-blue focus:border-ccsa-blue block w-full sm:text-sm border-gray-300 rounded-md"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message as string}</p>
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
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  id="password"
                  {...register('password')}
                  className="shadow-sm focus:ring-ccsa-blue focus:border-ccsa-blue block w-full sm:text-sm border-gray-300 rounded-md"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message as string}</p>
                )}
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="nin" className="block text-sm font-medium text-gray-700">
                NIN (Optional)
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="nin"
                  {...register('nin')}
                  className="shadow-sm focus:ring-ccsa-blue focus:border-ccsa-blue block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>

            {/* Assignment Information */}
            <div className="sm:col-span-6 pt-4 border-t border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Assignment</h3>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="assignedState" className="block text-sm font-medium text-gray-700">
                Assigned State
              </label>
              <div className="mt-1">
                <select
                  id="assignedState"
                  {...register('assignedState')}
                  className="shadow-sm focus:ring-ccsa-blue focus:border-ccsa-blue block w-full sm:text-sm border-gray-300 rounded-md"
                >
                  <option value="">Select State</option>
                  <option value="Kano">Kano</option>
                  <option value="Kaduna">Kaduna</option>
                  <option value="Jigawa">Jigawa</option>
                </select>
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="assignedLGA" className="block text-sm font-medium text-gray-700">
                Assigned LGA
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="assignedLGA"
                  {...register('assignedLGA')}
                  className="shadow-sm focus:ring-ccsa-blue focus:border-ccsa-blue block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>

          </div>

          <div className="pt-5">
            <div className="flex justify-end">
              <Link
                href="/agents"
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ccsa-blue"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-ccsa-blue hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ccsa-blue disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Agent'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

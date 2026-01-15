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
import { use } from 'react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

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
  clusterLeadDateOfBirth: z.string().optional(),
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

export default function EditClusterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ClusterFormData>({
    resolver: zodResolver(clusterSchema),
  });

  const isActive = watch('isActive');

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    // Check permission
    if (!hasPermission(PERMISSIONS.CLUSTERS_UPDATE)) {
      router.push('/clusters');
      return;
    }

    if (status === 'authenticated') {
      fetchCluster();
    }
  }, [status, router, hasPermission, id]);

  const fetchCluster = async () => {
    try {
      const res = await fetch(`/api/clusters/${id}`);
      if (!res.ok) {
        throw new Error('Failed to fetch cluster');
      }
      const data = await res.json();
      const cluster = data.cluster; // Extract the cluster object from the response

      // Format date for input
      if (cluster.clusterLeadDateOfBirth) {
        cluster.clusterLeadDateOfBirth = new Date(cluster.clusterLeadDateOfBirth).toISOString().split('T')[0];
      }

      // Handle nulls by converting to empty strings or undefined where appropriate for the form
      const formData = {
        ...cluster,
        description: cluster.description || '',
        clusterLeadNIN: cluster.clusterLeadNIN || '',
        clusterLeadState: cluster.clusterLeadState || '',
        clusterLeadLGA: cluster.clusterLeadLGA || '',
        clusterLeadWard: cluster.clusterLeadWard || '',
        clusterLeadPollingUnit: cluster.clusterLeadPollingUnit || '',
        clusterLeadPosition: cluster.clusterLeadPosition || '',
        clusterLeadAddress: cluster.clusterLeadAddress || '',
        clusterLeadGender: cluster.clusterLeadGender || '',
        clusterLeadMaritalStatus: cluster.clusterLeadMaritalStatus || '',
        clusterLeadEmploymentStatus: cluster.clusterLeadEmploymentStatus || '',
        clusterLeadBVN: cluster.clusterLeadBVN || '',
        clusterLeadBankName: cluster.clusterLeadBankName || '',
        clusterLeadAccountNumber: cluster.clusterLeadAccountNumber || '',
        clusterLeadAccountName: cluster.clusterLeadAccountName || '',
        clusterLeadAlternativePhone: cluster.clusterLeadAlternativePhone || '',
        clusterLeadWhatsAppNumber: cluster.clusterLeadWhatsAppNumber || '',
      };

      reset(formData);
    } catch (error) {
      console.error('Error fetching cluster:', error);
      setSubmitError('Failed to load cluster details');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ClusterFormData) => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch(`/api/clusters/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update cluster');
      }

      router.push('/clusters');
    } catch (error: any) {
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/clusters">
              <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Edit Cluster</h1>
        </div>
      </div>

      {submitError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded text-red-700">
          <p className="text-sm">{submitError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Cluster Information</CardTitle>
            <CardDescription>Update the cluster details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Cluster Title *</Label>
                <Input id="title" {...register('title')} placeholder="e.g. North West Zone A" />
                {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register('description')} rows={3} placeholder="Brief description..." />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={isActive}
                onCheckedChange={(checked) => setValue('isActive', checked as boolean)}
              />
              <Label htmlFor="isActive" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Cluster is Active
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cluster Lead Information</CardTitle>
            <CardDescription>Personal and contact details of the assigned lead.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" {...register('clusterLeadFirstName')} />
                {errors.clusterLeadFirstName && <p className="text-sm text-red-600">{errors.clusterLeadFirstName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input id="lastName" {...register('clusterLeadLastName')} />
                {errors.clusterLeadLastName && <p className="text-sm text-red-600">{errors.clusterLeadLastName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" {...register('clusterLeadEmail')} />
                {errors.clusterLeadEmail && <p className="text-sm text-red-600">{errors.clusterLeadEmail.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input id="phone" {...register('clusterLeadPhone')} />
                {errors.clusterLeadPhone && <p className="text-sm text-red-600">{errors.clusterLeadPhone.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="nin">NIN</Label>
                <Input id="nin" {...register('clusterLeadNIN')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...register('clusterLeadAddress')} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Details</CardTitle>
            <CardDescription>Bank account information for the cluster lead.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input id="bankName" {...register('clusterLeadBankName')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input id="accountNumber" {...register('clusterLeadAccountNumber')} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="accountName">Account Name</Label>
                <Input id="accountName" {...register('clusterLeadAccountName')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bvn">BVN</Label>
                <Input id="bvn" {...register('clusterLeadBVN')} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild>
            <Link href="/clusters">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}

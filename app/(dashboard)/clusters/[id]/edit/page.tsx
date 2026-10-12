'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usePermissions } from '@/components/PermissionProvider';
import { PERMISSIONS } from '@/lib/permissions';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

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
    formState: { errors },
  } = useForm<ClusterFormData>({
    resolver: zodResolver(clusterSchema),
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      // if (!hasPermission(PERMISSIONS.CLUSTERS_UPDATE)) {
      //   router.push('/clusters');
      // } else {
        fetchCluster();
      // }
    }
  }, [status, router, hasPermission, id]);

  const fetchCluster = async () => {
    try {
      const res = await fetch(`/api/clusters/${id}`);
      if (!res.ok) {
        throw new Error('Failed to fetch cluster');
      }
      const data = await res.json();
      
      // Format date for input
      if (data.clusterLeadDateOfBirth) {
        data.clusterLeadDateOfBirth = new Date(data.clusterLeadDateOfBirth).toISOString().split('T')[0];
      }
      
      // Handle nulls by converting to empty strings or undefined where appropriate for the form
      const formData = {
        ...data,
        description: data.description || '',
        clusterLeadNIN: data.clusterLeadNIN || '',
        clusterLeadState: data.clusterLeadState || '',
        clusterLeadLGA: data.clusterLeadLGA || '',
        clusterLeadWard: data.clusterLeadWard || '',
        clusterLeadPollingUnit: data.clusterLeadPollingUnit || '',
        clusterLeadPosition: data.clusterLeadPosition || '',
        clusterLeadAddress: data.clusterLeadAddress || '',
        clusterLeadGender: data.clusterLeadGender || '',
        clusterLeadMaritalStatus: data.clusterLeadMaritalStatus || '',
        clusterLeadEmploymentStatus: data.clusterLeadEmploymentStatus || '',
        clusterLeadBVN: data.clusterLeadBVN || '',
        clusterLeadBankName: data.clusterLeadBankName || '',
        clusterLeadAccountNumber: data.clusterLeadAccountNumber || '',
        clusterLeadAccountName: data.clusterLeadAccountName || '',
        clusterLeadAlternativePhone: data.clusterLeadAlternativePhone || '',
        clusterLeadWhatsAppNumber: data.clusterLeadWhatsAppNumber || '',
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Link href="/clusters">
          <Button variant="outline" size="icon" className="rounded-lg shadow-xs">
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Edit Cluster</h1>
          <p className="text-sm text-muted-foreground">Modify the cluster region details and contact info.</p>
        </div>
      </div>

      {submitError && (
        <div className="bg-destructive/15 border-l-4 border-destructive p-4 rounded-md">
          <p className="text-sm text-destructive-foreground font-medium">{submitError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="border-border shadow-xs">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Cluster Details</CardTitle>
            <CardDescription>Basic information about this cluster region.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Cluster Title <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                id="title"
                {...register('title')}
                placeholder="e.g. Kano East Rice Cluster"
                className={errors.title ? "border-destructive focus-visible:ring-destructive/20" : ""}
              />
              {errors.title && <p className="text-xs font-semibold text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </Label>
              <Textarea
                id="description"
                rows={3}
                {...register('description')}
                placeholder="Provide a brief description of the cluster area, crop focus, or boundaries."
              />
            </div>

            <div className="flex items-center space-x-3 rounded-lg border border-border bg-card p-4 shadow-xs">
              <input
                id="isActive"
                type="checkbox"
                {...register('isActive')}
                className="h-4 w-4 rounded border-gray-300 text-blue-700 focus:ring-blue-700 dark:border-gray-600 dark:text-blue-400 transition-colors cursor-pointer"
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="isActive" className="text-sm font-semibold text-foreground cursor-pointer">
                  Active Status
                </Label>
                <p className="text-xs text-muted-foreground">
                  This cluster is active and visible across the system.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Cluster Lead Information</CardTitle>
            <CardDescription>Personal, contact, and banking details of the assigned cluster lead.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-6">
            <div className="border-b border-border pb-2">
              <h4 className="text-sm font-semibold text-foreground">Personal Details</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label htmlFor="clusterLeadFirstName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  id="clusterLeadFirstName"
                  {...register('clusterLeadFirstName')}
                  placeholder="First Name"
                  className={errors.clusterLeadFirstName ? "border-destructive focus-visible:ring-destructive/20" : ""}
                />
                {errors.clusterLeadFirstName && <p className="text-xs font-semibold text-destructive">{errors.clusterLeadFirstName.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="clusterLeadLastName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  id="clusterLeadLastName"
                  {...register('clusterLeadLastName')}
                  placeholder="Last Name"
                  className={errors.clusterLeadLastName ? "border-destructive focus-visible:ring-destructive/20" : ""}
                />
                {errors.clusterLeadLastName && <p className="text-xs font-semibold text-destructive">{errors.clusterLeadLastName.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="clusterLeadEmail" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="email"
                  id="clusterLeadEmail"
                  {...register('clusterLeadEmail')}
                  placeholder="email@example.com"
                  className={errors.clusterLeadEmail ? "border-destructive focus-visible:ring-destructive/20" : ""}
                />
                {errors.clusterLeadEmail && <p className="text-xs font-semibold text-destructive">{errors.clusterLeadEmail.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="clusterLeadPhone" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Phone <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  id="clusterLeadPhone"
                  {...register('clusterLeadPhone')}
                  placeholder="Phone Number"
                  className={errors.clusterLeadPhone ? "border-destructive focus-visible:ring-destructive/20" : ""}
                />
                {errors.clusterLeadPhone && <p className="text-xs font-semibold text-destructive">{errors.clusterLeadPhone.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="clusterLeadNIN" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  NIN
                </Label>
                <Input
                  type="text"
                  id="clusterLeadNIN"
                  {...register('clusterLeadNIN')}
                  placeholder="National Identification Number"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="clusterLeadAddress" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Address
                </Label>
                <Input
                  type="text"
                  id="clusterLeadAddress"
                  {...register('clusterLeadAddress')}
                  placeholder="Lead Physical Address"
                />
              </div>
            </div>

            <div className="border-b border-border pt-4 pb-2">
              <h4 className="text-sm font-semibold text-foreground">Financial &amp; Bank Details</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-1.5">
                <Label htmlFor="clusterLeadBankName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Bank Name
                </Label>
                <Input
                  type="text"
                  id="clusterLeadBankName"
                  {...register('clusterLeadBankName')}
                  placeholder="Bank Name"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="clusterLeadAccountNumber" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Account Number
                </Label>
                <Input
                  type="text"
                  id="clusterLeadAccountNumber"
                  {...register('clusterLeadAccountNumber')}
                  placeholder="Account Number"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="clusterLeadAccountName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Account Name
                </Label>
                <Input
                  type="text"
                  id="clusterLeadAccountName"
                  {...register('clusterLeadAccountName')}
                  placeholder="Account Name"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="clusterLeadBVN" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  BVN
                </Label>
                <Input
                  type="text"
                  id="clusterLeadBVN"
                  {...register('clusterLeadBVN')}
                  placeholder="Bank Verification Number"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-4">
          <Link href="/clusters">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting} className="min-w-32">
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}

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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Create New Cluster</h1>
          <p className="text-sm text-muted-foreground">Setup a new cluster region and assign its lead contact.</p>
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
            <CardTitle className="text-lg font-bold text-foreground">Cluster Details</CardTitle>
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
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground">Cluster Lead Information</CardTitle>
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
              <h4 className="text-sm font-semibold text-foreground">Financial & Bank Details</h4>
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
            {isSubmitting ? 'Creating...' : 'Create Cluster'}
          </Button>
        </div>
      </form>
    </div>
  );
}

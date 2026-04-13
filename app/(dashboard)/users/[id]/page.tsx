'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { usePermissions } from '@/components/PermissionProvider';
import { PERMISSIONS } from '@/lib/permissions';
import { ArrowLeftIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface Role {
  id: string;
  name: string;
  description: string;
}

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const { data: session, status } = useSession();
  const { hasPermission } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    roleId: '',
    isActive: true
  });

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch(`/api/users/${id}`);
      if (!res.ok) {
        throw new Error('Failed to fetch user details');
      }
      const user = await res.json();

      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        password: '', // Don't populate password
        roleId: user.userRoles && user.userRoles.length > 0 ? user.userRoles[0].role.id : '',
        isActive: user.isActive
      });
    } catch (err) {
      console.error(err);
      setError('Failed to load user details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (!hasPermission(PERMISSIONS.USERS_UPDATE)) {
      router.push('/users');
      return;
    }

    const fetchRoles = async () => {
      try {
        const res = await fetch('/api/roles');
        if (res.ok) {
          const data = await res.json();
          setRoles(data.roles || []);
        }
      } catch (err) {
        console.error('Failed to fetch roles', err);
      }
    };

    if (id) {
      Promise.all([fetchRoles(), fetchUser()]);
    }
  }, [id, fetchUser, status, router, hasPermission]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        ...formData,
        password: formData.password || undefined // Only send if provided
      };

      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update user');
      }

      router.push('/users');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600" />
    </div>
  );
  if (error && !formData.email) return <div className="p-8 text-center text-red-600">{error}</div>;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link
          href="/users"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1.5" />
          Back to Users
        </Link>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 rounded-r-md">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1 — Personal Details */}
        <Card>
          <CardHeader>
            <CardTitle>Edit User</CardTitle>
            <CardDescription>Update account information and credentials.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                New Password <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  minLength={8}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Leave blank to keep current password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword
                    ? <EyeSlashIcon className="h-4 w-4" />
                    : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2 — Role & Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Role &amp; Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roleId">Assign Role</Label>
              <Select
                value={formData.roleId || undefined}
                onValueChange={(value) => setFormData(prev => ({ ...prev, roleId: value }))}
              >
                <SelectTrigger id="roleId">
                  <SelectValue placeholder="Select a role…" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name} — {role.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: !!checked }))}
              />
              <div>
                <Label htmlFor="isActive" className="cursor-pointer">Active Account</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Allow this user to log in.</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3">
            <Button variant="outline" asChild>
              <Link href="/users">Cancel</Link>
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

type AccountType = 'admin' | 'enrollment_agent' | 'correction_agent' | 'survey_agent';

const ACCOUNT_TYPE_CONFIG: { type: AccountType; label: string; desc: string; color: string }[] = [
  { type: 'admin',            label: 'Admin / Web User',   desc: 'Dashboard access, manage users & settings',       color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  { type: 'enrollment_agent', label: 'Enrollment Agent',   desc: 'Enroll farmers in the field via mobile app',       color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { type: 'correction_agent', label: 'Correction Agent',   desc: 'Update and verify farmer records',                 color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { type: 'survey_agent',     label: 'Survey Agent',       desc: 'Conduct field surveys and data collection',        color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
];

export default function CreateUserPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    roleId: '',
    accountType: 'admin' as AccountType,
    isActive: true,
  });

  const isAgentType = formData.accountType !== 'admin';

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (!hasPermission(PERMISSIONS.USERS_CREATE)) {
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
    fetchRoles();
  }, [status, router, hasPermission]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create user');
      }

      router.push('/users');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
        {/* Card 1 — Account Type */}
        <Card>
          <CardHeader>
            <CardTitle>Account Type</CardTitle>
            <CardDescription>Choose the type of account to create.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {ACCOUNT_TYPE_CONFIG.map(({ type, label, desc, color }) => (
                <div
                  key={type}
                  onClick={() => setFormData(prev => ({ ...prev, accountType: type }))}
                  className={`cursor-pointer rounded-lg border p-4 transition-all ${
                    formData.accountType === type
                      ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-950 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>
                    {label}
                  </span>
                  <p className="mt-2 text-xs text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Card 2 — Personal Details */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Details</CardTitle>
            <CardDescription>Basic account information.</CardDescription>
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
                  placeholder="John"
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
                  placeholder="Doe"
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
                placeholder="john@example.com"
              />
            </div>
            {isAgentType && (
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+234..."
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={handleChange}
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
              <p className="text-xs text-muted-foreground">Must be at least 8 characters.</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3 — Role & Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Role &amp; Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isAgentType && (
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
            )}
            <div className="flex items-start gap-3">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: !!checked }))}
              />
              <div>
                <Label htmlFor="isActive" className="cursor-pointer">Active Account</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Allow this user to log in immediately.</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3">
            <Button variant="outline" asChild>
              <Link href="/users">Cancel</Link>
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

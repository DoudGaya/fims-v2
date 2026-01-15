'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePermissions, PermissionGate } from '@/components/PermissionProvider';
import { PERMISSIONS } from '@/lib/permissions';
import {
  UserIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  KeyIcon,
  UsersIcon,
  ChartPieIcon
} from '@heroicons/react/24/outline';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';

// Permission Categories for display
const PERMISSION_CATEGORIES = [
  { title: 'Users', prefix: 'users' },
  { title: 'Agents', prefix: 'agents' },
  { title: 'Farmers', prefix: 'farmers' },
  { title: 'Farms', prefix: 'farms' },
  { title: 'Clusters', prefix: 'clusters' },
  { title: 'Certificates', prefix: 'certificates' },
  { title: 'Roles', prefix: 'roles' },
  { title: 'Analytics', prefix: 'analytics' },
  { title: 'Dashboard', prefix: 'dashboard' },
  { title: 'Settings', prefix: 'settings' },
  { title: 'System', prefix: 'system' },
];

interface User {
  id: string;
  name: string;
  email: string;
  roles: { id: string; name: string }[];
  isActive: boolean;
  lastLogin: string;
  createdAt: string;
  permissions?: string[];
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  isActive: boolean;
  _count?: {
    users: number; // If API returns count
  };
}

export default function UsersClient() {
  const { data: session } = useSession();
  const { hasPermission } = usePermissions();
  const router = useRouter();

  // Tab State
  const [activeTab, setActiveTab] = useState('users');

  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [error, setError] = useState('');

  // User Filter States
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Role Form States
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleFormData, setRoleFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
    isActive: true
  });
  const [roleSubmitting, setRoleSubmitting] = useState(false);


  // Fetch Users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search,
      });

      const res = await fetch(`/api/users?${params}`);
      if (!res.ok) {
        if (res.status === 403) return; // Silent fail if no permission
        throw new Error('Failed to fetch users');
      }

      const data = await res.json();
      setUsers(data.users);
      setTotalPages(data.pagination.pages);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  // Fetch Roles
  const fetchRoles = useCallback(async () => {
    setRolesLoading(true);
    try {
      const res = await fetch('/api/roles');
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles || []);
      }
    } catch (err) {
      console.error('Failed to fetch roles', err);
    } finally {
      setRolesLoading(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  // User Delete
  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete user');

      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    } finally {
      setDeleting(null);
    }
  };

  // Role Management
  const handleOpenRoleModal = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setRoleFormData({
        name: role.name,
        description: role.description || '',
        permissions: Array.isArray(role.permissions) ? role.permissions : [],
        isActive: role.isActive
      });
    } else {
      setEditingRole(null);
      setRoleFormData({
        name: '',
        description: '',
        permissions: [],
        isActive: true
      });
    }
    setIsRoleModalOpen(true);
  };

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoleSubmitting(true);
    try {
      const url = editingRole ? `/api/roles/${editingRole.id}` : '/api/roles';
      const method = editingRole ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleFormData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save role');
      }

      await fetchRoles();
      setIsRoleModalOpen(false);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setRoleSubmitting(false);
    }
  };

  const handleRoleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this role? This might affect users assigned to it.')) return;
    try {
      const res = await fetch(`/api/roles/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete role');
      fetchRoles();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const togglePermission = (perm: string) => {
    setRoleFormData(prev => {
      const exists = prev.permissions.includes(perm);
      if (exists) {
        return { ...prev, permissions: prev.permissions.filter(p => p !== perm) };
      } else {
        return { ...prev, permissions: [...prev.permissions, perm] };
      }
    });
  };

  // Analytics
  const activeUsersCount = users.filter(u => u.isActive).length;
  // Simple role distribution from currently fetched users (approximate for page 1 but gives idea)
  // For better accuracy we'd need an analytics endpoint, but we can do client side for now on loaded data
  // or just use the stats cards

  const roleDistribution = users.reduce((acc, user) => {
    const roleName = user.roles[0]?.name || 'No Role';
    acc[roleName] = (acc[roleName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(roleDistribution).map(([name, value]) => ({ name, value }));
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  if (error) {
    return (
      <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-1">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">User Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Control access, manage roles, and monitor system users.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
            <UsersIcon className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
            <CheckCircleIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{activeUsersCount}</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-sm font-medium text-gray-600">Total Roles</CardTitle>
            <ShieldCheckIcon className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{roles.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-sm font-medium text-gray-600">System Roles</CardTitle>
            <KeyIcon className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{roles.filter(r => r.isSystem).length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4" /> Users
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <ShieldCheckIcon className="h-4 w-4" /> Roles
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <KeyIcon className="h-4 w-4" /> Permissions
          </TabsTrigger>
        </TabsList>

        {/* USERS TAB */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-between items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {hasPermission(PERMISSIONS.USERS_CREATE) && (
              <Button asChild className="bg-green-600 hover:bg-green-700">
                <Link href="/users/create">
                  <PlusIcon className="mr-2 h-4 w-4" /> New User
                </Link>
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={4} className="text-center h-24">Loading...</TableCell></TableRow>
                    ) : users.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center h-24">No users found.</TableCell></TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{user.name}</span>
                              <span className="text-xs text-gray-500">{user.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {user.roles.map(r => (
                                <Badge key={r.id} variant="secondary" className="font-normal text-xs">{r.name}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.isActive ?
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-none">Active</Badge>
                              : <Badge variant="destructive">Inactive</Badge>}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {hasPermission(PERMISSIONS.USERS_UPDATE) && (
                                <Link href={`/users/${user.id}`} title="Edit">
                                  <PencilIcon className="h-4 w-4 text-blue-600 hover:text-blue-800" />
                                </Link>
                              )}
                              {hasPermission(PERMISSIONS.USERS_DELETE) && (
                                <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-800" disabled={user.id === session?.user?.id}>
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {/* Pagination */}
              <div className="flex justify-between items-center py-4 px-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
              </div>
            </Card>

            {/* Chart Side */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">User Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ROLES TAB */}
        <TabsContent value="roles" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">System Roles</h2>
            {hasPermission(PERMISSIONS.ROLES_CREATE) && (
              <Button onClick={() => handleOpenRoleModal()} className="bg-indigo-600 hover:bg-indigo-700">
                <PlusIcon className="mr-2 h-4 w-4" /> Create Role
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map(role => (
              <Card key={role.id} className="relative overflow-hidden">
                {role.isSystem && <div className="absolute top-0 right-0 p-1 bg-gray-100 rounded-bl text-[10px] text-gray-500 font-mono">SYSTEM</div>}
                <CardHeader className="pb-2">
                  <CardTitle className="flex justify-between items-center">
                    {role.name}
                    {!role.isSystem && (
                      <div className="flex gap-2">
                        {hasPermission(PERMISSIONS.ROLES_UPDATE) && (
                          <button onClick={() => handleOpenRoleModal(role)} className="p-1 hover:bg-gray-100 rounded text-blue-600">
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        )}
                        {hasPermission(PERMISSIONS.ROLES_DELETE) && (
                          <button onClick={() => handleRoleDelete(role.id)} className="p-1 hover:bg-gray-100 rounded text-red-600">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </CardTitle>
                  <CardDescription>{role.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(Array.isArray(role.permissions) ? role.permissions : []).slice(0, 5).map(perm => (
                      <Badge key={perm} variant="outline" className="text-[10px] text-gray-500">{perm}</Badge>
                    ))}
                    {((Array.isArray(role.permissions) ? role.permissions : []).length || 0) > 5 && (
                      <Badge variant="outline" className="text-[10px] text-gray-500">+{(Array.isArray(role.permissions) ? role.permissions : []).length - 5} more</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* PERMISSIONS TAB */}
        <TabsContent value="permissions">
          <div className="space-y-4">
            {PERMISSION_CATEGORIES.map(category => {
              // Filter permissions matching this category
              const categoryPermissions = Object.values(PERMISSIONS).filter(p => p.startsWith(category.prefix));

              if (categoryPermissions.length === 0) return null;

              return (
                <Card key={category.prefix}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{category.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                      {categoryPermissions.map(perm => (
                        <div key={perm} className="flex items-center gap-2 p-2 rounded border bg-gray-50/50">
                          <KeyIcon className="h-4 w-4 text-gray-400" />
                          <code className="text-xs text-gray-700 font-mono">{perm}</code>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Role Dialog */}
      <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
            <DialogDescription>Define permissions for this role.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRoleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role Name</Label>
                <Input
                  value={roleFormData.name}
                  onChange={e => setRoleFormData({ ...roleFormData, name: e.target.value })}
                  required
                  disabled={editingRole?.isSystem}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={roleFormData.description}
                  onChange={e => setRoleFormData({ ...roleFormData, description: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">Permissions</Label>
              <div className="border rounded-md p-4 space-y-4 h-[400px] overflow-y-auto bg-gray-50">
                {PERMISSION_CATEGORIES.map(cat => {
                  const catPerms = Object.values(PERMISSIONS).filter(p => p.startsWith(cat.prefix));
                  if (catPerms.length === 0) return null;

                  return (
                    <div key={cat.prefix} className="bg-white p-3 rounded shadow-sm">
                      <h4 className="font-medium text-sm mb-2 uppercase text-gray-500">{cat.title}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {catPerms.map(perm => (
                          <div key={perm} className="flex items-center space-x-2">
                            <Checkbox
                              id={perm}
                              checked={roleFormData.permissions.includes(perm)}
                              onCheckedChange={() => togglePermission(perm)}
                              disabled={editingRole?.isSystem} // Prevent editing system roles? Or limit it. Let's limit it for safety.
                            />
                            <Label htmlFor={perm} className="text-xs font-normal cursor-pointer font-mono">{perm}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRoleModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={roleSubmitting || (editingRole?.isSystem)}>
                {roleSubmitting ? 'Saving...' : 'Save Role'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

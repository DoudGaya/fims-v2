'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  KeyIcon,
  PlusIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  XCircleIcon,
  CheckCircleIcon,
  EyeIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  InboxIcon,
  UserPlusIcon,
  BuildingOffice2Icon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const VALID_SCOPES = [
  { id: 'farmers:read', label: 'Farmers', description: 'Read farmer profiles' },
  { id: 'farms:read', label: 'Farms', description: 'Read farm records' },
  { id: 'clusters:read', label: 'Clusters', description: 'Read cluster/group data' },
  { id: 'analytics:read', label: 'Analytics', description: 'Read aggregate statistics' },
  { id: 'nin:verify', label: 'NIN Verification', description: 'Verify Nigerian National Identification Numbers' },
];

interface ApiKey {
  id: string;
  keyPrefix: string;
  name: string;
  description: string | null;
  scopes: string[];
  allowSensitiveFields: boolean;
  rateLimit: number;
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  requestCount: number;
  createdAt: string;
  createdBy: { displayName: string; email: string } | null;
}

interface CreatedKey {
  id: string;
  token: string;
  name: string;
}

export default function ApiKeysPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purgingDemo, setPurgingDemo] = useState(false);

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null);
  const [copied, setCopied] = useState(false);

  // Direct Client Account Dialog
  const [showDirectAccount, setShowDirectAccount] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [createdAccountResult, setCreatedAccountResult] = useState<any | null>(null);
  const [accountForm, setAccountForm] = useState({
    organizationName: '',
    rcNumber: '',
    contactName: '',
    email: '',
    phone: '',
    scopes: ['nin:verify', 'farmers:read', 'farms:read'] as string[],
    rateLimit: 120,
    monthlyQuota: 50000,
    allowSensitiveFields: false,
    sendEmail: true,
  });

  // Form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    scopes: [] as string[],
    rateLimit: 100,
    allowSensitiveFields: false,
    expiresAt: '',
  });

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/api-keys?limit=50');
      if (!res.ok) throw new Error('Failed to load API keys');
      const json = await res.json();
      setKeys(json.data ?? []);
      setTotal(json.pagination?.total ?? 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) fetchKeys();
  }, [session, fetchKeys]);

  function toggleScope(scope: string) {
    setForm(f => ({
      ...f,
      scopes: f.scopes.includes(scope)
        ? f.scopes.filter(s => s !== scope)
        : [...f.scopes, scope],
    }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const body: Record<string, any> = {
        name: form.name.trim(),
        scopes: form.scopes,
        rateLimit: form.rateLimit,
        allowSensitiveFields: form.allowSensitiveFields,
      };
      if (form.description.trim()) body.description = form.description.trim();
      if (form.expiresAt) body.expiresAt = new Date(form.expiresAt).toISOString();

      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to create key');

      setCreatedKey({ id: json.id, token: json.token, name: json.name });
      await fetchKeys();
    } catch (e: any) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string, name: string) {
    if (!confirm(`Revoke API key "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/api-keys/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      });
      if (!res.ok) throw new Error('Failed to revoke');
      await fetchKeys();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleActivate(id: string) {
    try {
      const res = await fetch(`/api/admin/api-keys/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      });
      if (!res.ok) throw new Error('Failed to activate');
      await fetchKeys();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handlePermanentDelete(id: string, name: string) {
    if (!confirm(`Permanently DELETE API key "${name}"? This will delete all its usage logs and cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/api-keys/${id}?permanent=true`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete API key');
      }
      await fetchKeys();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handlePurgeDemoData() {
    if (!confirm('Are you sure you want to purge all demo data (Nillar, Shopagric, AgroFin, test keys, and mock invoices)? This cannot be undone.')) return;
    setPurgingDemo(true);
    try {
      const res = await fetch('/api/admin/api-keys?demo=true', {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to purge demo data');
      alert(`Purge complete: ${data.deletedKeysCount ?? 0} demo keys and ${data.deletedOrgsCount ?? 0} demo organizations removed.`);
      await fetchKeys();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setPurgingDemo(false);
    }
  }

  function copyToken(token: string) {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function handleCreateDirectAccount(e: React.FormEvent) {
    e.preventDefault();
    if (accountForm.scopes.length === 0) {
      setAccountError('Please select at least one permission / scope.');
      return;
    }

    setCreatingAccount(true);
    setAccountError(null);

    try {
      const res = await fetch('/api/admin/client-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create client account');

      setShowDirectAccount(false);
      setCreatedAccountResult({
        email: data.account.email,
        temporaryPassword: data.account.temporaryPassword,
        apiKey: data.account.apiKey,
        organization: { name: data.account.organizationName },
      });
      await fetchKeys();
    } catch (e: any) {
      setAccountError(e.message);
    } finally {
      setCreatingAccount(false);
    }
  }

  function toggleAccountScope(scopeId: string) {
    setAccountForm(prev => ({
      ...prev,
      scopes: prev.scopes.includes(scopeId)
        ? prev.scopes.filter(s => s !== scopeId)
        : [...prev.scopes, scopeId],
    }));
  }

  function closeCreateDialog() {
    setShowCreate(false);
    setCreatedKey(null);
    setCopied(false);
    setCreateError(null);
    setForm({ name: '', description: '', scopes: [], rateLimit: 100, allowSensitiveFields: false, expiresAt: '' });
  }

  function formatDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const activeCount = keys.filter(k => k.isActive).length;
  const totalRequests = keys.reduce((sum, k) => sum + k.requestCount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <KeyIcon className="h-7 w-7 text-[#013358] dark:text-blue-400" />
            API Key Management
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage API keys for external access to the FIMS data platform.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={purgingDemo}
            className="gap-2 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
            onClick={handlePurgeDemoData}
            title="Clean up test & demo onboarding data, mock invoices, and sample API keys"
          >
            <TrashIcon className="h-4 w-4" />
            {purgingDemo ? 'Purging…' : 'Purge Demo Data'}
          </Button>
          <Link href="/requests/api-access-requests">
            <Button variant="outline" size="sm" className="gap-2">
              <InboxIcon className="h-4 w-4" />
              Access Requests
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 border-[#013358] text-[#013358] hover:bg-[#013358]/5 dark:border-blue-400 dark:text-blue-400"
            onClick={() => {
              setAccountError(null);
              setShowDirectAccount(true);
            }}
          >
            <UserPlusIcon className="h-4 w-4" />
            Create Client Account
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-[#013358] hover:bg-[#01254a] text-white"
            onClick={() => setShowCreate(true)}
          >
            <PlusIcon className="h-4 w-4" />
            New API Key
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="pt-5">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{total}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Total Keys</div>
          </CardContent>
        </Card>
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="pt-5">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{activeCount}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Active Keys</div>
          </CardContent>
        </Card>
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="pt-5">
            <div className="text-2xl font-bold text-[#013358] dark:text-blue-300">{totalRequests.toLocaleString()}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Total API Requests</div>
          </CardContent>
        </Card>
      </div>

      {/* Keys Table */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-base dark:text-white">API Keys</CardTitle>
          <CardDescription className="dark:text-gray-400">
            Click on a key to view usage statistics and manage settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" /> Loading…
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16 text-red-500 gap-2">
              <ExclamationTriangleIcon className="h-5 w-5" /> {error}
            </div>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <KeyIcon className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">No API keys yet. Create one to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="dark:border-gray-700">
                  <TableHead className="dark:text-gray-400">Name</TableHead>
                  <TableHead className="dark:text-gray-400">Prefix</TableHead>
                  <TableHead className="dark:text-gray-400">Scopes</TableHead>
                  <TableHead className="dark:text-gray-400 text-right">Rate Limit</TableHead>
                  <TableHead className="dark:text-gray-400 text-right">Requests</TableHead>
                  <TableHead className="dark:text-gray-400">Last Used</TableHead>
                  <TableHead className="dark:text-gray-400">Status</TableHead>
                  <TableHead className="dark:text-gray-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map(key => (
                  <TableRow key={key.id} className="dark:border-gray-700 dark:hover:bg-gray-700">
                    <TableCell className="font-medium dark:text-white">
                      <Link href={`/api-keys/${key.id}`} className="hover:underline hover:text-[#013358] dark:hover:text-blue-300">
                        {key.name}
                      </Link>
                      {key.allowSensitiveFields && (
                        <span className="ml-2 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded">
                          Sensitive
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded">
                        {key.keyPrefix}…
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {key.scopes.map(s => (
                          <Badge key={s} variant="secondary" className="text-xs dark:bg-gray-700 dark:text-gray-300">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right dark:text-gray-300 text-sm">
                      {key.rateLimit}/min
                    </TableCell>
                    <TableCell className="text-right dark:text-gray-300 text-sm">
                      {key.requestCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm dark:text-gray-400">
                      {formatDate(key.lastUsedAt)}
                    </TableCell>
                    <TableCell>
                      {key.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                          <CheckCircleIcon className="h-3.5 w-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                          <XCircleIcon className="h-3.5 w-3.5" /> Revoked
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/api-keys/${key.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 dark:text-gray-400 dark:hover:text-white">
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                        </Link>
                        {key.isActive ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Revoke Key"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => handleRevoke(key.id, key.name)}
                          >
                            <XCircleIcon className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Activate Key"
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                            onClick={() => handleActivate(key.id)}
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Permanently Delete API Key"
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => handlePermanentDelete(key.id, key.name)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Key Dialog */}
      <Dialog open={showCreate} onOpenChange={open => { if (!open) closeCreateDialog(); }}>
        <DialogContent className="max-w-lg dark:bg-gray-900 dark:border-gray-700">
          {createdKey ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircleIcon className="h-5 w-5" />
                  API Key Created
                </DialogTitle>
                <DialogDescription className="dark:text-gray-400">
                  Copy your API key now — it will not be shown again.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3 flex gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    Store this key securely. It cannot be retrieved after you close this dialog.
                  </p>
                </div>

                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">
                    API Key for <span className="font-semibold text-gray-700 dark:text-gray-200">{createdKey.name}</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm bg-gray-100 dark:bg-gray-800 dark:text-gray-200 px-3 py-2 rounded border dark:border-gray-700 font-mono break-all select-all">
                      {createdKey.token}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 shrink-0 dark:border-gray-600 dark:text-gray-300"
                      onClick={() => copyToken(createdKey.token)}
                    >
                      {copied ? <CheckIcon className="h-4 w-4 text-green-500" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button onClick={closeCreateDialog} className="bg-[#013358] hover:bg-[#01254a] text-white">
                  Done
                </Button>
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle className="dark:text-white">Create New API Key</DialogTitle>
                <DialogDescription className="dark:text-gray-400">
                  API keys allow external applications to access FIMS data.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {createError && (
                  <div className="rounded-md border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
                    {createError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="key-name" className="dark:text-gray-200">Key Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="key-name"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Partner Integration - Kaduna ADP"
                    required
                    className="dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="key-desc" className="dark:text-gray-200">Description</Label>
                  <Textarea
                    id="key-desc"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Optional — describe the purpose of this key"
                    rows={2}
                    className="dark:bg-gray-800 dark:border-gray-600 dark:text-white resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="dark:text-gray-200">Scopes <span className="text-red-500">*</span></Label>
                  <div className="grid grid-cols-2 gap-2">
                    {VALID_SCOPES.map(scope => (
                      <button
                        key={scope.id}
                        type="button"
                        onClick={() => toggleScope(scope.id)}
                        className={`text-left p-3 rounded-lg border text-sm transition-colors ${
                          form.scopes.includes(scope.id)
                            ? 'border-[#013358] bg-[#013358]/5 dark:bg-[#013358]/20 text-[#013358] dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className="font-medium">{scope.label}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{scope.id}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="rate-limit" className="dark:text-gray-200">Rate Limit (req/min)</Label>
                    <Input
                      id="rate-limit"
                      type="number"
                      min={1}
                      max={5000}
                      value={form.rateLimit}
                      onChange={e => setForm(f => ({ ...f, rateLimit: parseInt(e.target.value) || 100 }))}
                      className="dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="expires-at" className="dark:text-gray-200">Expiry Date</Label>
                    <Input
                      id="expires-at"
                      type="date"
                      value={form.expiresAt}
                      onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                      className="dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3">
                  <div className="flex items-center h-5 mt-0.5">
                    <input
                      id="sensitive"
                      type="checkbox"
                      checked={form.allowSensitiveFields}
                      onChange={e => setForm(f => ({ ...f, allowSensitiveFields: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="sensitive" className="font-medium text-amber-800 dark:text-amber-300 cursor-pointer">
                      Allow Sensitive Fields
                    </Label>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                      Exposes NIN, BVN, bank details, and contact information. Only for internal CCSA systems.
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeCreateDialog} className="dark:border-gray-600 dark:text-gray-300">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creating || form.scopes.length === 0 || !form.name.trim()}
                  className="bg-[#013358] hover:bg-[#01254a] text-white gap-2"
                >
                  {creating ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <PlusIcon className="h-4 w-4" />}
                  {creating ? 'Creating…' : 'Create Key'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Direct Admin Account Creation Dialog ────────────────────────────── */}
      <Dialog open={showDirectAccount} onOpenChange={setShowDirectAccount}>
        <DialogContent className="max-w-lg dark:bg-gray-800">
          <form onSubmit={handleCreateDirectAccount} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BuildingOffice2Icon className="h-6 w-6 text-[#013358] dark:text-blue-400" />
                Directly Create Partner Access Account
              </DialogTitle>
              <DialogDescription>
                Provision an institutional Client Portal account and live API key for a partner organization directly.
              </DialogDescription>
            </DialogHeader>

            {accountError && (
              <div className="p-3 rounded-lg bg-red-50 text-xs text-red-700">
                {accountError}
              </div>
            )}

            <div className="space-y-3 text-xs max-h-[60vh] overflow-y-auto pr-1">
              <div className="space-y-1">
                <Label className="text-xs">Organization Name *</Label>
                <Input
                  required
                  placeholder="e.g. Sterling Agricultural Investments Ltd"
                  value={accountForm.organizationName}
                  onChange={(e) => setAccountForm({ ...accountForm, organizationName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">RC / CAC Number</Label>
                  <Input
                    placeholder="e.g. RC 1234567"
                    value={accountForm.rcNumber}
                    onChange={(e) => setAccountForm({ ...accountForm, rcNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Contact Person Name *</Label>
                  <Input
                    required
                    placeholder="e.g. Fatima Bello"
                    value={accountForm.contactName}
                    onChange={(e) => setAccountForm({ ...accountForm, contactName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Corporate Email *</Label>
                  <Input
                    required
                    type="email"
                    placeholder="partner@org.ng"
                    value={accountForm.email}
                    onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone Number</Label>
                  <Input
                    placeholder="+234..."
                    value={accountForm.phone}
                    onChange={(e) => setAccountForm({ ...accountForm, phone: e.target.value })}
                  />
                </div>
              </div>

              {/* Scopes */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-semibold">Granted Permissions / Scopes *</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {VALID_SCOPES.map((sc) => {
                    const checked = accountForm.scopes.includes(sc.id);
                    return (
                      <div
                        key={sc.id}
                        onClick={() => toggleAccountScope(sc.id)}
                        className={`p-2 rounded-lg border cursor-pointer flex items-center gap-2 select-none ${
                          checked
                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700'
                            : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        <input type="checkbox" checked={checked} onChange={() => {}} />
                        <span className="font-semibold text-gray-900 dark:text-white">{sc.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs">Rate Limit (req/min)</Label>
                  <Input
                    type="number"
                    value={accountForm.rateLimit}
                    onChange={(e) => setAccountForm({ ...accountForm, rateLimit: parseInt(e.target.value) || 120 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Monthly Quota</Label>
                  <Input
                    type="number"
                    value={accountForm.monthlyQuota}
                    onChange={(e) => setAccountForm({ ...accountForm, monthlyQuota: parseInt(e.target.value) || 50000 })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="directSensMain"
                  checked={accountForm.allowSensitiveFields}
                  onChange={(e) => setAccountForm({ ...accountForm, allowSensitiveFields: e.target.checked })}
                />
                <label htmlFor="directSensMain" className="text-xs cursor-pointer">
                  Allow unmasked sensitive fields
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendMailMain"
                  checked={accountForm.sendEmail}
                  onChange={(e) => setAccountForm({ ...accountForm, sendEmail: e.target.checked })}
                />
                <label htmlFor="sendMailMain" className="text-xs cursor-pointer font-medium text-[#013358] dark:text-blue-400">
                  Send welcome email with credentials & API key automatically
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDirectAccount(false)} disabled={creatingAccount}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#013358] hover:bg-[#01254a] text-white" disabled={creatingAccount}>
                {creatingAccount ? 'Provisioning...' : 'Provision Access Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Generated Account Result Modal ──────────────────────────────────── */}
      <Dialog open={!!createdAccountResult} onOpenChange={() => setCreatedAccountResult(null)}>
        <DialogContent className="max-w-md dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircleIcon className="h-6 w-6" />
              Account Created & Credentials Sent
            </DialogTitle>
            <DialogDescription>
              Client portal account and API key have been generated for <strong>{createdAccountResult?.email}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-gray-900 rounded-lg space-y-1.5">
              <div><span className="text-gray-500">Email:</span> <strong className="font-mono text-gray-900 dark:text-white">{createdAccountResult?.email}</strong></div>
              <div><span className="text-gray-500">Temporary Password:</span> <strong className="font-mono text-emerald-600">{createdAccountResult?.temporaryPassword}</strong></div>
              <div><span className="text-gray-500">Live API Key:</span></div>
              <div className="p-2 bg-gray-900 text-emerald-400 font-mono rounded text-[11px] break-all">
                {createdAccountResult?.apiKey?.token}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              className="bg-[#013358] hover:bg-[#01254a] text-white"
              onClick={() => setCreatedAccountResult(null)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

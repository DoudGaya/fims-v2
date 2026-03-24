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

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null);
  const [copied, setCopied] = useState(false);

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

  function copyToken(token: string) {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
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
        <div className="flex items-center gap-3">
          <Link href="/api-keys/access-requests">
            <Button variant="outline" size="sm" className="gap-2">
              <InboxIcon className="h-4 w-4" />
              Access Requests
            </Button>
          </Link>
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
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => handleRevoke(key.id, key.name)}
                          >
                            <XCircleIcon className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                            onClick={() => handleActivate(key.id)}
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                          </Button>
                        )}
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
    </div>
  );
}

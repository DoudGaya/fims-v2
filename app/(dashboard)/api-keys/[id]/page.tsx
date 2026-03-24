'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  KeyIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  XCircleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ClockIcon,
  ShieldCheckIcon,
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
  { id: 'farmers:read', label: 'Farmers' },
  { id: 'farms:read', label: 'Farms' },
  { id: 'clusters:read', label: 'Clusters' },
  { id: 'analytics:read', label: 'Analytics' },
];

interface ApiKeyDetail {
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
  updatedAt: string;
  createdBy: { displayName: string; email: string } | null;
}

interface UsageLog {
  id: string;
  endpoint: string;
  method: string;
  statusCode: number;
  ipAddress: string | null;
  createdAt: string;
}

interface UsageData {
  apiKey: { id: string; name: string; requestCount: number; lastUsedAt: string | null };
  logs: UsageLog[];
  endpointBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
}

interface RotatedKey {
  token: string;
  name: string;
}

export default function ApiKeyDetailPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [apiKey, setApiKey] = useState<ApiKeyDetail | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    scopes: [] as string[],
    rateLimit: 100,
    allowSensitiveFields: false,
    isActive: true,
    expiresAt: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Rotate state
  const [showRotate, setShowRotate] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [rotatedKey, setRotatedKey] = useState<RotatedKey | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [keyRes, usageRes] = await Promise.all([
        fetch(`/api/admin/api-keys/${id}`),
        fetch(`/api/admin/api-keys/${id}/usage`),
      ]);
      if (!keyRes.ok) throw new Error('API key not found');
      const keyData: ApiKeyDetail = await keyRes.json();
      setApiKey(keyData);
      setEditForm({
        name: keyData.name,
        description: keyData.description ?? '',
        scopes: keyData.scopes,
        rateLimit: keyData.rateLimit,
        allowSensitiveFields: keyData.allowSensitiveFields,
        isActive: keyData.isActive,
        expiresAt: keyData.expiresAt ? keyData.expiresAt.slice(0, 10) : '',
      });
      if (usageRes.ok) {
        setUsage(await usageRes.json());
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (session) fetchData();
  }, [session, fetchData]);

  function toggleScope(scope: string) {
    setEditForm(f => ({
      ...f,
      scopes: f.scopes.includes(scope) ? f.scopes.filter(s => s !== scope) : [...f.scopes, scope],
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const body: Record<string, any> = {
        name: editForm.name,
        scopes: editForm.scopes,
        rateLimit: editForm.rateLimit,
        allowSensitiveFields: editForm.allowSensitiveFields,
        isActive: editForm.isActive,
      };
      if (editForm.description) body.description = editForm.description;
      body.expiresAt = editForm.expiresAt ? new Date(editForm.expiresAt).toISOString() : null;

      const res = await fetch(`/api/admin/api-keys/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to save');
      setApiKey(json);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRotate() {
    setRotating(true);
    try {
      const res = await fetch(`/api/admin/api-keys/${id}/rotate`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to rotate');
      setRotatedKey({ token: json.token, name: apiKey?.name ?? '' });
      await fetchData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setRotating(false);
    }
  }

  function copyToken(token: string) {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function formatDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function statusColor(code: number) {
    if (code < 300) return 'text-green-600 dark:text-green-400';
    if (code < 500) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-gray-400">
        <ArrowPathIcon className="h-6 w-6 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  if (error || !apiKey) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-red-500 mb-4">
          <ExclamationTriangleIcon className="h-5 w-5" />
          {error ?? 'Key not found'}
        </div>
        <Link href="/api-keys">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeftIcon className="h-4 w-4" /> Back to API Keys
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/api-keys">
          <Button variant="ghost" size="sm" className="gap-1.5 dark:text-gray-400 dark:hover:text-white">
            <ArrowLeftIcon className="h-4 w-4" /> API Keys
          </Button>
        </Link>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">{apiKey.name}</h1>
        {apiKey.isActive ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
            <CheckCircleIcon className="h-3.5 w-3.5" /> Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
            <XCircleIcon className="h-3.5 w-3.5" /> Revoked
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Stats + Usage */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-[#013358] dark:text-blue-300">
                  {apiKey.requestCount.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total Requests</div>
              </CardContent>
            </Card>
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{apiKey.rateLimit}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Req/min limit</div>
              </CardContent>
            </Card>
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="pt-4">
                <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                  {apiKey.lastUsedAt ? formatDate(apiKey.lastUsedAt) : 'Never used'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Last Used</div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Logs */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-base dark:text-white flex items-center gap-2">
                <ChartBarIcon className="h-4 w-4 text-[#013358] dark:text-blue-400" />
                Recent Requests
              </CardTitle>
              <CardDescription className="dark:text-gray-400">Last 50 API calls</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {!usage || usage.logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <ClockIcon className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">No requests logged yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="dark:border-gray-700">
                      <TableHead className="dark:text-gray-400">Endpoint</TableHead>
                      <TableHead className="dark:text-gray-400">Method</TableHead>
                      <TableHead className="dark:text-gray-400">Status</TableHead>
                      <TableHead className="dark:text-gray-400">IP</TableHead>
                      <TableHead className="dark:text-gray-400">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usage.logs.map(log => (
                      <TableRow key={log.id} className="dark:border-gray-700 text-sm">
                        <TableCell className="font-mono text-xs dark:text-gray-300">{log.endpoint}</TableCell>
                        <TableCell className="dark:text-gray-400">{log.method}</TableCell>
                        <TableCell className={`font-semibold ${statusColor(log.statusCode)}`}>{log.statusCode}</TableCell>
                        <TableCell className="dark:text-gray-400 text-xs">{log.ipAddress ?? '—'}</TableCell>
                        <TableCell className="dark:text-gray-400 text-xs whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString('en-GB', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Edit + Actions */}
        <div className="space-y-4">
          {/* Key Info */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm dark:text-white flex items-center gap-2">
                <KeyIcon className="h-4 w-4 text-[#013358] dark:text-blue-400" />
                Key Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Prefix</div>
                <code className="text-xs bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded">
                  {apiKey.keyPrefix}…
                </code>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Created</div>
                <div className="dark:text-gray-300">{formatDate(apiKey.createdAt)}</div>
              </div>
              {apiKey.createdBy && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Created By</div>
                  <div className="dark:text-gray-300">{apiKey.createdBy.displayName}</div>
                </div>
              )}
              {apiKey.expiresAt && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Expires</div>
                  <div className="dark:text-gray-300">{formatDate(apiKey.expiresAt)}</div>
                </div>
              )}
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Scopes</div>
                <div className="flex flex-wrap gap-1">
                  {apiKey.scopes.map(s => (
                    <Badge key={s} variant="secondary" className="text-xs dark:bg-gray-700 dark:text-gray-300">{s}</Badge>
                  ))}
                </div>
              </div>
              {apiKey.allowSensitiveFields && (
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                  <ShieldCheckIcon className="h-4 w-4" />
                  <span className="text-xs font-medium">Sensitive fields enabled</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rotate Key */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm dark:text-white">Rotate Key</CardTitle>
              <CardDescription className="text-xs dark:text-gray-400">
                Generate a new secret. The old key stops working immediately.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
                onClick={() => setShowRotate(true)}
                disabled={!apiKey.isActive}
              >
                <ArrowPathIcon className="h-4 w-4" />
                Rotate API Key
              </Button>
            </CardContent>
          </Card>

          {/* Edit Form */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm dark:text-white">Edit Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-3">
                {saveError && (
                  <div className="text-xs text-red-600 dark:text-red-400 rounded border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-2">
                    {saveError}
                  </div>
                )}
                {saveSuccess && (
                  <div className="text-xs text-green-600 dark:text-green-400 rounded border border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20 p-2">
                    Changes saved.
                  </div>
                )}

                <div className="space-y-1">
                  <Label htmlFor="edit-name" className="text-xs dark:text-gray-300">Name</Label>
                  <Input
                    id="edit-name"
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    required
                    className="h-8 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs dark:text-gray-300">Scopes</Label>
                  <div className="grid grid-cols-2 gap-1">
                    {VALID_SCOPES.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleScope(s.id)}
                        className={`text-xs py-1.5 px-2 rounded border transition-colors ${
                          editForm.scopes.includes(s.id)
                            ? 'border-[#013358] bg-[#013358]/5 dark:bg-[#013358]/20 text-[#013358] dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-rate" className="text-xs dark:text-gray-300">Rate Limit (req/min)</Label>
                  <Input
                    id="edit-rate"
                    type="number"
                    min={1}
                    max={5000}
                    value={editForm.rateLimit}
                    onChange={e => setEditForm(f => ({ ...f, rateLimit: parseInt(e.target.value) || 100 }))}
                    className="h-8 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="edit-active"
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={e => setEditForm(f => ({ ...f, isActive: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-[#013358]"
                  />
                  <Label htmlFor="edit-active" className="text-xs cursor-pointer dark:text-gray-300">Active</Label>
                </div>

                <Button
                  type="submit"
                  size="sm"
                  disabled={saving || editForm.scopes.length === 0}
                  className="w-full bg-[#013358] hover:bg-[#01254a] text-white"
                >
                  {saving ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Rotate confirmation dialog */}
      <Dialog open={showRotate} onOpenChange={open => { if (!open) { setShowRotate(false); setRotatedKey(null); setCopied(false); } }}>
        <DialogContent className="max-w-md dark:bg-gray-900 dark:border-gray-700">
          {rotatedKey ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircleIcon className="h-5 w-5" />
                  Key Rotated
                </DialogTitle>
                <DialogDescription className="dark:text-gray-400">Copy your new token — it will not be shown again.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3 flex gap-2">
                  <ExclamationTriangleIcon className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-300">The previous token is now invalid. Update your integrations immediately.</p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-gray-100 dark:bg-gray-800 dark:text-gray-200 px-2 py-2 rounded border dark:border-gray-700 font-mono break-all select-all">
                    {rotatedKey.token}
                  </code>
                  <Button size="sm" variant="outline" className="shrink-0 gap-1 dark:border-gray-600" onClick={() => copyToken(rotatedKey.token)}>
                    {copied ? <CheckIcon className="h-4 w-4 text-green-500" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => { setShowRotate(false); setRotatedKey(null); setCopied(false); }} className="bg-[#013358] hover:bg-[#01254a] text-white">
                  Done
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="dark:text-white">Rotate API Key?</DialogTitle>
                <DialogDescription className="dark:text-gray-400">
                  This will invalidate the current token and generate a new one. Any integrations using the old token will break immediately.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-lg border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-3 flex gap-2">
                <ExclamationTriangleIcon className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">This action cannot be undone.</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowRotate(false)} className="dark:border-gray-600 dark:text-gray-300">
                  Cancel
                </Button>
                <Button
                  onClick={handleRotate}
                  disabled={rotating}
                  className="bg-red-600 hover:bg-red-700 text-white gap-2"
                >
                  {rotating ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : null}
                  {rotating ? 'Rotating…' : 'Rotate Key'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

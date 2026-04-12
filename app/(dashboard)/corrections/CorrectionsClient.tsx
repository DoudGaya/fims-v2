'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ClipboardDocumentCheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface AuditFarmer {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  nin: string | null;
}

interface AuditLogEntry {
  id: string;
  action: string;
  tableName: string;
  recordId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  userId: string | null;
  timestamp: string;
  user: AuditUser | null;
  farmer: AuditFarmer | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ─── Helper: diff old vs new ──────────────────────────────────────────────────

function diffValues(
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
): { field: string; from: string; to: string }[] {
  if (!newValues) return [];
  const old = oldValues ?? {};
  return Object.entries(newValues)
    .filter(([k, v]) => old[k] !== v)
    .map(([k, v]) => ({
      field: k,
      from: old[k] != null ? String(old[k]) : '—',
      to: v != null ? String(v) : '—',
    }));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CorrectionsClient() {
  const { status } = useSession();

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 50, total: 0, pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchLogs = useCallback(
    async (page = 1) => {
      if (status !== 'authenticated') return;
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: '50' });
        if (search.trim()) params.set('search', search.trim());
        const res = await fetch(`/api/corrections/audit?${params}`);
        if (!res.ok) throw new Error('Failed to load audit log');
        const data = await res.json();
        setLogs(data.logs);
        setPagination(data.pagination);
        setError(null);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [status, search],
  );

  useEffect(() => { fetchLogs(1); }, [status]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Correction Audit Log</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All farmer record corrections made by field agents
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchLogs(pagination.page)} disabled={loading}>
          <ArrowPathIcon className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Corrections</CardTitle>
            <ClipboardDocumentCheckIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Showing</CardTitle>
            <ClipboardDocumentCheckIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
            <p className="text-xs text-muted-foreground">
              Page {pagination.page} of {pagination.pages || 1}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <Input
          placeholder="Search by farmer name, NIN, or agent name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button type="submit" size="sm">
          <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
          Search
        </Button>
        {search && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { setSearch(''); fetchLogs(1); }}
          >
            Clear
          </Button>
        )}
      </form>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : error ? (
            <div className="p-8 text-center text-destructive">{error}</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No correction records found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Farmer</TableHead>
                  <TableHead>NIN</TableHead>
                  <TableHead>Corrected By</TableHead>
                  <TableHead>Fields Changed</TableHead>
                  <TableHead>Date &amp; Time</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const diffs = diffValues(
                    log.oldValues as Record<string, unknown> | null,
                    log.newValues as Record<string, unknown> | null,
                  );
                  const isExpanded = expanded === log.id;
                  const farmerName = log.farmer
                    ? [log.farmer.firstName, log.farmer.middleName, log.farmer.lastName]
                        .filter(Boolean)
                        .join(' ')
                    : log.recordId ?? '—';
                  const agentName = log.user
                    ? `${log.user.firstName} ${log.user.lastName}`
                    : log.userId ?? '—';

                  return (
                    <>
                      <TableRow
                        key={log.id}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => setExpanded(isExpanded ? null : log.id)}
                      >
                        <TableCell className="font-medium">{farmerName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono">
                          {log.farmer?.nin ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm">{agentName}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            {diffs.length} field{diffs.length !== 1 ? 's' : ''}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          {isExpanded ? (
                            <ChevronUpIcon className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow key={`${log.id}-detail`}>
                          <TableCell colSpan={6} className="bg-muted/30 p-4">
                            {diffs.length === 0 ? (
                              <p className="text-sm text-muted-foreground italic">
                                No field differences recorded.
                              </p>
                            ) : (
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-left text-muted-foreground border-b">
                                    <th className="pb-1 pr-6 font-medium">Field</th>
                                    <th className="pb-1 pr-6 font-medium">Before</th>
                                    <th className="pb-1 font-medium">After</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {diffs.map((d) => (
                                    <tr key={d.field} className="border-b last:border-0">
                                      <td className="py-1.5 pr-6 font-mono text-xs text-muted-foreground">
                                        {d.field}
                                      </td>
                                      <td className="py-1.5 pr-6 text-destructive line-through">
                                        {d.from}
                                      </td>
                                      <td className="py-1.5 text-green-600 font-medium">
                                        {d.to}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1 || loading}
            onClick={() => fetchLogs(pagination.page - 1)}
          >
            <ChevronLeftIcon className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.pages || loading}
            onClick={() => fetchLogs(pagination.page + 1)}
          >
            Next
            <ChevronRightIcon className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

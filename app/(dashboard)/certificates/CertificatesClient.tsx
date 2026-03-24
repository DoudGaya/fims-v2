'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Eye,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle2,
  Clock,
  Users,
} from 'lucide-react';
import { ButtonLoader, SectionLoader } from '@/components/ui/loading-spinner';

interface Farmer {
  id: string;
  firstName: string;
  lastName: string;
  nin: string;
  phone: string;
  state: string;
  lga: string;
  certificates: { certificateId: string; issuedDate: string }[];
  farms: { primaryCrop: string; farmSize: number }[];
}

type StatusFilter = 'all' | 'generated' | 'pending';

export default function CertificatesClient() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFarmer, setPreviewFarmer] = useState<Farmer | null>(null);
  // We store a blob: URL so the iframe renders inline instead of triggering a download
  const [blobUrl, setBlobUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchFarmers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search: debouncedSearch,
        status: statusFilter,
      });
      const res = await fetch(`/api/certificates?${params}`);
      const data = await res.json();
      setFarmers(data.farmers ?? []);
      setTotalPages(data.pagination?.pages ?? 1);
      setTotal(data.pagination?.total ?? 0);
    } catch (error) {
      console.error('Error fetching farmers:', error);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchFarmers();
  }, [fetchFarmers]);

  // ── Preview ──────────────────────────────────────────────────────────────
  const handlePreview = async (farmer: Farmer) => {
    setPreviewFarmer(farmer);
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError('');
    setBlobUrl('');
    try {
      const res = await fetch(`/api/certificates/preview?farmerId=${farmer.id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `Server error ${res.status}`);
      }
      const blob = await res.blob();
      // blob: URLs are always rendered inline by the browser PDF viewer
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
    } catch (err) {
      console.error('Preview error:', err);
      setPreviewError(err instanceof Error ? err.message : 'Failed to load preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewFarmer(null);
    setPreviewError('');
    setPreviewLoading(false);
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl('');
    }
  };

  // ── Download (generate + save to DB) ─────────────────────────────────────
  const handleDownload = async (farmer: Farmer) => {
    setGenerating(farmer.id);
    try {
      const res = await fetch('/api/certificates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmerId: farmer.id }),
      });

      if (!res.ok) throw new Error('Generation failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CCSA-Certificate-${farmer.firstName}-${farmer.lastName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Revoke after a short delay so the browser has time to start the download
      setTimeout(() => URL.revokeObjectURL(url), 10_000);

      fetchFarmers();
    } catch (error) {
      console.error('Error generating certificate:', error);
      alert('Failed to generate certificate. Please try again.');
    } finally {
      setGenerating(null);
    }
  };

  const handlePreviewDownload = async () => {
    if (!previewFarmer) return;
    await handleDownload(previewFarmer);
  };

  const tabs: { key: StatusFilter; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All Farmers', icon: <Users className="h-3.5 w-3.5" /> },
    { key: 'generated', label: 'Generated', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    { key: 'pending', label: 'Pending', icon: <Clock className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Certificates</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage and issue CCSA farmer registration certificates
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 px-4 py-2 text-sm text-blue-700 dark:text-blue-300">
          <FileText className="h-4 w-4" />
          <span className="font-semibold">{total}</span>
          <span>farmers total</span>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 p-1 text-sm">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setStatusFilter(tab.key); setPage(1); }}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
                statusFilter === tab.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, NIN, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-700">
              <TableHead>Farmer</TableHead>
              <TableHead>NIN</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Farm</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Certificate ID</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <ButtonLoader />
                    Loading farmers…
                  </div>
                </TableCell>
              </TableRow>
            ) : farmers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  No farmers found
                </TableCell>
              </TableRow>
            ) : (
              farmers.map((farmer) => {
                const hasCert = farmer.certificates.length > 0;
                const cert = farmer.certificates[0];
                const isGenerating = generating === farmer.id;

                return (
                  <TableRow key={farmer.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/60">
                    <TableCell>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {farmer.firstName} {farmer.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">{farmer.phone}</div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-gray-600 dark:text-gray-400">
                      {farmer.nin || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                      {[farmer.lga, farmer.state].filter(Boolean).join(', ') || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                      {farmer.farms[0]
                        ? `${farmer.farms[0].primaryCrop || 'N/A'} · ${farmer.farms[0].farmSize ?? 0} ha`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {hasCert ? (
                        <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Generated
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300">
                          <Clock className="mr-1 h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {cert ? cert.certificateId : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePreview(farmer)}
                          disabled={isGenerating}
                          className="gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Preview
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleDownload(farmer)}
                          disabled={isGenerating}
                          className="gap-1.5 bg-blue-600 hover:bg-blue-700"
                        >
                          {isGenerating ? (
                            <ButtonLoader />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          {isGenerating ? 'Generating…' : 'Download'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="flex h-[92vh] max-w-7xl flex-col gap-0 p-0">
          <DialogHeader className="flex flex-row items-center justify-between border-b px-6 py-4 shrink-0">
            <div>
              <DialogTitle className="text-lg font-semibold">
                Certificate Preview
              </DialogTitle>
              {previewFarmer && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {previewFarmer.firstName} {previewFarmer.lastName}
                  {previewFarmer.nin ? ` · NIN: ${previewFarmer.nin}` : ''}
                </p>
              )}
            </div>

            {/* <div className="flex items-center gap-2 pr-8">
              <Button
                onClick={handlePreviewDownload}
                disabled={generating === previewFarmer?.id}
                className="gap-2 bg-br hover:bg-blue-700"
              >
                {generating === previewFarmer?.id ? (
                  <ButtonLoader />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {generating === previewFarmer?.id ? 'Generating…' : 'Download PDF'}
              </Button>
            </div> */}
          </DialogHeader>

          {/* PDF iframe — using blob: URL so the browser renders inline instead of downloading */}
          <div className="relative flex-1 bg-gray-100 dark:bg-gray-800">
            {previewLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-gray-900">
                <SectionLoader />
                <p className="text-sm text-muted-foreground">Generating certificate preview…</p>
              </div>
            )}
            {previewError && !previewLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-50 dark:bg-gray-900 p-6">
                <p className="text-sm font-medium text-red-600">Failed to load preview</p>
                <p className="text-xs text-muted-foreground">{previewError}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => previewFarmer && handlePreview(previewFarmer)}
                  className="mt-2"
                >
                  Retry
                </Button>
              </div>
            )}
            {blobUrl && !previewLoading && (
              <iframe
                key={blobUrl}
                src={blobUrl}
                className="h-full w-full border-0"
                title="Certificate Preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

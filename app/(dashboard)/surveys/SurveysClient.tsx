'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/components/PermissionProvider';
import { PERMISSIONS } from '@/lib/permissions';
import {
  PlusIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

interface SurveySummary {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  publishedAt: string | null;
  createdAt: string;
  _count: {
    questions: number;
    responses: number;
  };
}

export default function SurveysClient() {
  const { status } = useSession();
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const [surveys, setSurveys] = useState<SurveySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const fetchSurveys = useCallback(async () => {
    if (status !== 'authenticated') return;
    setLoading(true);
    try {
      const res = await fetch('/api/surveys');
      if (!res.ok) throw new Error('Failed to fetch surveys');
      const data = await res.json();
      setSurveys(data.surveys);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load surveys');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to create survey');
      }
      const data = await res.json();
      setShowCreateDialog(false);
      setNewTitle('');
      setNewDescription('');
      router.push(`/surveys/${data.survey.id}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleTogglePublish = async (survey: SurveySummary) => {
    try {
      const res = await fetch(`/api/surveys/${survey.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish: !survey.isActive }),
      });
      if (!res.ok) throw new Error('Failed to update survey status');
      await fetchSurveys();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This will permanently delete all questions and responses.`)) return;
    try {
      const res = await fetch(`/api/surveys/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete survey');
      await fetchSurveys();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const totalPublished = surveys.filter((s) => s.isActive).length;
  const totalDraft = surveys.filter((s) => !s.isActive).length;
  const totalResponses = surveys.reduce((acc, s) => acc + s._count.responses, 0);

  if (status === 'authenticated' && !hasPermission(PERMISSIONS.SURVEYS_READ)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
        <ClipboardDocumentListIcon className="h-12 w-12 text-muted-foreground opacity-40" />
        <p className="text-lg font-semibold">Access Denied</p>
        <p className="text-sm text-muted-foreground">You do not have permission to view surveys.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Surveys</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create and manage field surveys for mobile agents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchSurveys} disabled={loading}>
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Survey
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Create Survey</DialogTitle>
                  <DialogDescription>
                    Create a new survey that mobile agents can complete with farmers.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="survey-title">Title *</Label>
                    <Input
                      id="survey-title"
                      placeholder="e.g. Crop Production Survey 2025"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="survey-desc">Description (optional)</Label>
                    <Textarea
                      id="survey-desc"
                      placeholder="Brief overview of what this survey covers..."
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating || !newTitle.trim()}>
                    {creating ? 'Creating...' : 'Create & Edit Questions'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Surveys</CardTitle>
            <ClipboardDocumentListIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{surveys.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <CheckCircleIcon className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalPublished}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <XCircleIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{totalDraft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <ClipboardDocumentListIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalResponses}</div>
          </CardContent>
        </Card>
      </div>

      {/* Surveys Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading surveys...</div>
          ) : error ? (
            <div className="p-8 text-center text-destructive">{error}</div>
          ) : surveys.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No surveys yet. Click &quot;Create Survey&quot; to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Questions</TableHead>
                  <TableHead className="text-center">Responses</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {surveys.map((survey) => (
                  <TableRow key={survey.id}>
                    <TableCell>
                      <Link
                        href={`/surveys/${survey.id}`}
                        className="font-medium hover:underline"
                      >
                        {survey.title}
                      </Link>
                      {survey.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {survey.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={survey.isActive ? 'default' : 'secondary'}>
                        {survey.isActive ? 'Published' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {survey._count.questions}
                    </TableCell>
                    <TableCell className="text-center">
                      {survey._count.responses}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(survey.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <EllipsisHorizontalIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/surveys/${survey.id}`}>
                              <EyeIcon className="mr-2 h-4 w-4" />
                              View / Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTogglePublish(survey)}>
                            {survey.isActive ? (
                              <>
                                <XCircleIcon className="mr-2 h-4 w-4" />
                                Unpublish
                              </>
                            ) : (
                              <>
                                <CheckCircleIcon className="mr-2 h-4 w-4" />
                                Publish
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(survey.id, survey.title)}
                          >
                            <TrashIcon className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

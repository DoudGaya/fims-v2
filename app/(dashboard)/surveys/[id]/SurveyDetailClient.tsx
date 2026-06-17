'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SurveyOption {
  id: string;
  optionText: string;
  order: number;
}

interface SurveyQuestion {
  id: string;
  questionText: string;
  questionType: string;
  isRequired: boolean;
  order: number;
  options: SurveyOption[];
}

interface Survey {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  publishedAt: string | null;
  createdAt: string;
  questions: SurveyQuestion[];
  _count: { responses: number };
}

interface ResponseFarmer {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  nin: string | null;
  phone: string | null;
  state: string | null;
  lga: string | null;
  agent: { id: string; firstName: string | null; lastName: string | null } | null;
}

interface SurveyAnswer {
  id: string;
  answerText: string | null;
  answerOptions: string[];
  question: { questionText: string; questionType: string };
}

interface SurveyResponse {
  id: string;
  completedAt: string;
  farmer: ResponseFarmer;
  answers: SurveyAnswer[];
}

const QUESTION_TYPES = [
  { value: 'TEXT', label: 'Text (free form)' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'DATE', label: 'Date' },
  { value: 'YES_NO', label: 'Yes / No' },
  { value: 'SINGLE_CHOICE', label: 'Single Choice' },
  { value: 'MULTI_CHOICE', label: 'Multiple Choice' },
];

const CHOICE_TYPES = ['SINGLE_CHOICE', 'MULTI_CHOICE'];

// ─── Question Form State ──────────────────────────────────────────────────────

interface QuestionDraft {
  questionText: string;
  questionType: string;
  isRequired: boolean;
  options: string[];
}

const emptyDraft = (): QuestionDraft => ({
  questionText: '',
  questionType: 'TEXT',
  isRequired: true,
  options: ['', ''],
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function SurveyDetailClient({ id }: { id: string }) {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit survey metadata
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDesc, setMetaDesc] = useState('');
  const [savingMeta, setSavingMeta] = useState(false);

  // Question dialog
  const [questionDialog, setQuestionDialog] = useState<'add' | 'edit' | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<SurveyQuestion | null>(null);
  const [questionDraft, setQuestionDraft] = useState<QuestionDraft>(emptyDraft());
  const [savingQuestion, setSavingQuestion] = useState(false);

  // Responses tab
  const [activeTab, setActiveTab] = useState<'questions' | 'responses' | 'assignments'>('questions');
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [responsesLoading, setResponsesLoading] = useState(false);
  const [responsePage, setResponsePage] = useState(1);
  const [responsePagination, setResponsePagination] = useState({
    total: 0,
    pages: 0,
  });
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null);

  // Assignments tab
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [assignAgentId, setAssignAgentId] = useState('');
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Fetch survey
  const fetchSurvey = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/surveys/${id}`);
      if (!res.ok) throw new Error('Survey not found');
      const data = await res.json();
      setSurvey(data.survey);
      setMetaTitle(data.survey.title);
      setMetaDesc(data.survey.description ?? '');
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSurvey();
  }, [fetchSurvey]);

  // Fetch responses
  const fetchResponses = useCallback(async () => {
    setResponsesLoading(true);
    try {
      const res = await fetch(`/api/surveys/${id}/responses?page=${responsePage}&limit=20`);
      if (!res.ok) throw new Error('Failed to fetch responses');
      const data = await res.json();
      setResponses(data.responses);
      setResponsePagination({ total: data.pagination.total, pages: data.pagination.pages });
    } catch (err: any) {
      console.error(err);
    } finally {
      setResponsesLoading(false);
    }
  }, [id, responsePage]);

  useEffect(() => {
    if (activeTab === 'responses') fetchResponses();
    if (activeTab === 'assignments') { fetchAssignments(); fetchAgents(); }
  }, [activeTab, fetchResponses]);

  // Assignments
  const fetchAssignments = async () => {
    setAssignmentsLoading(true);
    try {
      const res = await fetch(`/api/surveys/${id}/assignments`);
      const data = await res.json();
      setAssignments(Array.isArray(data) ? data : data.assignments ?? []);
    } catch { /* ignore */ } finally { setAssignmentsLoading(false); }
  };

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/users?role=survey_agent&limit=200');
      const data = await res.json();
      setAgents(data.users ?? []);
    } catch { /* ignore */ }
  };

  const handleAddAssignment = async () => {
    if (!assignAgentId) { setAssignError('Please select an agent.'); return; }
    setAssignError(null);
    setSavingAssignment(true);
    try {
      const res = await fetch(`/api/surveys/${id}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: assignAgentId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed'); }
      setAssignAgentId('');
      await fetchAssignments();
    } catch (err: any) { setAssignError(err.message); }
    finally { setSavingAssignment(false); }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      await fetch(`/api/surveys/${id}/assignments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId }),
      });
      await fetchAssignments();
    } catch { /* ignore */ }
  };


  // Save metadata
  const handleSaveMeta = async () => {
    if (!metaTitle.trim()) return;
    setSavingMeta(true);
    try {
      const res = await fetch(`/api/surveys/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: metaTitle.trim(), description: metaDesc.trim() || null }),
      });
      if (!res.ok) throw new Error('Failed to save survey');
      await fetchSurvey();
      setEditingMeta(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingMeta(false);
    }
  };

  // Toggle publish
  const handleTogglePublish = async () => {
    if (!survey) return;
    try {
      const res = await fetch(`/api/surveys/${id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish: !survey.isActive }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      await fetchSurvey();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Open add question dialog
  const openAddQuestion = () => {
    setQuestionDraft(emptyDraft());
    setEditingQuestion(null);
    setQuestionDialog('add');
  };

  // Open edit question dialog
  const openEditQuestion = (q: SurveyQuestion) => {
    setEditingQuestion(q);
    setQuestionDraft({
      questionText: q.questionText,
      questionType: q.questionType,
      isRequired: q.isRequired,
      options: q.options.length > 0 ? q.options.map((o) => o.optionText) : ['', ''],
    });
    setQuestionDialog('edit');
  };

  // Save question (add or edit)
  const handleSaveQuestion = async () => {
    const { questionText, questionType, isRequired, options } = questionDraft;
    if (!questionText.trim()) return;

    const payload: {
      questionText: string;
      questionType: string;
      isRequired: boolean;
      options?: { optionText: string }[];
    } = {
      questionText: questionText.trim(),
      questionType,
      isRequired,
    };

    if (CHOICE_TYPES.includes(questionType)) {
      const validOptions = options.filter((o) => o.trim());
      if (validOptions.length < 2) {
        alert('Choice questions require at least 2 options.');
        return;
      }
      payload.options = validOptions.map((o) => ({ optionText: o.trim() }));
    }

    setSavingQuestion(true);
    try {
      let res: Response;
      if (questionDialog === 'edit' && editingQuestion) {
        res = await fetch(`/api/surveys/${id}/questions/${editingQuestion.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/surveys/${id}/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to save question');
      }
      await fetchSurvey();
      setQuestionDialog(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingQuestion(false);
    }
  };

  // Delete question
  const handleDeleteQuestion = async (qId: string, text: string) => {
    if (!confirm(`Delete question "${text}"?`)) return;
    try {
      const res = await fetch(`/api/surveys/${id}/questions/${qId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete question');
      await fetchSurvey();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Option helpers
  const setOption = (idx: number, value: string) => {
    setQuestionDraft((prev) => {
      const opts = [...prev.options];
      opts[idx] = value;
      return { ...prev, options: opts };
    });
  };
  const addOption = () =>
    setQuestionDraft((prev) => ({ ...prev, options: [...prev.options, ''] }));
  const removeOption = (idx: number) =>
    setQuestionDraft((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== idx),
    }));

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading survey...</div>;
  }
  if (error || !survey) {
    return (
      <div className="p-8 text-center text-destructive">
        {error || 'Survey not found'}
        <div className="mt-4">
          <Link href="/surveys">
            <Button variant="outline" size="sm">
              <ArrowLeftIcon className="h-4 w-4 mr-2" /> Back to Surveys
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/surveys">
            <Button variant="ghost" size="icon">
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{survey.title}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {survey._count.responses} response{survey._count.responses !== 1 ? 's' : ''} &bull;{' '}
              {survey.questions.length} question{survey.questions.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={survey.isActive ? 'default' : 'secondary'}>
            {survey.isActive ? 'Published' : 'Draft'}
          </Badge>
          <Button
            variant={survey.isActive ? 'outline' : 'default'}
            size="sm"
            onClick={handleTogglePublish}
          >
            {survey.isActive ? (
              <>
                <XCircleIcon className="h-4 w-4 mr-2" /> Unpublish
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-4 w-4 mr-2" /> Publish
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Survey Metadata Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-medium">Survey Details</CardTitle>
          {!editingMeta && (
            <Button variant="ghost" size="sm" onClick={() => setEditingMeta(true)}>
              <PencilIcon className="h-3.5 w-3.5 mr-1.5" /> Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingMeta ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="meta-title">Title *</Label>
                <Input
                  id="meta-title"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="meta-desc">Description</Label>
                <Textarea
                  id="meta-desc"
                  value={metaDesc}
                  onChange={(e) => setMetaDesc(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingMeta(false);
                    setMetaTitle(survey.title);
                    setMetaDesc(survey.description ?? '');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveMeta}
                  disabled={savingMeta || !metaTitle.trim()}
                >
                  {savingMeta ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="font-medium">{survey.title}</p>
              {survey.description ? (
                <p className="text-sm text-muted-foreground">{survey.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No description</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Created {format(new Date(survey.createdAt), 'MMMM d, yyyy')}
                {survey.publishedAt &&
                  ` · Published ${format(new Date(survey.publishedAt), 'MMMM d, yyyy')}`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab('questions')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'questions'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Questions ({survey.questions.length})
        </button>
        <button
          onClick={() => setActiveTab('responses')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'responses'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Responses ({survey._count.responses})
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'assignments'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Assignments ({assignments.length})
        </button>
      </div>

      {/* Questions Tab */}
      {activeTab === 'questions' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={openAddQuestion}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>

          {survey.questions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No questions yet. Click &quot;Add Question&quot; to build your survey.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {survey.questions.map((q, idx) => (
                <Card key={q.id}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="mt-0.5 shrink-0 text-xs font-semibold text-muted-foreground w-6 text-right">
                          {idx + 1}.
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{q.questionText}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {QUESTION_TYPES.find((t) => t.value === q.questionType)?.label ??
                                q.questionType}
                            </Badge>
                            {q.isRequired && (
                              <Badge variant="secondary" className="text-xs">
                                Required
                              </Badge>
                            )}
                          </div>
                          {q.options.length > 0 && (
                            <ul className="mt-2 space-y-0.5 pl-2">
                              {q.options.map((opt) => (
                                <li
                                  key={opt.id}
                                  className="text-xs text-muted-foreground before:content-['•'] before:mr-1.5"
                                >
                                  {opt.optionText}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEditQuestion(q)}
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteQuestion(q.id, q.questionText)}
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Responses Tab */}
      {activeTab === 'responses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {responsePagination.total} total response{responsePagination.total !== 1 ? 's' : ''}
            </p>
            <Button variant="outline" size="sm" onClick={fetchResponses} disabled={responsesLoading}>
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {responsesLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading responses...</div>
          ) : responses.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No responses yet.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Farmer</TableHead>
                        <TableHead>NIN</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Enrolled By</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead className="w-24" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {responses.map((resp) => (
                        <Fragment key={resp.id}>
                          <TableRow>
                            <TableCell className="font-medium">
                              {resp.farmer.firstName} {resp.farmer.middleName ?? ''}{' '}
                              {resp.farmer.lastName}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground font-mono">
                              {resp.farmer.nin ?? '—'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {[resp.farmer.lga, resp.farmer.state].filter(Boolean).join(', ') ||
                                '—'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {resp.farmer.agent
                                ? `${resp.farmer.agent.firstName ?? ''} ${resp.farmer.agent.lastName ?? ''}`.trim() || '—'
                                : '—'}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {format(new Date(resp.completedAt), 'MMM d, yyyy HH:mm')}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setExpandedResponse(
                                    expandedResponse === resp.id ? null : resp.id
                                  )
                                }
                              >
                                {expandedResponse === resp.id ? 'Hide' : 'View'}
                              </Button>
                            </TableCell>
                          </TableRow>
                          {expandedResponse === resp.id && (
                            <TableRow key={`${resp.id}-answers`}>
                              <TableCell colSpan={6} className="bg-muted/40 p-4">
                                <div className="space-y-2">
                                  {resp.answers.map((ans) => (
                                    <div key={ans.id} className="text-sm">
                                      <span className="font-medium">{ans.question.questionText}</span>
                                      <span className="text-muted-foreground ml-2">
                                        {ans.answerText ??
                                          (ans.answerOptions?.length
                                            ? ans.answerOptions.join(', ')
                                            : '—')}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {responsePagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={responsePage <= 1}
                    onClick={() => setResponsePage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {responsePage} of {responsePagination.pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={responsePage >= responsePagination.pages}
                    onClick={() => setResponsePage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Assignments Tab */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assign Agents</CardTitle>
              <CardDescription>
                If assignments are set, only assigned agents will see this survey. Leave empty to show to all agents.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Select value={assignAgentId} onValueChange={setAssignAgentId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select an agent…" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name ?? ([a.firstName, a.lastName].filter(Boolean).join(' ') || a.email)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddAssignment} disabled={savingAssignment || !assignAgentId}>
                  {savingAssignment ? 'Assigning…' : 'Assign'}
                </Button>
              </div>
              {assignError && <p className="text-sm text-destructive">{assignError}</p>}
            </CardContent>
          </Card>

          {assignmentsLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading assignments…</div>
          ) : assignments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No assignments — survey is visible to all agents.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Assigned At</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">
                          {a.agent
                            ? [a.agent.firstName, a.agent.lastName].filter(Boolean).join(' ') || a.agent.email
                            : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.agent?.email ?? '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(a.assignedAt), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRemoveAssignment(a.id)}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Question Add/Edit Dialog */}
      <Dialog open={questionDialog !== null} onOpenChange={(open) => !open && setQuestionDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {questionDialog === 'edit' ? 'Edit Question' : 'Add Question'}
            </DialogTitle>
            <DialogDescription>
              {questionDialog === 'edit'
                ? 'Update this survey question.'
                : 'Add a new question to the survey.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Question text */}
            <div className="space-y-1.5">
              <Label htmlFor="q-text">Question *</Label>
              <Input
                id="q-text"
                placeholder="e.g. What crop did you plant this season?"
                value={questionDraft.questionText}
                onChange={(e) =>
                  setQuestionDraft((prev) => ({ ...prev, questionText: e.target.value }))
                }
              />
            </div>

            {/* Question type */}
            <div className="space-y-1.5">
              <Label>Question Type</Label>
              <Select
                value={questionDraft.questionType}
                onValueChange={(val) =>
                  setQuestionDraft((prev) => ({ ...prev, questionType: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Required */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="q-required"
                checked={questionDraft.isRequired}
                onCheckedChange={(checked) =>
                  setQuestionDraft((prev) => ({ ...prev, isRequired: !!checked }))
                }
              />
              <Label htmlFor="q-required" className="cursor-pointer">
                Required (agents must answer before proceeding)
              </Label>
            </div>

            {/* Options (only for choice types) */}
            {CHOICE_TYPES.includes(questionDraft.questionType) && (
              <div className="space-y-2">
                <Label>Options (min. 2)</Label>
                <div className="space-y-2">
                  {questionDraft.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        placeholder={`Option ${idx + 1}`}
                        value={opt}
                        onChange={(e) => setOption(idx, e.target.value)}
                      />
                      {questionDraft.options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                          onClick={() => removeOption(idx)}
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addOption}>
                  <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
                  Add Option
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQuestionDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveQuestion}
              disabled={savingQuestion || !questionDraft.questionText.trim()}
            >
              {savingQuestion ? 'Saving...' : questionDialog === 'edit' ? 'Save Changes' : 'Add Question'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

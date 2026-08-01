'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePermissions } from '@/components/PermissionProvider';
import { PERMISSIONS } from '@/lib/permissions';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  MessageSquareIcon,
  MailIcon,
  PhoneIcon,
  UsersIcon,
  Loader2Icon,
  CheckCircle2Icon,
  AlertCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  TrashIcon,
  RefreshCwIcon,
} from 'lucide-react';
import { useSession } from 'next-auth/react';

type Channel = 'email' | 'sms' | 'both';
type RecipientType = 'farmer' | 'agent';
type RecipientMode = 'individual' | 'bulk';

interface Recipient {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

interface LogEntry {
  id: string;
  subject?: string | null;
  body: string;
  channel: string;
  recipientType: string;
  recipientName?: string | null;
  recipientCount: number;
  status: string;
  sentAt: string;
  sentBy: { id: string; displayName?: string | null; firstName?: string | null; lastName?: string | null; email: string };
}

const SMS_LIMIT = 160;

function channelBadge(channel: string) {
  if (channel === 'email') return <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">Email</Badge>;
  if (channel === 'sms') return <Badge variant="secondary" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300">SMS</Badge>;
  return <Badge variant="secondary" className="bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">Email + SMS</Badge>;
}

function statusBadge(status: string) {
  if (status === 'sent') return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-0">Sent</Badge>;
  if (status === 'partial') return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-0">Partial</Badge>;
  return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-0">Failed</Badge>;
}

// ── Stats Dashboard ──────────────────────────────────────────────────────────

interface CommStats {
  total: number;
  sent: number;
  failed: number;
  partial: number;
  channels: { email: number; sms: number; both: number };
  totalRecipients: number;
}

function StatsBar({ refresh }: { refresh: number }) {
  const [stats, setStats] = useState<CommStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/communications/stats')
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refresh]);

  const pct = (n: number) =>
    stats?.total ? `${Math.round((n / stats.total) * 100)}%` : '0%';

  const statCards = [
    
    {
      label: 'Total Messages',
      value: stats?.total ?? 0,
      sub: `Email ${stats?.channels.email ?? 0} · SMS ${stats?.channels.sms ?? 0} · Both ${stats?.channels.both ?? 0}`,
      icon: <MessageSquareIcon className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: 'Delivered',
      value: stats?.sent ?? 0,
      sub: `${pct(stats?.sent ?? 0)} success rate`,
      icon: <CheckCircle2Icon className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: 'Failed',
      value: stats?.failed ?? 0,
      sub: stats?.total ? `${pct(stats.failed)} of sends` : 'No sends yet',
      icon: <AlertCircleIcon className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: 'Partial',
      value: stats?.partial ?? 0,
      sub: stats?.total ? `${pct(stats.partial)} of sends` : 'No sends yet',
      icon: <AlertCircleIcon className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: 'Recipients Reached',
      value: stats?.totalRecipients ?? 0,
      sub: stats?.total ? `across ${stats.total} send${stats.total !== 1 ? 's' : ''}` : 'No sends yet',
      icon: <UsersIcon className="h-4 w-4 text-muted-foreground" />,
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((c) => (
          <Card key={c.label} className="animate-pulse">
            <CardContent className="p-4 pt-4">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-3 w-3/4" />
              <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {statCards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-4 pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{card.label}</p>
              {card.icon}
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{card.value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Compose Tab ──────────────────────────────────────────────────────────────

function ComposeTab({ onSent }: { onSent: () => void }) {
  const { hasPermission } = usePermissions();
  const canSend = hasPermission(PERMISSIONS.COMMUNICATIONS_SEND);

  const [mode, setMode] = useState<RecipientMode>('individual');
  const [recipientType, setRecipientType] = useState<RecipientType>('farmer');
  const [channel, setChannel] = useState<Channel>('email');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  // Individual mode
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Recipient[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);

  // Bulk mode filters
  const [bulkState, setBulkState] = useState('');
  const [bulkLGA, setBulkLGA] = useState('');
  const [bulkClusterId, setBulkClusterId] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);

  // Send state
  type SendState = { status: 'idle' } | { status: 'sending' } | { status: 'success'; sentCount: number; failedCount: number } | { status: 'error'; message: string };
  const [sendState, setSendState] = useState<SendState>({ status: 'idle' });

  // Search recipients (individual mode)
  const searchRecipients = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const url = recipientType === 'farmer'
        ? `/api/farmers?search=${encodeURIComponent(q)}&limit=10`
        : `/api/agents?search=${encodeURIComponent(q)}&limit=10`;
      const res = await fetch(url);
      const data = await res.json();
      const items: Recipient[] = (data.farmers ?? data.agents ?? data.users ?? []).map((r: any) => ({
        id: r.id,
        name: r.displayName ?? `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim(),
        email: r.email,
        phone: r.phone ?? r.agent?.phone ?? r.phoneNumber,
      }));
      setSearchResults(items);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  }, [recipientType]);

  useEffect(() => {
    const timer = setTimeout(() => searchRecipients(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchRecipients]);

  // Count bulk recipients
  const fetchBulkCount = useCallback(async () => {
    setCountLoading(true);
    try {
      const params = new URLSearchParams({ limit: '500' });
      if (bulkState) params.set('state', bulkState);
      if (bulkLGA) params.set('lga', bulkLGA);
      if (bulkClusterId) params.set('clusterId', bulkClusterId);
      if (bulkStatus) params.set('status', bulkStatus);
      const endpoint = recipientType === 'farmer' ? '/api/farmers' : '/api/agents';
      const res = await fetch(`${endpoint}?${params}`);
      const data = await res.json();
      setRecipientCount((data.farmers ?? data.agents ?? data.users ?? []).length);
    } catch { setRecipientCount(null); }
    finally { setCountLoading(false); }
  }, [recipientType, bulkState, bulkLGA, bulkClusterId, bulkStatus]);

  useEffect(() => {
    if (mode === 'bulk') fetchBulkCount();
  }, [mode, fetchBulkCount]);

  const canSubmit =
    canSend &&
    body.trim().length > 0 &&
    (channel === 'sms' || subject.trim().length > 0) &&
    (mode === 'individual' ? !!selectedRecipient : (recipientCount ?? 0) > 0) &&
    sendState.status !== 'sending';

  const handleSend = async () => {
    setSendState({ status: 'sending' });
    try {
      const payload: any = {
        channel,
        body,
        recipients: {
          mode,
          recipientType,
        },
      };
      if (channel !== 'sms') payload.subject = subject;
      if (mode === 'individual') {
        payload.recipients.id = selectedRecipient!.id;
      } else {
        const filters: Record<string, string> = {};
        if (bulkState) filters.state = bulkState;
        if (bulkLGA) filters.lga = bulkLGA;
        if (bulkClusterId) filters.clusterId = bulkClusterId;
        if (bulkStatus) filters.status = bulkStatus;
        payload.recipients.filters = filters;
      }

      const res = await fetch('/api/communications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendState({ status: 'error', message: data.error ?? 'Failed to send' });
        return;
      }
      setSendState({ status: 'success', sentCount: data.sentCount, failedCount: data.failedCount });
      onSent();
    } catch {
      setSendState({ status: 'error', message: 'Network error — please try again' });
    }
  };

  const handleReset = () => {
    setSubject(''); setBody(''); setSelectedRecipient(null); setSearchQuery('');
    setBulkState(''); setBulkLGA(''); setBulkClusterId(''); setBulkStatus('');
    setSendState({ status: 'idle' });
  };

  if (sendState.status === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="rounded-full bg-green-50 dark:bg-green-900/20 p-4">
          <CheckCircle2Icon className="h-10 w-10 text-green-600" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Message Sent!</h3>
          <p className="text-sm text-muted-foreground">
            {sendState.sentCount} message{sendState.sentCount !== 1 ? 's' : ''} delivered successfully
            {sendState.failedCount > 0 && `, ${sendState.failedCount} failed`}.
          </p>
        </div>
        <Button onClick={handleReset} className="bg-ccsa-blue hover:bg-blue-800">Compose Another</Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
      {/* Left: Recipient Config */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UsersIcon className="h-4 w-4 text-ccsa-blue dark:text-blue-400" /> Recipients
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mode */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 uppercase tracking-wide">Mode</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['individual', 'bulk'] as RecipientMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMode(m); setSelectedRecipient(null); setSearchQuery(''); }}
                    className={`py-1.5 text-xs font-medium rounded-md border transition-colors
                      ${mode === m
                        ? 'bg-ccsa-blue text-white border-ccsa-blue'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}
                    `}
                  >
                    {m === 'individual' ? 'Individual' : 'Bulk'}
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient type */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 uppercase tracking-wide">Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['farmer', 'agent'] as RecipientType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setRecipientType(t); setSelectedRecipient(null); setSearchQuery(''); }}
                    className={`py-1.5 text-xs font-medium rounded-md border capitalize transition-colors
                      ${recipientType === t
                        ? 'bg-ccsa-blue text-white border-ccsa-blue'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}
                    `}
                  >
                    {t === 'farmer' ? 'Farmers' : 'Agents'}
                  </button>
                ))}
              </div>
            </div>

            {/* Individual search */}
            {mode === 'individual' && (
              <div className="space-y-2">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Search</Label>
                <div className="relative">
                  <SearchIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    placeholder={`Search ${recipientType}s…`}
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setSelectedRecipient(null); }}
                    className="pl-8 text-sm"
                  />
                  {searching && <Loader2Icon className="absolute right-2.5 top-2.5 h-3.5 w-3.5 animate-spin text-gray-400" />}
                </div>
                {selectedRecipient ? (
                  <div className="flex items-center justify-between p-2  rounded-md border  text-xs">
                    <div>
                      <p className="font-medium text-ccsa-blue dark:text-blue-300">{selectedRecipient.name}</p>
                      <p className="text-ccsa-blue/70 dark:text-blue-400">{selectedRecipient.email ?? selectedRecipient.phone ?? '—'}</p>
                    </div>
                    <button onClick={() => { setSelectedRecipient(null); setSearchQuery(''); }} className="text-ccsa-blue/50 hover:text-ccsa-blue text-xs">✕</button>
                  </div>
                ) : searchResults.length > 0 && (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-md max-h-40 overflow-y-auto">
                    {searchResults.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => { setSelectedRecipient(r); setSearchQuery(r.name); setSearchResults([]); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-800 last:border-0"
                      >
                        <p className="font-medium text-gray-800 dark:text-gray-200">{r.name}</p>
                        <p className="text-gray-500">{r.email ?? r.phone ?? '—'}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Bulk filters */}
            {mode === 'bulk' && (
              <div className="space-y-3">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Filters</Label>
                <Input placeholder="State (optional)" value={bulkState} onChange={(e) => setBulkState(e.target.value)} className="text-sm" />
                <Input placeholder="LGA (optional)" value={bulkLGA} onChange={(e) => setBulkLGA(e.target.value)} className="text-sm" />
                {recipientType === 'farmer' && (
                  <>
                    <Input placeholder="Cluster ID (optional)" value={bulkClusterId} onChange={(e) => setBulkClusterId(e.target.value)} className="text-sm" />
                    <Input placeholder="Status e.g. Enrolled (optional)" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="text-sm" />
                  </>
                )}
                <button
                  type="button"
                  onClick={fetchBulkCount}
                  className="text-xs text-ccsa-blue dark:text-blue-400 hover:underline font-medium"
                >
                  {countLoading ? 'Counting…' : 'Refresh count'}
                </button>
                {recipientCount !== null && (
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    ~{recipientCount} {recipientType}(s) will receive this message
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right: Message composer */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquareIcon className="h-4 w-4 text-ccsa-blue dark:text-blue-400" /> Compose Message
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Channel */}
            <div className="space-y-1.5">
              <Label>Channel</Label>
              <div className="flex gap-2">
                {([
                  { value: 'email', label: 'Email', icon: <MailIcon className="h-3.5 w-3.5" /> },
                  { value: 'sms', label: 'SMS', icon: <PhoneIcon className="h-3.5 w-3.5" /> },
                  { value: 'both', label: 'Email + SMS', icon: null },
                ] as { value: Channel; label: string; icon: React.ReactNode }[]).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setChannel(opt.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors
                      ${channel === opt.value
                        ? 'bg-ccsa-blue text-white border-ccsa-blue'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}
                    `}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>

             {/* Personalization badges helper */}
             <div className="flex flex-wrap items-center gap-1.5 bg-gray-50 dark:bg-gray-800/40 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs">
               <span className="text-gray-500 font-semibold mr-1 uppercase text-[10px] tracking-wider dark:text-gray-400">Placeholders:</span>
               {[
                 { token: '{firstName}', label: 'First Name' },
                 { token: '{lastName}', label: 'Last Name' },
                 { token: '{name}', label: 'Full Name' },
                 { token: '{senderName}', label: 'Sender Name' },
                 { token: '{email}', label: 'Email' },
                 { token: '{phone}', label: 'Phone' },
                 { token: '[Click here](https://...)', label: 'Insert Hyperlink' }
               ].map(t => (
                 <button
                   key={t.label}
                   type="button"
                   onClick={() => {
                     const input = document.getElementById('compose-body') as HTMLTextAreaElement;
                     if (input) {
                       const start = input.selectionStart;
                       const end = input.selectionEnd;
                       const newBody = body.substring(0, start) + t.token + body.substring(end);
                       setBody(newBody);
                       setTimeout(() => {
                         input.focus();
                         input.setSelectionRange(start + t.token.length, start + t.token.length);
                       }, 0);
                     } else {
                       setBody(b => b + t.token);
                     }
                   }}
                   className="bg-white dark:bg-gray-800 hover:bg-ccsa-blue/5 hover:border-ccsa-blue dark:hover:border-blue-400 transition-colors border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5 font-mono text-[10.5px] text-ccsa-blue dark:text-blue-300"
                 >
                   {t.label}
                 </button>
               ))}
             </div>

             <Tabs defaultValue="edit" className="w-full">
               <TabsList className="grid w-full grid-cols-2 h-9 p-1 bg-gray-100 dark:bg-gray-800/80 rounded-lg">
                 <TabsTrigger value="edit" className="text-xs">Write</TabsTrigger>
                 <TabsTrigger value="preview" className="text-xs" disabled={!body.trim()}>Live Inbox Preview</TabsTrigger>
               </TabsList>

               <TabsContent value="edit" className="space-y-4 mt-3">
                 {/* Subject */}
                 {(channel === 'email' || channel === 'both') && (
                   <div className="space-y-1.5">
                     <Label htmlFor="compose-subject" className="text-xs font-semibold uppercase tracking-wider text-gray-500">Subject</Label>
                     <Input
                       id="compose-subject"
                       placeholder="Enter email subject (e.g. Welcome to CCSA, {firstName}!)"
                       value={subject}
                       onChange={(e) => setSubject(e.target.value)}
                       className="text-sm border-gray-200 dark:border-gray-700 focus-visible:ring-ccsa-blue"
                     />
                   </div>
                 )}

                 {/* Body */}
                 <div className="space-y-1.5">
                   <div className="flex items-center justify-between">
                     <Label htmlFor="compose-body" className="text-xs font-semibold uppercase tracking-wider text-gray-500">Message Content (Markdown Supported)</Label>
                     {(channel === 'sms' || channel === 'both') && (
                       <span className={`text-[10px] font-mono ${body.length > SMS_LIMIT ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                         {body.length}/{SMS_LIMIT} chars {body.length > SMS_LIMIT && '— SMS will be split'}
                       </span>
                     )}
                   </div>
                   <Textarea
                     id="compose-body"
                     placeholder="Dear {firstName},\n\nWelcome back! We are excited to update you... Use **bold**, *italics*, or [clickable links](https://...) to format your email message."
                     value={body}
                     onChange={(e) => setBody(e.target.value)}
                     rows={10}
                     className="resize-none text-sm border-gray-200 dark:border-gray-700 focus-visible:ring-ccsa-blue font-sans leading-relaxed p-3"
                   />
                 </div>
               </TabsContent>

               <TabsContent value="preview" className="mt-3">
                 <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900/20">
                   {/* Email Client Header bar */}
                   <div className="bg-gray-100/60 dark:bg-gray-800/60 px-4 py-2 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between text-[10px] text-gray-500 select-none">
                     <div className="flex items-center gap-1.5 font-medium">
                       <span className="w-2.5 h-2.5 rounded-full bg-red-400/80"></span>
                       <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80"></span>
                       <span className="w-2.5 h-2.5 rounded-full bg-green-400/80"></span>
                       <span className="ml-2 font-mono text-[9px] tracking-wider uppercase opacity-85">CCSA Inbox Preview</span>
                     </div>
                     <Badge variant="outline" className="text-[9px] font-bold bg-white dark:bg-gray-800 uppercase px-2 py-0.5 border-gray-300 dark:border-gray-700">Rich HTML</Badge>
                   </div>

                   {/* Email Headers */}
                   <div className="px-4 py-2.5 bg-white dark:bg-gray-900/60 border-b border-gray-150 dark:border-gray-800/60 text-xs space-y-1.5 select-none">
                     <div><span className="text-gray-400 dark:text-gray-500 inline-block w-14 font-medium">From:</span> <span className="font-semibold text-gray-700 dark:text-gray-300">CCSA Operations &lt;onboarding@resend.dev&gt;</span></div>
                     <div><span className="text-gray-400 dark:text-gray-500 inline-block w-14 font-medium">To:</span> <span className="text-gray-600 dark:text-gray-400">John Doe (Personalized Preview)</span></div>
                     {subject.trim() && (
                       <div><span className="text-gray-400 dark:text-gray-500 inline-block w-14 font-medium">Subject:</span> <span className="font-bold text-gray-900 dark:text-gray-100">{subject.replace(/{firstName}/g, 'John').replace(/{lastName}/g, 'Doe').replace(/{name}/g, 'John Doe')}</span></div>
                     )}
                   </div>

                   {/* Email Canvas/Body Frame */}
                   <div className="p-4 bg-gray-50 dark:bg-gray-950/40 flex justify-center overflow-x-auto min-h-[300px]">
                     <div className="w-full max-w-[520px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-lg overflow-hidden flex flex-col">
                       {/* CCSA University Branding header */}
                       <div className="bg-[#013358] px-5 py-4 text-white flex items-center justify-between">
                         <div>
                           <div className="font-bold text-base tracking-wide">CCSA</div>
                           <div className="text-[10px] opacity-75">Farmers Information Management System</div>
                         </div>
                         <span className="text-[9px] bg-green-600 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Official Message</span>
                       </div>
                       
                       {/* CCSA Accent strip */}
                       <div className="bg-[#16A34A] h-[3px]"></div>

                       {/* Dynamic Render HTML content */}
                       <div className="p-5 text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-sans flex-1">
                         <p className="margin-0 mb-4 font-semibold text-gray-900 dark:text-gray-100">Dear John Doe,</p>
                         <div
                           className="space-y-3 prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
                           dangerouslySetInnerHTML={{
                             __html: (function() {
                               let clean = body
                                 .replace(/&/g, '&amp;')
                                 .replace(/</g, '&lt;')
                                 .replace(/>/g, '&gt;');
                               // replace placeholders
                               clean = clean
                                 .replace(/{firstName}/g, 'John')
                                 .replace(/{lastName}/g, 'Doe')
                                 .replace(/{name}/g, 'John Doe')
                                 .replace(/{senderName}/g, 'CCSA Admin')
                                 .replace(/{email}/g, 'john.doe@example.com')
                                 .replace(/{phone}/g, '08033334444');
                               
                               // Headers
                               clean = clean.replace(/^### (.*?)$/gm, '<h3 style="margin:16px 0 8px;font-size:14px;font-weight:700;color:#013358;">$1</h3>');
                               clean = clean.replace(/^## (.*?)$/gm, '<h2 style="margin:20px 0 10px;font-size:16px;font-weight:700;color:#013358;">$1</h2>');
                               clean = clean.replace(/^# (.*?)$/gm, '<h1 style="margin:24px 0 12px;font-size:18px;font-weight:700;color:#013358;">$1</h1>');
                               
                               // Bold & Italics
                               clean = clean.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                               clean = clean.replace(/\*(.*?)\*/g, '<em>$1</em>');
                               
                               // Links
                               clean = clean.replace(/\[(.*?)\]\((.*?)\)/g, (match, linkText, url) => {
                                 const cleanUrl = url.replace(/&amp;/g, '&');
                                 return `<a href="${cleanUrl}" style="color:#013358;text-decoration:underline;font-weight:600;" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
                               });
                               
                               // Bullets
                               clean = clean.replace(/^(?:•|-|\*)\s+(.*?)$/gm, '<li style="margin-bottom:6px;">$1</li>');
                               
                               // Newlines to br
                               clean = clean.replace(/\n/g, '<br>');
                               
                               // Lists wrapping
                               clean = clean.replace(/(<li.*?>.*?<\/li>)+/g, '<ul style="padding-left:18px;margin:12px 0;">$&</ul>');
                               clean = clean.replace(/<ul style="padding-left:18px;margin:12px 0;"><br>/g, '<ul style="padding-left:18px;margin:12px 0;">');
                               clean = clean.replace(/<\/ul><br>/g, '</ul>');
                               clean = clean.replace(/<li(.*?)><br>/g, '<li$1>');
                               clean = clean.replace(/<\/li><br>/g, '</li>');
                               return clean;
                             })()
                           }}
                         />
                       </div>

                       {/* Footer inside canvas */}
                       <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-150 dark:border-gray-800 p-4 text-[10px] text-gray-400 flex items-center justify-between leading-normal select-none">
                         <div>
                           Centre for Climate Smart Agriculture &mdash; Cosmopolitan University Abuja<br/>
                           &copy; {new Date().getFullYear()} CCSA. All rights reserved.
                         </div>
                         <div className="text-right">
                           Official Administrative Message<br/>
                           Do not reply.
                         </div>
                       </div>
                     </div>
                   </div>
                 </div>
               </TabsContent>
             </Tabs>

            {/* Error */}
            {sendState.status === 'error' && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-400">
                <AlertCircleIcon className="h-4 w-4 mt-0.5 shrink-0" />
                {sendState.message}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
              {mode === 'bulk' && recipientCount !== null && (
                <p className="text-xs text-gray-500">
                  Sending to ~{recipientCount} {recipientType}(s)
                </p>
              )}
              {mode === 'individual' && selectedRecipient && (
                <p className="text-xs text-gray-500">Sending to <strong>{selectedRecipient.name}</strong></p>
              )}
              {!(mode === 'bulk' && recipientCount !== null) && !(mode === 'individual' && selectedRecipient) && (
                <span />
              )}
              <Button onClick={handleSend} disabled={!canSubmit} className="bg-ccsa-blue hover:bg-blue-800 disabled:opacity-50">
                {sendState.status === 'sending' ? (
                  <><Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
                ) : (
                  <>Send {channel === 'email' ? 'Email' : channel === 'sms' ? 'SMS' : 'Email + SMS'}</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── History Tab ──────────────────────────────────────────────────────────────

function HistoryTab({ onAction }: { onAction: () => void }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterChannel, setFilterChannel] = useState('');
  const [filterType, setFilterType] = useState('');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (filterChannel) params.set('channel', filterChannel);
      if (filterType) params.set('recipientType', filterType);
      const res = await fetch(`/api/communications?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLogs(data.logs);
      setTotalPages(data.pagination.pages);
      setTotal(data.pagination.total);
    } catch { setLogs([]); }
    finally { setLoading(false); }
  }, [page, filterChannel, filterType]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this log entry? This cannot be undone.')) return;
    setProcessingIds(prev => new Set(prev).add(id));
    setActionError(null);
    try {
      const res = await fetch(`/api/communications/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { setActionError(data.error ?? 'Failed to delete'); return; }
      setLogs(prev => prev.filter(l => l.id !== id));
      setTotal(prev => prev - 1);
      onAction();
    } catch {
      setActionError('Network error — please try again');
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }, [onAction]);

  const handleRetry = useCallback(async (id: string) => {
    setProcessingIds(prev => new Set(prev).add(id));
    setActionError(null);
    try {
      const res = await fetch(`/api/communications/${id}/retry`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setActionError(data.error ?? 'Failed to retry'); return; }
      await fetchLogs();
      onAction();
    } catch {
      setActionError('Network error — please try again');
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }, [fetchLogs, onAction]);

  const senderName = (log: LogEntry) => {
    const u = log.sentBy;
    return u.displayName ?? (`${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterChannel} onValueChange={(v) => { setFilterChannel(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All channels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All channels</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="both">Email + SMS</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={(v) => { setFilterType(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="farmer">Farmer</SelectItem>
            <SelectItem value="agent">Agent</SelectItem>
            <SelectItem value="bulk_farmer">Bulk — Farmers</SelectItem>
            <SelectItem value="bulk_agent">Bulk — Agents</SelectItem>
          </SelectContent>
        </Select>

        {total > 0 && (
          <p className="text-sm text-gray-500 self-center ml-auto">{total} message{total !== 1 ? 's' : ''} total</p>
        )}
      </div>

      {/* Action error */}
      {actionError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-400">
          <AlertCircleIcon className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="flex-1">{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600 text-xs ml-2">✕</button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2Icon className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <MessageSquareIcon className="h-10 w-10 mx-auto mb-2 text-ccsa-blue/20" />
          <p className="text-sm">No messages found</p>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-ccsa-blue/5 dark:bg-gray-800/50">
                <TableHead>Date</TableHead>
                <TableHead>Recipient(s)</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Subject / Preview</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent By</TableHead>
                <TableHead className="text-right w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} className="text-sm">
                  <TableCell className="whitespace-nowrap text-gray-500 text-xs">
                    {new Date(log.sentAt).toLocaleDateString()}<br />
                    <span className="text-gray-400">{new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-35">
                      {log.recipientName ?? log.recipientType.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">
                      {log.recipientType.replace('_', ' ')}
                      {log.recipientCount > 1 && ` · ${log.recipientCount} recipients`}
                    </p>
                  </TableCell>
                  <TableCell>{channelBadge(log.channel)}</TableCell>
                  <TableCell>
                    {log.subject ? (
                      <p className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-45">{log.subject}</p>
                    ) : null}
                    <p className="text-xs text-gray-400 truncate max-w-45">{log.body}</p>
                  </TableCell>
                  <TableCell>{statusBadge(log.status)}</TableCell>
                  <TableCell className="text-xs text-gray-500 truncate max-w-30">{senderName(log)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {processingIds.has(log.id) ? (
                      <div className="flex justify-end pr-2">
                        <Loader2Icon className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-0.5">
                        {!log.recipientType.startsWith('bulk_') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-ccsa-blue"
                            onClick={() => handleRetry(log.id)}
                            title="Retry send"
                          >
                            <RefreshCwIcon className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-600"
                          onClick={() => handleDelete(log.id)}
                          title="Delete log entry"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CommunicationsPage() {
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const { status } = useSession();
  const router = useRouter();

  const canSend = hasPermission(PERMISSIONS.COMMUNICATIONS_SEND);
  const [statsRefresh, setStatsRefresh] = useState(0);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
    if (!permissionsLoading && status === 'authenticated' && !hasPermission(PERMISSIONS.COMMUNICATIONS_READ)) {
      router.push('/dashboard');
    }
  }, [status, permissionsLoading, hasPermission, router]);

  if (permissionsLoading || status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2Icon className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
          <MessageSquareIcon className="h-7 w-7 text-ccsa-blue dark:text-blue-400" /> Communications
        </h1>
        <p className="text-muted-foreground mt-1">
          Send email and SMS messages to farmers and agents
        </p>
      </div>

      <StatsBar refresh={statsRefresh} />

      <Tabs defaultValue={canSend ? 'compose' : 'history'}>
        <TabsList>
          {canSend && <TabsTrigger value="compose">Compose</TabsTrigger>}
          <TabsTrigger value="history">Message History</TabsTrigger>
        </TabsList>

        {canSend && (
          <TabsContent value="compose" className="mt-6">
            <ComposeTab onSent={() => setStatsRefresh(n => n + 1)} />
          </TabsContent>
        )}

        <TabsContent value="history" className="mt-6">
          <HistoryTab onAction={() => setStatsRefresh(n => n + 1)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

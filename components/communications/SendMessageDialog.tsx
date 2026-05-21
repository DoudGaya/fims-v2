'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquareIcon, MailIcon, PhoneIcon, CheckCircle2Icon, AlertCircleIcon, Loader2Icon } from 'lucide-react';

interface SendMessageDialogProps {
  recipientType: 'farmer' | 'agent';
  recipientId: string;
  recipientName: string;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  /** Optional: wrap a custom trigger element instead of the default button */
  trigger?: React.ReactNode;
}

type Channel = 'email' | 'sms' | 'both';

type SendState =
  | { status: 'idle' }
  | { status: 'sending' }
  | { status: 'success'; sentCount: number }
  | { status: 'error'; message: string };

const SMS_LIMIT = 160;

export function SendMessageDialog({
  recipientType,
  recipientId,
  recipientName,
  recipientEmail,
  recipientPhone,
  trigger,
}: SendMessageDialogProps) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<Channel>(
    recipientEmail ? 'email' : 'sms'
  );
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sendState, setSendState] = useState<SendState>({ status: 'idle' });

  const hasEmail = !!recipientEmail;
  const hasPhone = !!recipientPhone;

  const canSend =
    body.trim().length > 0 &&
    (channel !== 'email' && channel !== 'both' || subject.trim().length > 0);

  const reset = () => {
    setSubject('');
    setBody('');
    setChannel(recipientEmail ? 'email' : 'sms');
    setSendState({ status: 'idle' });
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) reset();
    setOpen(value);
  };

  const handleSend = async () => {
    setSendState({ status: 'sending' });
    try {
      const res = await fetch('/api/communications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          subject: channel !== 'sms' ? subject : undefined,
          body,
          recipients: {
            mode: 'individual',
            recipientType,
            id: recipientId,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSendState({ status: 'error', message: data.error ?? 'Failed to send message' });
        return;
      }

      setSendState({ status: 'success', sentCount: data.sentCount });
    } catch {
      setSendState({ status: 'error', message: 'Network error — please try again' });
    }
  };

  const channelLabel: Record<Channel, string> = {
    email: 'Email',
    sms: 'SMS',
    both: 'Email + SMS',
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-2 bg-ccsa-blue hover:bg-blue-800 text-white">
            <MessageSquareIcon className="h-4 w-4" />
            Send Message
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareIcon className="h-5 w-5 text-ccsa-blue dark:text-blue-400" />
            Send Message
          </DialogTitle>
          <DialogDescription>
            Sending to <span className="font-medium text-foreground">{recipientName}</span>
            {' '}
            <Badge variant="secondary" className="text-xs capitalize">{recipientType}</Badge>
          </DialogDescription>
        </DialogHeader>

        {/* ── Success state ── */}
        {sendState.status === 'success' ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="rounded-full bg-green-50 dark:bg-green-900/20 p-3">
              <CheckCircle2Icon className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Message sent successfully via {channelLabel[channel]}
            </p>
            <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <>
            {/* ── Contact info strip ── */}
            <div className="flex flex-wrap gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md text-xs text-gray-600 dark:text-gray-400">
              {hasEmail ? (
                <span className="flex items-center gap-1.5">
                  <MailIcon className="h-3.5 w-3.5" /> {recipientEmail}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 line-through opacity-50">
                  <MailIcon className="h-3.5 w-3.5" /> No email on file
                </span>
              )}
              {hasPhone ? (
                <span className="flex items-center gap-1.5">
                  <PhoneIcon className="h-3.5 w-3.5" /> {recipientPhone}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 line-through opacity-50">
                  <PhoneIcon className="h-3.5 w-3.5" /> No phone on file
                </span>
              )}
            </div>

            {/* ── Channel selector ── */}
            <div className="space-y-1.5">
              <Label>Channel</Label>
              <div className="flex gap-2">
                {([
                  { value: 'email', label: 'Email', disabled: !hasEmail },
                  { value: 'sms', label: 'SMS', disabled: !hasPhone },
                  { value: 'both', label: 'Email + SMS', disabled: !hasEmail || !hasPhone },
                ] as { value: Channel; label: string; disabled: boolean }[]).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled || sendState.status === 'sending'}
                    onClick={() => setChannel(opt.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors
                      ${channel === opt.value
                        ? 'bg-ccsa-blue text-white border-ccsa-blue'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}
                      ${opt.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {opt.value === 'email' && <MailIcon className="h-3.5 w-3.5" />}
                    {opt.value === 'sms' && <PhoneIcon className="h-3.5 w-3.5" />}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Subject (email only) ── */}
            {(channel === 'email' || channel === 'both') && (
              <div className="space-y-1.5">
                <Label htmlFor="msg-subject">Subject</Label>
                <Input
                  id="msg-subject"
                  placeholder="Enter subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={sendState.status === 'sending'}
                />
              </div>
            )}

            {/* ── Message body ── */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="msg-body">Message</Label>
                {(channel === 'sms' || channel === 'both') && (
                  <span className={`text-xs ${body.length > SMS_LIMIT ? 'text-red-500' : 'text-gray-400'}`}>
                    {body.length}/{SMS_LIMIT} chars {body.length > SMS_LIMIT && '— SMS may be split'}
                  </span>
                )}
              </div>
              <Textarea
                id="msg-body"
                placeholder="Write your message here…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                disabled={sendState.status === 'sending'}
                className="resize-none"
              />
            </div>

            {/* ── Error banner ── */}
            {sendState.status === 'error' && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-400">
                <AlertCircleIcon className="h-4 w-4 mt-0.5 shrink-0" />
                {sendState.message}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={sendState.status === 'sending'}>
                Cancel
              </Button>
              <Button onClick={handleSend} disabled={!canSend || sendState.status === 'sending'} className="bg-ccsa-blue hover:bg-blue-800 disabled:opacity-50">
                {sendState.status === 'sending' ? (
                  <><Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
                ) : (
                  `Send via ${channelLabel[channel]}`
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

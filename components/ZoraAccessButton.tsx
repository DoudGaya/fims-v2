'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export function ZoraAccessButton({ type, id }: { type: 'farmer' | 'agent'; id: string }) {
  const { data: session } = useSession();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [available, setAvailable] = useState<boolean | null>(null);
  const isAdmin = session?.user?.role === 'admin';
  useEffect(() => {
    if (!isAdmin) return;
    setEnabled(null); setAvailable(null); setError('');
    const controller = new AbortController();
    fetch(`/api/admin/zora-access?type=${type}&id=${encodeURIComponent(id)}`, { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => { if (controller.signal.aborted) return; setAvailable(data.available === true); if (data.available === true) setEnabled(data.enabled === true); })
      .catch(() => { if (!controller.signal.aborted) setError('Could not load Zora access'); });
    return () => controller.abort();
  }, [type, id, isAdmin]);
  if (!isAdmin) return null;
  async function toggle() {
    if (busy || available !== true || enabled === null) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/zora-access', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, id, enabled: !enabled }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update Zora access');
      setEnabled(data.enabled);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update Zora access'); }
    finally { setBusy(false); }
  }
  return <span className="inline-flex flex-col items-end gap-1 mr-2">
    <button type="button" disabled={busy || available !== true || enabled === null} onClick={toggle} aria-pressed={enabled === true} className="rounded border px-2 py-1 text-xs disabled:opacity-50">{busy ? 'Saving…' : available === false ? 'Zora · Setup required' : error && enabled === null ? 'Zora · Unavailable' : enabled === null ? 'Zora · Loading…' : enabled ? 'Disable Zora' : 'Enable free Zora'}</button>
    {available === false && <span className="max-w-56 text-xs text-muted-foreground">Zora integration is not enabled on this FIMS server.</span>}
    {error && <span role="alert" className="text-xs text-red-600">{error}</span>}
  </span>;
}

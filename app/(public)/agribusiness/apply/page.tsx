'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { agribusinessInterestAreas, stakeholderTypes } from '@/lib/brand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const valueChainRoles = [
  'Input Supply',
  'Production Support',
  'Aggregation',
  'Processing',
  'Off-take',
  'Finance',
  'Insurance',
  'Logistics',
  'Training',
  'Research',
  'Technology',
];

const cropOptions = ['Maize', 'Rice', 'Soybean', 'Sorghum', 'Cassava', 'Yam', 'Tomato', 'Groundnut', 'Sesame', 'Vegetables'];

function ToggleGroup({
  items,
  selected,
  onToggle,
}: {
  items: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const active = selected.includes(item);
        return (
          <button
            key={item}
            type="button"
            onClick={() => onToggle(item)}
            className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
              active
                ? 'border-[#013358] bg-[#013358] text-white'
                : 'border-[#DCEAF3] bg-white text-[#475569] hover:border-[#02426F] hover:text-[#013358]'
            }`}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}

export default function AgriBusinessApplyPage() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    businessName: '',
    businessType: '',
    registrationNumber: '',
    tin: '',
    contactName: '',
    contactRole: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    state: '',
    lga: '',
    servicesOffered: '',
    capacitySummary: '',
    expectedEngagement: '',
    applicationType: 'Partnership',
    expectedFarmerReach: '',
  });
  const [interests, setInterests] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [crops, setCrops] = useState<string[]>([]);

  const canSubmit = useMemo(
    () => form.businessName && form.businessType && form.contactName && form.email && interests.length > 0,
    [form.businessName, form.businessType, form.contactName, form.email, interests.length]
  );

  const setField = (field: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [field]: value }));
  const toggle = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      setError('Please complete the required fields and select at least one interest area.');
      return;
    }

    setStatus('submitting');
    setError('');

    try {
      const response = await fetch('/api/public/agribusiness/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          interests,
          valueChainRoles: roles,
          targetCrops: crops,
          targetStates: form.state ? [form.state] : [],
          targetLGAs: form.lga ? [form.lga] : [],
          applicationTitle: `${form.businessName} - ${form.applicationType}`,
          expectedFarmerReach: form.expectedFarmerReach ? Number(form.expectedFarmerReach) : undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to submit application.');
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unable to submit application.');
    }
  };

  if (status === 'success') {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#DCEAF3] text-[#013358]">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <h1 className="text-3xl font-bold text-[#1E293B] dark:text-white">Application received</h1>
        <p className="mt-3 leading-7 text-[#475569] dark:text-muted-foreground">
          Thank you for your interest in partnering with CCSA. Your agri-business profile has
          been submitted for review and KYB follow-up.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/agribusiness">Back to Agri-Business</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/fims">View FIMS</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 max-w-3xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#F3F8FC] px-3 py-1 text-sm font-bold text-[#013358]">
          <ShieldCheck className="h-4 w-4" />
          Business onboarding and KYB
        </div>
        <h1 className="text-3xl font-bold tracking-normal text-[#1E293B] dark:text-white">
          Apply for an agri-business partnership with CCSA.
        </h1>
        <p className="mt-3 leading-7 text-[#475569] dark:text-muted-foreground">
          Tell us about your organisation, where you work, and how you want to engage with
          farmers through FIMS and CCSA agri-entrepreneurship programmes.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-lg border border-[#DCEAF3] bg-white p-6 shadow-sm dark:bg-card">
          <h2 className="text-lg font-bold">Business profile</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Business name *</Label>
              <Input value={form.businessName} onChange={(e) => setField('businessName', e.target.value)} placeholder="e.g. Green Harvest Processors Ltd" />
            </div>
            <div className="space-y-2">
              <Label>Stakeholder type *</Label>
              <Select value={form.businessType} onValueChange={(value) => setField('businessType', value)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {stakeholderTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>CAC / registration number</Label>
              <Input value={form.registrationNumber} onChange={(e) => setField('registrationNumber', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>TIN</Label>
              <Input value={form.tin} onChange={(e) => setField('tin', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input value={form.website} onChange={(e) => setField('website', e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Operating state</Label>
              <Input value={form.state} onChange={(e) => setField('state', e.target.value)} placeholder="e.g. Kano" />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-[#DCEAF3] bg-white p-6 shadow-sm dark:bg-card">
          <h2 className="text-lg font-bold">Contact and location</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Contact name *</Label>
              <Input value={form.contactName} onChange={(e) => setField('contactName', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Role / designation</Label>
              <Input value={form.contactRole} onChange={(e) => setField('contactRole', e.target.value)} placeholder="e.g. Partnerships Manager" />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Business address</Label>
              <Input value={form.address} onChange={(e) => setField('address', e.target.value)} />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-[#DCEAF3] bg-white p-6 shadow-sm dark:bg-card">
          <h2 className="text-lg font-bold">Interest discovery</h2>
          <div className="mt-5 space-y-6">
            <div className="space-y-3">
              <Label>Areas of interest *</Label>
              <ToggleGroup items={agribusinessInterestAreas} selected={interests} onToggle={(value) => toggle(value, setInterests)} />
            </div>
            <div className="space-y-3">
              <Label>Value-chain roles</Label>
              <ToggleGroup items={valueChainRoles} selected={roles} onToggle={(value) => toggle(value, setRoles)} />
            </div>
            <div className="space-y-3">
              <Label>Target crops</Label>
              <ToggleGroup items={cropOptions} selected={crops} onToggle={(value) => toggle(value, setCrops)} />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-[#DCEAF3] bg-white p-6 shadow-sm dark:bg-card">
          <h2 className="text-lg font-bold">Partnership request</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Application type</Label>
              <Select value={form.applicationType} onValueChange={(value) => setField('applicationType', value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Partnership', 'Farmer Outreach', 'Input Distribution', 'Off-take Programme', 'Finance / Insurance', 'Research / Survey', 'Training'].map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Expected farmer reach</Label>
              <Input type="number" value={form.expectedFarmerReach} onChange={(e) => setField('expectedFarmerReach', e.target.value)} placeholder="e.g. 5000" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Services or products offered</Label>
              <Textarea value={form.servicesOffered} onChange={(e) => setField('servicesOffered', e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Capacity summary</Label>
              <Textarea value={form.capacitySummary} onChange={(e) => setField('capacitySummary', e.target.value)} placeholder="Operational capacity, coverage, previous projects, and delivery capability." />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Expected engagement with CCSA/FIMS</Label>
              <Textarea value={form.expectedEngagement} onChange={(e) => setField('expectedEngagement', e.target.value)} placeholder="Describe the partnership you are seeking." />
            </div>
          </div>
        </section>

        {error && <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-[#F8FAFC] p-4">
          <p className="max-w-xl text-sm text-[#475569]">
            By submitting, your organisation agrees to be contacted by CCSA for KYB verification,
            partnership review, and programme fit assessment.
          </p>
          <Button type="submit" disabled={!canSubmit || status === 'submitting'}>
            {status === 'submitting' && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit Application
          </Button>
        </div>
      </form>
    </div>
  );
}

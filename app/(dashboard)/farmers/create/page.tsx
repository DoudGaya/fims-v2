'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { usePermissions } from '@/components/PermissionProvider';
import { PERMISSIONS } from '@/lib/permissions';
import { hierarchicalData } from '@/lib/data/hierarchical-data';

const formatLocation = (name: string) => {
  if (!name) return '';
  return name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

interface Referee { firstName: string; lastName: string; phone: string; relationship: string; }

export default function CreateFarmerPage() {
  const { status } = useSession();
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [clusters, setClusters] = useState<{ id: string; title: string }[]>([]);

  const states = hierarchicalData.map((d: any) => formatLocation(d.state));
  const [selectedStateData, setSelectedStateData] = useState<any>(null);
  const [selectedLgaData, setSelectedLgaData] = useState<any>(null);
  const [selectedWardData, setSelectedWardData] = useState<any>(null);

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [validatingNIN, setValidatingNIN] = useState(false);
  const [ninVerified, setNinVerified] = useState(false);

  const [referees, setReferees] = useState<Referee[]>([{ firstName: '', lastName: '', phone: '', relationship: '' }]);

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', middleName: '', phone: '', email: '',
    nin: '', bvn: '', gender: '', maritalStatus: '', dateOfBirth: '',
    address: '', whatsAppNumber: '', employmentStatus: '',
    bankName: '', accountNumber: '', accountName: '',
    state: '', lga: '', ward: '', pollingUnit: '',
    clusterId: '', photoUrl: '',
    primaryCrop: '', farmSize: '', secondaryCrop: '', farmingExperience: '',
    farmLatitude: '', farmLongitude: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
    else if (status === 'authenticated' && !hasPermission(PERMISSIONS.FARMERS_CREATE)) router.push('/farmers');
  }, [status, router, hasPermission]);

  useEffect(() => {
    fetch('/api/clusters?limit=200')
      .then((r) => r.json())
      .then((d) => setClusters(d.clusters || []))
      .catch(() => {});
  }, []);

  const set = (field: string, value: string) => setFormData((p) => ({ ...p, [field]: value }));

  const handleStateChange = (name: string) => {
    setFormData((p) => ({ ...p, state: name, lga: '', ward: '', pollingUnit: '' }));
    const s = hierarchicalData.find((d: any) => formatLocation(d.state) === name);
    setSelectedStateData(s || null); setSelectedLgaData(null); setSelectedWardData(null);
  };
  const handleLgaChange = (name: string) => {
    setFormData((p) => ({ ...p, lga: name, ward: '', pollingUnit: '' }));
    const l = selectedStateData?.lgas.find((d: any) => formatLocation(d.lga) === name);
    setSelectedLgaData(l || null); setSelectedWardData(null);
  };
  const handleWardChange = (name: string) => {
    setFormData((p) => ({ ...p, ward: name, pollingUnit: '' }));
    const w = selectedLgaData?.wards.find((d: any) => formatLocation(d.ward) === name);
    setSelectedWardData(w || null);
  };

  const handlePhotoSelect = useCallback(async (file: File) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) { setPhotoError('Only JPEG, PNG or WebP images are accepted.'); return; }
    if (file.size > 5 * 1024 * 1024) { setPhotoError('Image must be 5 MB or smaller.'); return; }
    setPhotoError(''); setPhotoPreview(URL.createObjectURL(file)); setPhotoUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/upload/agent-photo', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      set('photoUrl', data.url);
    } catch (err: any) { setPhotoError(err.message); setPhotoPreview(''); set('photoUrl', ''); }
    finally { setPhotoUploading(false); }
  }, []);

  const onPhotoDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0]; if (file) handlePhotoSelect(file);
  }, [handlePhotoSelect]);

  const handleVerifyNIN = async () => {
    if (!formData.nin || formData.nin.length !== 11) { setErrorMsg('Please enter a valid 11-digit NIN'); return; }
    setValidatingNIN(true); setErrorMsg('');
    try {
      const res = await fetch('/api/validate/nin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nin: formData.nin }) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || result.error || 'Verification failed');
      if (result.success && result.data) {
        setNinVerified(true);
        const d = result.data; const updates: any = {};
        if (!formData.firstName && d.firstName) updates.firstName = d.firstName;
        if (!formData.lastName && d.lastName) updates.lastName = d.lastName;
        if (!formData.middleName && d.middleName) updates.middleName = d.middleName;
        if (!formData.dateOfBirth && d.dateOfBirth) updates.dateOfBirth = new Date(d.dateOfBirth).toISOString().split('T')[0];
        if (d.gender) updates.gender = d.gender;
        setFormData((p) => ({ ...p, ...updates }));
        alert(`NIN Verified: ${d.firstName} ${d.lastName}`);
      }
    } catch (error: any) { setErrorMsg(error.message || 'NIN Validation Failed'); }
    finally { setValidatingNIN(false); }
  };

  const handleRefereeChange = (idx: number, field: keyof Referee, value: string) => {
    setReferees((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };
  const addReferee = () => setReferees((p) => [...p, { firstName: '', lastName: '', phone: '', relationship: '' }]);
  const removeReferee = (idx: number) => setReferees((p) => p.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setErrorMsg('');
    try {
      if (!formData.clusterId) throw new Error('Please select a cluster');
      if (!formData.phone || formData.phone.length !== 11 || /\D/.test(formData.phone))
        throw new Error('Phone number must be exactly 11 digits');
      if (formData.nin && (formData.nin.length !== 11 || /\D/.test(formData.nin)))
        throw new Error('NIN must be exactly 11 numeric digits');
      if (formData.bvn && !/^\d{11}$/.test(formData.bvn))
        throw new Error('BVN must be exactly 11 digits');
      if (formData.accountNumber && !/^\d{10}$/.test(formData.accountNumber))
        throw new Error('Account number must be exactly 10 digits');

      const payload: any = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        clusterId: formData.clusterId,
      };
      if (formData.middleName?.trim()) payload.middleName = formData.middleName.trim();
      if (formData.email?.trim()) payload.email = formData.email.trim();
      if (formData.nin?.trim()) payload.nin = formData.nin.trim();
      if (formData.bvn?.trim()) payload.bvn = formData.bvn.trim();
      if (formData.gender) payload.gender = formData.gender;
      if (formData.maritalStatus) payload.maritalStatus = formData.maritalStatus;
      if (formData.dateOfBirth) payload.dateOfBirth = formData.dateOfBirth;
      if (formData.address?.trim()) payload.address = formData.address.trim();
      if (formData.whatsAppNumber?.trim()) payload.whatsAppNumber = formData.whatsAppNumber.trim();
      if (formData.employmentStatus) payload.employmentStatus = formData.employmentStatus;
      if (formData.bankName?.trim()) payload.bankName = formData.bankName.trim();
      if (formData.accountNumber?.trim()) payload.accountNumber = formData.accountNumber.trim();
      if (formData.accountName?.trim()) payload.accountName = formData.accountName.trim();
      if (formData.photoUrl?.trim()) payload.photoUrl = formData.photoUrl.trim();
      if (formData.state) payload.state = formData.state;
      if (formData.lga) payload.lga = formData.lga;
      if (formData.ward?.trim()) payload.ward = formData.ward.trim();
      if (formData.pollingUnit?.trim()) payload.pollingUnit = formData.pollingUnit.trim();
      if (formData.primaryCrop?.trim()) payload.primaryCrop = formData.primaryCrop.trim();
      if (formData.secondaryCrop?.trim()) payload.secondaryCrop = formData.secondaryCrop.trim();
      if (formData.farmSize) payload.farmSize = parseFloat(formData.farmSize);
      if (formData.farmingExperience) payload.farmingExperience = parseInt(formData.farmingExperience);
      if (formData.farmLatitude) payload.farmLatitude = parseFloat(formData.farmLatitude);
      if (formData.farmLongitude) payload.farmLongitude = parseFloat(formData.farmLongitude);

      const validRefs = referees.filter((r) => r.firstName.trim() && r.lastName.trim() && r.phone.trim());
      if (validRefs.length > 0) payload.referees = validRefs;

      const res = await fetch('/api/farmers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to create farmer'); }
      router.push('/farmers'); router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create farmer. Please check the form and try again.');
    } finally { setSaving(false); }
  };

  if (status === 'loading') {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;
  }

  return (
    <div className="w-full px-6 py-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/farmers"><ArrowLeftIcon className="h-4 w-4 mr-2" />Back to Farmers</Link>
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Register New Farmer</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-8">
          {errorMsg && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-md text-sm border border-red-200 dark:border-red-500/30">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

            {/* ── Column 1: Personal Info ── */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Core biographical data and contact details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Photo */}
                  <div className="space-y-2">
                    <Label>Profile Photo</Label>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="sr-only"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(f); }} />
                    {photoPreview ? (
                      <div className="flex items-center gap-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photoPreview} alt="Preview" className="h-20 w-20 rounded-md object-cover border border-gray-200 dark:border-gray-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          {photoUploading ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                              <span className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />Uploading…
                            </div>
                          ) : formData.photoUrl ? (
                            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 font-medium"><CheckCircleIcon className="h-5 w-5" />Photo ready</div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400"><XCircleIcon className="h-5 w-5" />{photoError || 'Upload failed'}</div>
                          )}
                          <Button type="button" variant="ghost" size="sm" className="mt-1 h-7 text-xs text-gray-500 dark:text-gray-400"
                            onClick={() => { setPhotoPreview(''); setPhotoError(''); set('photoUrl', ''); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                            Remove &amp; replace
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div role="button" tabIndex={0}
                        onClick={() => fileInputRef.current?.click()}
                        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={onPhotoDrop}
                        className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed py-6 cursor-pointer transition-colors ${isDragging ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-700/40'}`}>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Drop photo or <span className="text-indigo-600 dark:text-indigo-400 underline">click to browse</span></span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">JPEG, PNG, WebP · max 5 MB</span>
                      </div>
                    )}
                    {photoError && !photoPreview && <p className="text-xs text-red-600 dark:text-red-400">{photoError}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name <span className="text-red-500">*</span></Label>
                      <Input required value={formData.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="John" />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name <span className="text-red-500">*</span></Label>
                      <Input required value={formData.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Doe" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Middle Name</Label>
                    <Input value={formData.middleName} onChange={(e) => set('middleName', e.target.value)} placeholder="Optional" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone <span className="text-red-500">*</span></Label>
                    <Input required maxLength={11} value={formData.phone} onChange={(e) => set('phone', e.target.value)} placeholder="08012345678" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input type="email" value={formData.email} onChange={(e) => set('email', e.target.value)} placeholder="farmer@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp Number</Label>
                    <Input value={formData.whatsAppNumber} onChange={(e) => set('whatsAppNumber', e.target.value)} placeholder="+234..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select value={formData.gender} onValueChange={(v) => set('gender', v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Marital Status</Label>
                      <Select value={formData.maritalStatus} onValueChange={(v) => set('maritalStatus', v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Single">Single</SelectItem>
                          <SelectItem value="Married">Married</SelectItem>
                          <SelectItem value="Divorced">Divorced</SelectItem>
                          <SelectItem value="Widowed">Widowed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <Input type="date" value={formData.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Employment Status</Label>
                    <Select value={formData.employmentStatus} onValueChange={(v) => set('employmentStatus', v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Full-time Farmer">Full-time Farmer</SelectItem>
                        <SelectItem value="Part-time Farmer">Part-time Farmer</SelectItem>
                        <SelectItem value="Employed">Employed</SelectItem>
                        <SelectItem value="Self-employed">Self-employed</SelectItem>
                        <SelectItem value="Unemployed">Unemployed</SelectItem>
                        <SelectItem value="Retired">Retired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Residential Address</Label>
                    <Textarea value={formData.address} onChange={(e) => set('address', e.target.value)} rows={3} placeholder="Full residential address" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Column 2: Compliance & Farming ── */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Identity &amp; Compliance</CardTitle>
                  <CardDescription>NIN, BVN and banking information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>NIN</Label>
                    <div className="flex gap-2">
                      <Input minLength={11} maxLength={11} value={formData.nin}
                        onChange={(e) => { set('nin', e.target.value); setNinVerified(false); }}
                        className={ninVerified ? 'border-green-500' : ''}
                        placeholder="11-digit NIN" />
                      <Button type="button" variant="secondary" onClick={handleVerifyNIN}
                        disabled={validatingNIN || !formData.nin || formData.nin.length !== 11}>
                        {validatingNIN ? 'Verifying...' : 'Verify'}
                      </Button>
                    </div>
                    {ninVerified && <p className="text-xs text-green-600 dark:text-green-400">✓ Validated against national database</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>BVN</Label>
                    <Input minLength={11} maxLength={11} value={formData.bvn} onChange={(e) => set('bvn', e.target.value)} placeholder="11-digit BVN" />
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium mb-3 text-gray-900 dark:text-gray-100">Bank Account Details</h4>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Bank Name</Label>
                        <Input value={formData.bankName} onChange={(e) => set('bankName', e.target.value)} placeholder="e.g. GTBank" />
                      </div>
                      <div className="space-y-2">
                        <Label>Account Number</Label>
                        <Input value={formData.accountNumber} onChange={(e) => set('accountNumber', e.target.value)} maxLength={10} placeholder="10-digit account number" />
                      </div>
                      <div className="space-y-2">
                        <Label>Account Name</Label>
                        <Input value={formData.accountName} onChange={(e) => set('accountName', e.target.value)} placeholder="Account holder name" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Farming Profile</CardTitle>
                  <CardDescription>Agricultural activity and initial farm data.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Cluster <span className="text-red-500">*</span></Label>
                    <Select value={formData.clusterId} onValueChange={(v) => set('clusterId', v)}>
                      <SelectTrigger><SelectValue placeholder="Select cluster" /></SelectTrigger>
                      <SelectContent>
                        {clusters.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Primary Crop</Label>
                    <Input value={formData.primaryCrop} onChange={(e) => set('primaryCrop', e.target.value)} placeholder="e.g. Rice, Maize" />
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary Crops</Label>
                    <Input value={formData.secondaryCrop} onChange={(e) => set('secondaryCrop', e.target.value)} placeholder="e.g. Beans, Sorghum" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Farm Size (Ha)</Label>
                      <Input type="number" step="0.01" min="0" value={formData.farmSize} onChange={(e) => set('farmSize', e.target.value)} placeholder="e.g. 2.5" />
                    </div>
                    <div className="space-y-2">
                      <Label>Experience (Years)</Label>
                      <Input type="number" min="0" value={formData.farmingExperience} onChange={(e) => set('farmingExperience', e.target.value)} placeholder="e.g. 5" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Latitude (GPS)</Label>
                      <Input type="number" step="any" value={formData.farmLatitude} onChange={(e) => set('farmLatitude', e.target.value)} placeholder="e.g. 11.9964" />
                    </div>
                    <div className="space-y-2">
                      <Label>Longitude (GPS)</Label>
                      <Input type="number" step="any" value={formData.farmLongitude} onChange={(e) => set('farmLongitude', e.target.value)} placeholder="e.g. 8.5172" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Referees */}
              <Card>
                <CardHeader>
                  <CardTitle>Referees / Next of Kin</CardTitle>
                  <CardDescription>At least one referee is recommended.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {referees.map((ref, idx) => (
                    <div key={idx} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3 bg-gray-50 dark:bg-gray-700/30">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Referee {idx + 1}</span>
                        {referees.length > 1 && (
                          <Button type="button" variant="ghost" size="sm" className="h-6 text-xs text-red-500 hover:text-red-700" onClick={() => removeReferee(idx)}>Remove</Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">First Name</Label>
                          <Input value={ref.firstName} onChange={(e) => handleRefereeChange(idx, 'firstName', e.target.value)} placeholder="First Name" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Last Name</Label>
                          <Input value={ref.lastName} onChange={(e) => handleRefereeChange(idx, 'lastName', e.target.value)} placeholder="Last Name" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Phone (11 digits)</Label>
                          <Input maxLength={11} value={ref.phone} onChange={(e) => handleRefereeChange(idx, 'phone', e.target.value)} placeholder="08012345678" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Relationship</Label>
                          <Input value={ref.relationship} onChange={(e) => handleRefereeChange(idx, 'relationship', e.target.value)} placeholder="e.g. Brother" />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="w-full" onClick={addReferee}>
                    + Add Another Referee
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* ── Column 3: Location ── */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Location</CardTitle>
                  <CardDescription>Residential geographic details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-700/40 p-3 rounded-md space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Residential Location</h4>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Select onValueChange={handleStateChange} value={formData.state}>
                        <SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger>
                        <SelectContent>{states.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>LGA</Label>
                      <Select disabled={!formData.state} onValueChange={handleLgaChange} value={formData.lga}>
                        <SelectTrigger><SelectValue placeholder="Select LGA" /></SelectTrigger>
                        <SelectContent>
                          {selectedStateData?.lgas.map((l: any) => {
                            const n = formatLocation(l.lga); return <SelectItem key={n} value={n}>{n}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Ward</Label>
                      <Select disabled={!formData.lga} onValueChange={handleWardChange} value={formData.ward}>
                        <SelectTrigger><SelectValue placeholder="Select Ward" /></SelectTrigger>
                        <SelectContent>
                          {selectedLgaData?.wards.map((w: any) => {
                            const n = formatLocation(w.ward); return <SelectItem key={n} value={n}>{n}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Polling Unit</Label>
                      <Select disabled={!formData.ward} onValueChange={(v) => set('pollingUnit', v)} value={formData.pollingUnit}>
                        <SelectTrigger><SelectValue placeholder="Select Polling Unit" /></SelectTrigger>
                        <SelectContent>
                          {Array.from(new Set(selectedWardData?.polling_units?.map((pu: string) => formatLocation(pu)) || [])).map((name: any, idx: number) => (
                            <SelectItem key={`${name}-${idx}`} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>

          <div className="flex justify-end gap-4 bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm sticky bottom-4 z-10">
            <Button variant="outline" type="button" onClick={() => router.push('/farmers')}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 min-w-36" disabled={saving}>
              {saving ? 'Registering...' : 'Register Farmer'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

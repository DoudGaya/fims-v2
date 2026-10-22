'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
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
  return name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

export default function CreateAgentPage() {
  const { status } = useSession();
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const states = hierarchicalData.map((d: any) => formatLocation(d.state));
  const [selectedStateData, setSelectedStateData] = useState<any>(null);
  const [selectedLgaData, setSelectedLgaData] = useState<any>(null);
  const [selectedWardData, setSelectedWardData] = useState<any>(null);

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', middleName: '', email: '', phone: '', password: '',
    whatsAppNumber: '', alternativePhone: '', nin: '', bvn: '', gender: '',
    maritalStatus: '', dateOfBirth: '', address: '', education: '', courseOfStudy: '',
    enrollmentCode: '', cluster: '', jobHistory: '', motivation: '', bankName: '',
    accountNumber: '', accountName: '', state: '', lga: '', ward: '', pollingUnit: '',
    city: '', assignedState: '', assignedLGA: '',
    agentType: 'enrollment' as 'enrollment' | 'household' | 'correction' | 'survey' | 'agribusiness',
    status: 'Applied', photoUrl: '',
  });

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [validatingNIN, setValidatingNIN] = useState(false);
  const [ninVerified, setNinVerified] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && !hasPermission(PERMISSIONS.AGENTS_CREATE)) {
      router.push('/agents');
    }
  }, [status, router, hasPermission]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'nin') setNinVerified(false);
  };

  const handleStateChange = (stateName: string) => {
    setFormData(prev => ({ ...prev, state: stateName, lga: '', ward: '', pollingUnit: '' }));
    const newState = hierarchicalData.find((s: any) => formatLocation(s.state) === stateName);
    setSelectedStateData(newState || null);
    setSelectedLgaData(null);
    setSelectedWardData(null);
  };

  const handleLgaChange = (lgaName: string) => {
    setFormData(prev => ({ ...prev, lga: lgaName, ward: '', pollingUnit: '' }));
    const newLga = selectedStateData?.lgas.find((l: any) => formatLocation(l.lga) === lgaName);
    setSelectedLgaData(newLga || null);
    setSelectedWardData(null);
  };

  const handleWardChange = (wardName: string) => {
    setFormData(prev => ({ ...prev, ward: wardName, pollingUnit: '' }));
    const newWard = selectedLgaData?.wards.find((w: any) => formatLocation(w.ward) === wardName);
    setSelectedWardData(newWard || null);
  };

  const handlePhotoSelect = useCallback(async (file: File) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) { setPhotoError('Only JPEG, PNG or WebP images are accepted.'); return; }
    if (file.size > 5 * 1024 * 1024) { setPhotoError('Image must be 5 MB or smaller.'); return; }
    setPhotoError('');
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload/agent-photo', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setFormData(prev => ({ ...prev, photoUrl: data.url }));
    } catch (err: any) {
      setPhotoError(err.message);
      setPhotoPreview('');
      setFormData(prev => ({ ...prev, photoUrl: '' }));
    } finally {
      setPhotoUploading(false);
    }
  }, []);

  const onPhotoDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handlePhotoSelect(file);
  }, [handlePhotoSelect]);

  const handleVerifyNIN = async () => {
    if (!formData.nin || formData.nin.length !== 11) { setErrorMsg('Please enter a valid 11-digit NIN'); return; }
    setValidatingNIN(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/validate/nin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nin: formData.nin }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || result.error || 'Verification failed');
      if (result.success && result.data) {
        setNinVerified(true);
        const d = result.data;
        const updates: any = {};
        if (!formData.firstName && d.firstName) updates.firstName = d.firstName;
        if (!formData.lastName && d.lastName) updates.lastName = d.lastName;
        if (!formData.middleName && d.middleName) updates.middleName = d.middleName;
        if (!formData.dateOfBirth && d.dateOfBirth) updates.dateOfBirth = new Date(d.dateOfBirth).toISOString().split('T')[0];
        if (d.gender) updates.gender = d.gender;
        setFormData(prev => ({ ...prev, ...updates }));
        alert(`NIN Verified: ${d.firstName} ${d.lastName}`);
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'NIN Validation Failed');
    } finally {
      setValidatingNIN(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    if (!formData.password || formData.password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      setSaving(false);
      return;
    }
    if (formData.nin && /\D/.test(formData.nin)) {
      setErrorMsg('NIN must be numeric digits only.');
      setSaving(false);
      return;
    }
    if (formData.bvn && !/^\d{11}$/.test(formData.bvn)) {
      setErrorMsg('BVN must be exactly 11 digits.');
      setSaving(false);
      return;
    }

    try {
      const blobParts: string[] = [];
      if (formData.enrollmentCode?.trim()) blobParts.push(`Enrollment Code: ${formData.enrollmentCode.trim()}`);
      if (formData.cluster?.trim()) blobParts.push(`Cluster: ${formData.cluster.trim()}`);
      if (formData.jobHistory?.trim()) blobParts.push(`Job History:\n${formData.jobHistory.trim()}`);
      if (formData.motivation?.trim()) blobParts.push(`Cover Note:\n${formData.motivation.trim()}`);

      const payload: any = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        agentType: formData.agentType,
        status: formData.status,
      };

      if (formData.middleName?.trim()) payload.middleName = formData.middleName.trim();
      if (formData.nin?.trim()) payload.nin = formData.nin.trim();
      if (formData.bvn?.trim()) payload.bvn = formData.bvn.trim();
      if (formData.gender) payload.gender = formData.gender;
      if (formData.maritalStatus) payload.maritalStatus = formData.maritalStatus;
      if (formData.dateOfBirth) payload.dateOfBirth = formData.dateOfBirth;
      if (formData.whatsAppNumber?.trim()) payload.whatsAppNumber = formData.whatsAppNumber.trim();
      if (formData.alternativePhone?.trim()) payload.alternativePhone = formData.alternativePhone.trim();
      if (blobParts.length > 0) payload.address = blobParts.join('\n\n');
      else if (formData.address?.trim()) payload.address = formData.address.trim();
      if (formData.education?.trim()) payload.employmentStatus = formData.education.trim();
      if (formData.courseOfStudy?.trim()) payload.employmentType = formData.courseOfStudy.trim();
      if (formData.bankName?.trim()) payload.bankName = formData.bankName.trim();
      if (formData.accountNumber?.trim()) payload.accountNumber = formData.accountNumber.trim();
      if (formData.accountName?.trim()) payload.accountName = formData.accountName.trim();
      if (formData.photoUrl?.trim()) payload.photoUrl = formData.photoUrl.trim();
      if (formData.state) payload.state = formData.state;
      if (formData.lga) payload.localGovernment = formData.lga;
      if (formData.ward?.trim()) payload.ward = formData.ward.trim();
      if (formData.pollingUnit?.trim()) payload.pollingUnit = formData.pollingUnit.trim();
      if (formData.city?.trim()) payload.city = formData.city.trim();
      if (formData.assignedState) payload.assignedState = formData.assignedState;
      if (formData.assignedLGA?.trim()) payload.assignedLGA = formData.assignedLGA.trim();

      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create agent');
      }

      router.push('/agents');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create agent. Please check the form and try again.');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/agents">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Agents
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Register New Agent</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-8">
          {errorMsg && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-md text-sm border border-red-200 dark:border-red-500/30">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Column 1: Personal & Identity */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Identity &amp; Personal Info</CardTitle>
                  <CardDescription>Core biographical data and credentials.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Profile Photo</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      className="sr-only"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(f); }}
                    />
                    {photoPreview ? (
                      <div className="flex items-center gap-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photoPreview} alt="Profile preview"
                          className="h-20 w-20 rounded-md object-cover border border-gray-200 dark:border-gray-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          {photoUploading ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                              <span className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                              Uploading…
                            </div>
                          ) : formData.photoUrl ? (
                            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 font-medium">
                              <CheckCircleIcon className="h-5 w-5" />
                              Photo ready
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                              <XCircleIcon className="h-5 w-5" />
                              {photoError || 'Upload failed'}
                            </div>
                          )}
                          <Button type="button" variant="ghost" size="sm"
                            className="mt-1 h-7 text-xs text-gray-500 dark:text-gray-400"
                            onClick={() => {
                              setPhotoPreview('');
                              setPhotoError('');
                              setFormData(prev => ({ ...prev, photoUrl: '' }));
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                          >Remove &amp; replace</Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        role="button" tabIndex={0}
                        onClick={() => fileInputRef.current?.click()}
                        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={onPhotoDrop}
                        className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed py-6 cursor-pointer transition-colors ${
                          isDragging
                            ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-700/40'
                        }`}
                      >
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Drop photo or <span className="text-indigo-600 dark:text-indigo-400 underline">click to browse</span>
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">JPEG, PNG, WebP · max 5 MB</span>
                      </div>
                    )}
                    {photoError && !photoPreview && (
                      <p className="text-xs text-red-600 dark:text-red-400">{photoError}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name <span className="text-red-500">*</span></Label>
                      <Input required value={formData.firstName} onChange={(e) => handleChange('firstName', e.target.value)} placeholder="John" />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name <span className="text-red-500">*</span></Label>
                      <Input required value={formData.lastName} onChange={(e) => handleChange('lastName', e.target.value)} placeholder="Doe" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Middle Name</Label>
                    <Input value={formData.middleName} onChange={(e) => handleChange('middleName', e.target.value)} placeholder="Optional" />
                  </div>

                  <div className="space-y-2">
                    <Label>Email Address <span className="text-red-500">*</span></Label>
                    <Input required type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="agent@example.com" />
                  </div>

                  <div className="space-y-2">
                    <Label>Password <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Input
                        required
                        type={showPassword ? 'text' : 'password'}
                        minLength={6}
                        value={formData.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        placeholder="Min 6 characters"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Phone <span className="text-red-500">*</span></Label>
                    <Input required value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="+234..." />
                  </div>

                  <div className="space-y-2">
                    <Label>WhatsApp Number</Label>
                    <Input value={formData.whatsAppNumber} onChange={(e) => handleChange('whatsAppNumber', e.target.value)} placeholder="+234..." />
                  </div>

                  <div className="space-y-2">
                    <Label>Alternative Phone</Label>
                    <Input value={formData.alternativePhone} onChange={(e) => handleChange('alternativePhone', e.target.value)} placeholder="+234..." />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select value={formData.gender} onValueChange={(val) => handleChange('gender', val)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Marital Status</Label>
                      <Select value={formData.maritalStatus} onValueChange={(val) => handleChange('maritalStatus', val)}>
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
                    <Input type="date" value={formData.dateOfBirth} onChange={(e) => handleChange('dateOfBirth', e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Residential Address</Label>
                    <Textarea value={formData.address} onChange={(e) => handleChange('address', e.target.value)} rows={3} placeholder="Full residential address" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Column 2: Compliance & Financial */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Compliance &amp; Financials</CardTitle>
                  <CardDescription>Banking and identification.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Agent Type</Label>
                    <Select value={formData.agentType} onValueChange={(val) => handleChange('agentType', val)}>
                      <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="enrollment">Enrollment Agent</SelectItem>
                        <SelectItem value="household">Household Enrollment Agent</SelectItem>
                        <SelectItem value="correction">Correction Agent</SelectItem>
                        <SelectItem value="survey">Survey Agent</SelectItem>
                        <SelectItem value="agribusiness">Agri-Business Agent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Initial Status</Label>
                    <Select value={formData.status} onValueChange={(val) => handleChange('status', val)}>
                      <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Applied">Applied</SelectItem>
                        <SelectItem value="CallForInterview">Call For Interview</SelectItem>
                        <SelectItem value="Accepted">Accepted</SelectItem>
                        <SelectItem value="Enrolled">Enrolled (Active)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>NIN</Label>
                    <div className="flex gap-2">
                      <Input
                        minLength={11}
                        maxLength={11}
                        value={formData.nin}
                        onChange={(e) => handleChange('nin', e.target.value)}
                        className={ninVerified ? 'border-green-500' : ''}
                        placeholder="11-digit NIN"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleVerifyNIN}
                        disabled={validatingNIN || !formData.nin || formData.nin.length !== 11}
                      >
                        {validatingNIN ? 'Verifying...' : 'Verify'}
                      </Button>
                    </div>
                    {ninVerified && <p className="text-xs text-green-600">✓ Validated against national database</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>BVN</Label>
                    <Input minLength={11} maxLength={11} value={formData.bvn} onChange={(e) => handleChange('bvn', e.target.value)} placeholder="11-digit BVN" />
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium mb-3 text-gray-900 dark:text-gray-100">Bank Account Details</h4>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Bank Name</Label>
                        <Input value={formData.bankName} onChange={(e) => handleChange('bankName', e.target.value)} placeholder="e.g. GTBank" />
                      </div>
                      <div className="space-y-2">
                        <Label>Account Number</Label>
                        <Input value={formData.accountNumber} onChange={(e) => handleChange('accountNumber', e.target.value)} maxLength={10} placeholder="10-digit account number" />
                      </div>
                      <div className="space-y-2">
                        <Label>Account Name</Label>
                        <Input value={formData.accountName} onChange={(e) => handleChange('accountName', e.target.value)} placeholder="Account holder name" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Education &amp; Background</CardTitle>
                  <CardDescription>Academic background, work history and application details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Education Level</Label>
                      <Select value={formData.education} onValueChange={(val) => handleChange('education', val)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FSLC">FSLC</SelectItem>
                          <SelectItem value="SSCE/WAEC">SSCE / WAEC</SelectItem>
                          <SelectItem value="OND">OND</SelectItem>
                          <SelectItem value="HND">HND</SelectItem>
                          <SelectItem value="BSc/BA">BSc / BA</SelectItem>
                          <SelectItem value="MSc/MA">MSc / MA</SelectItem>
                          <SelectItem value="PhD">PhD</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Course of Study</Label>
                      <Input value={formData.courseOfStudy} onChange={(e) => handleChange('courseOfStudy', e.target.value)} placeholder="e.g. Agriculture" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Enrollment Code</Label>
                      <Input
                        value={formData.enrollmentCode}
                        onChange={(e) => handleChange('enrollmentCode', e.target.value.toUpperCase())}
                        placeholder="e.g. CCSA-001"
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cluster</Label>
                      <Input value={formData.cluster} onChange={(e) => handleChange('cluster', e.target.value)} placeholder="e.g. Kano North" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Work / Job History</Label>
                    <Textarea
                      rows={4}
                      value={formData.jobHistory}
                      onChange={(e) => handleChange('jobHistory', e.target.value)}
                      placeholder="List previous work experience"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Motivation / Cover Note</Label>
                    <Textarea
                      rows={3}
                      value={formData.motivation}
                      onChange={(e) => handleChange('motivation', e.target.value)}
                      placeholder="Why do you want to be a field agent?"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Column 3: Location & Assignment */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Location &amp; Assignment</CardTitle>
                  <CardDescription>Geographic deployment.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-700/40 p-3 rounded-md space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Residential Location</h4>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Select onValueChange={handleStateChange} value={formData.state}>
                        <SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger>
                        <SelectContent>
                          {states.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>LGA</Label>
                      <Select disabled={!formData.state} onValueChange={handleLgaChange} value={formData.lga}>
                        <SelectTrigger><SelectValue placeholder="Select LGA" /></SelectTrigger>
                        <SelectContent>
                          {selectedStateData?.lgas.map((l: any) => {
                            const name = formatLocation(l.lga);
                            return <SelectItem key={name} value={name}>{name}</SelectItem>;
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
                            const name = formatLocation(w.ward);
                            return <SelectItem key={name} value={name}>{name}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Polling Unit</Label>
                      <Select disabled={!formData.ward} onValueChange={(val) => handleChange('pollingUnit', val)} value={formData.pollingUnit}>
                        <SelectTrigger><SelectValue placeholder="Select Polling Unit" /></SelectTrigger>
                        <SelectContent>
                          {Array.from(new Set(selectedWardData?.polling_units?.map((pu: string) => formatLocation(pu)) || [])).map((name: any, idx: number) => (
                            <SelectItem key={`${name}-${idx}`} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>City / Town</Label>
                      <Input value={formData.city} onChange={(e) => handleChange('city', e.target.value)} placeholder="e.g. Kano" />
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md space-y-3 border border-blue-100 dark:border-blue-500/30">
                    <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300">Operational Assignment</h4>
                    <div className="space-y-2">
                      <Label>Assigned State</Label>
                      <Select onValueChange={(val) => handleChange('assignedState', val)} value={formData.assignedState}>
                        <SelectTrigger><SelectValue placeholder="Select Assignment State" /></SelectTrigger>
                        <SelectContent>
                          {states.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Assigned LGA</Label>
                      <Input placeholder="Enter assigned LGA" value={formData.assignedLGA} onChange={(e) => handleChange('assignedLGA', e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-end gap-4 bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm sticky bottom-4 z-10">
            <Button variant="outline" type="button" onClick={() => router.push('/agents')}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 min-w-36" disabled={saving}>
              {saving ? 'Creating...' : 'Create Agent'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { AlertCircleIcon, CheckCircle2Icon, Loader2Icon, UploadCloudIcon, ImageIcon, XCircleIcon } from 'lucide-react';
import { SectionLoader } from '@/components/ui/loading-spinner';
import { hierarchicalData } from '@/lib/data/hierarchical-data';
import nigerianBanks from '@/data/nigerianBanks';

const formatLocation = (name: string) => {
  if (!name) return '';
  return name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const states = hierarchicalData.map((d: any) => formatLocation(d.state));

function parseAddressBlob(raw?: string | null): { plain: string; parts: Record<string, string> } {
  if (!raw) return { plain: '', parts: {} };
  const labels = ['Enrollment Code', 'Cluster', 'Course of Study', 'Job History', 'Cover Note', 'Residential Address'];
  const parts: Record<string, string> = {};
  let plain = raw;
  for (const label of labels) {
    const regex = new RegExp(`${label}:\n?([\\s\\S]*?)(?=\n\n(?:${labels.join('|')}):|$)`, 'i');
    const m = raw.match(regex);
    if (m) {
      parts[label] = m[1].trim();
      plain = plain.replace(m[0], '').trim();
    } else {
      const r2 = new RegExp(`${label}:[ \t]*([^\n]*)`, 'i');
      const m2 = raw.match(r2);
      if (m2) {
        parts[label] = m2[1].trim();
        plain = plain.replace(m2[0], '').trim();
      }
    }
  }
  return { plain: parts['Residential Address'] || plain.replace(/\n{3,}/g, '\n\n').trim(), parts };
}

export default function UpdateAgentClient({ id }: { id: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [agent, setAgent] = useState<any>(null);
  const [clusters, setClusters] = useState<{ id: string; title: string }[]>([]);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    whatsAppNumber: '',
    alternativePhone: '',
    nin: '',
    bvn: '',
    gender: '',
    maritalStatus: '',
    dateOfBirth: '',
    education: '',
    courseOfStudy: '',
    cluster: '',
    enrollmentCode: '',
    jobHistory: '',
    motivation: '',
    address: '',
    city: '',
    localGovernment: '',
    state: '',
    ward: '',
    pollingUnit: '',
    bankName: '',
    accountName: '',
    accountNumber: '',
    photoUrl: '',
  });

  const [selectedStateData, setSelectedStateData] = useState<any>(null);
  const [selectedLgaData, setSelectedLgaData] = useState<any>(null);
  const [selectedWardData, setSelectedWardData] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetchAgentAndClusters();
  }, [id]);

  const fetchAgentAndClusters = async () => {
    try {
      setLoading(true);
      const [agentRes, clusterRes] = await Promise.all([
        fetch(`/api/public/agents/${id}`),
        fetch('/api/public/clusters').catch(() => null)
      ]);

      if (!agentRes.ok) throw new Error('Agent not found or invalid URL');
      const data = await agentRes.json();
      setAgent(data);

      if (clusterRes && clusterRes.ok) {
        const cData = await clusterRes.json();
        if (Array.isArray(cData.clusters)) {
          setClusters(cData.clusters);
        }
      }

      const { plain: residentialAddress, parts } = parseAddressBlob(data.address);
      const st = formatLocation(data.state || '');
      const lg = formatLocation(data.localGovernment || '');
      const wd = formatLocation(data.ward || '');

      setFormData({
        firstName: data.firstName || data.user?.firstName || '',
        lastName: data.lastName || data.user?.lastName || '',
        email: data.email || data.user?.email || '',
        phone: data.phone || data.user?.phoneNumber || '',
        whatsAppNumber: data.whatsAppNumber || '',
        alternativePhone: data.alternativePhone || '',
        nin: data.nin || '',
        bvn: data.bvn || '',
        gender: data.gender || '',
        maritalStatus: data.maritalStatus || '',
        dateOfBirth: data.dateOfBirth ? data.dateOfBirth.substring(0, 10) : '',
        education: data.employmentStatus || '',
        courseOfStudy: data.employmentType || parts['Course of Study'] || '',
        cluster: parts['Cluster'] || '',
        enrollmentCode: parts['Enrollment Code'] || '',
        jobHistory: parts['Job History'] || '',
        motivation: parts['Cover Note'] || '',
        address: residentialAddress || '',
        city: data.city || '',
        localGovernment: data.localGovernment || '',
        state: data.state || '',
        ward: data.ward || '',
        pollingUnit: data.pollingUnit || '',
        bankName: data.bankName || '',
        accountName: data.accountName || '',
        accountNumber: data.accountNumber || '',
        photoUrl: data.photoUrl || '',
      });

      if (data.photoUrl) {
        setPhotoPreview(data.photoUrl);
      }

      if (st) {
        const stateNode = hierarchicalData.find((s: any) => formatLocation(s.state) === st);
        setSelectedStateData(stateNode || null);
        if (stateNode && lg) {
          const lgaNode = stateNode.lgas.find((l: any) => formatLocation(l.lga) === lg);
          setSelectedLgaData(lgaNode || null);
          if (lgaNode && wd) {
            const wardNode = lgaNode.wards.find((w: any) => formatLocation(w.ward) === wd);
            setSelectedWardData(wardNode || null);
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStateChange = (name: string) => {
    setFormData(prev => ({ ...prev, state: name, localGovernment: '', ward: '', pollingUnit: '' }));
    const node = hierarchicalData.find((s: any) => formatLocation(s.state) === name);
    setSelectedStateData(node || null);
    setSelectedLgaData(null);
    setSelectedWardData(null);
  };

  const handleLgaChange = (name: string) => {
    setFormData(prev => ({ ...prev, localGovernment: name, ward: '', pollingUnit: '' }));
    const node = selectedStateData?.lgas.find((l: any) => formatLocation(l.lga) === name);
    setSelectedLgaData(node || null);
    setSelectedWardData(null);
  };

  const handleWardChange = (name: string) => {
    setFormData(prev => ({ ...prev, ward: name, pollingUnit: '' }));
    const node = selectedLgaData?.wards.find((w: any) => formatLocation(w.ward) === name);
    setSelectedWardData(node || null);
  };

  const handlePhotoSelect = useCallback(async (file: File) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setPhotoError('Only JPEG, PNG or WebP images are accepted.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Image must be 5 MB or smaller.');
      return;
    }
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

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handlePhotoSelect(file);
    },
    [handlePhotoSelect]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    // Reconstruct the structured address blob
    const blobParts: string[] = [];
    if (formData.enrollmentCode?.trim()) blobParts.push(`Enrollment Code: ${formData.enrollmentCode.trim()}`);
    if (formData.cluster?.trim()) blobParts.push(`Cluster: ${formData.cluster.trim()}`);
    if (formData.courseOfStudy?.trim()) blobParts.push(`Course of Study: ${formData.courseOfStudy.trim()}`);
    if (formData.jobHistory?.trim()) blobParts.push(`Job History:\n${formData.jobHistory.trim()}`);
    if (formData.motivation?.trim()) blobParts.push(`Cover Note:\n${formData.motivation.trim()}`);
    if (formData.address?.trim()) blobParts.push(`Residential Address:\n${formData.address.trim()}`);

    const payload = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      phone: formData.phone.trim(),
      whatsAppNumber: formData.whatsAppNumber.trim() || null,
      alternativePhone: formData.alternativePhone.trim() || null,
      nin: formData.nin.trim(),
      bvn: formData.bvn.trim(),
      gender: formData.gender,
      maritalStatus: formData.maritalStatus,
      dateOfBirth: formData.dateOfBirth || null,
      employmentStatus: formData.education.trim() || null,
      employmentType: formData.courseOfStudy.trim() || null,
      address: blobParts.length > 0 ? blobParts.join('\n\n') : formData.address.trim() || null,
      city: formData.city.trim() || null,
      state: formData.state,
      localGovernment: formData.localGovernment,
      ward: formData.ward,
      pollingUnit: formData.pollingUnit,
      bankName: formData.bankName.trim(),
      accountName: formData.accountName.trim(),
      accountNumber: formData.accountNumber.trim(),
      photoUrl: formData.photoUrl.trim() || null,
    };

    try {
      const res = await fetch(`/api/public/agents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to update profile');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <SectionLoader />;
  if (error && !agent) return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-gray-800 rounded-xl shadow">
      <AlertCircleIcon className="h-12 w-12 text-red-500 mb-4" />
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Link Expired or Invalid</h2>
      <p className="mt-2 text-gray-500 dark:text-gray-400">We could not find a record matching this secure link.</p>
    </div>
  );
  if (success) return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-gray-800 rounded-xl shadow">
      <div className="rounded-full bg-green-100 p-3 mb-4">
        <CheckCircle2Icon className="h-10 w-10 text-green-600" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Profile Updated Successfully</h2>
      <p className="mt-2 text-gray-500 dark:text-gray-400">
        Thank you, {formData.firstName || agent.firstName}! Your agent records have been saved securely.
      </p>
    </div>
  );

  return (
    <Card className="shadow-lg max-w-4xl mx-auto">
      <CardHeader className="bg-[#013358] text-white rounded-t-lg">
        <CardTitle className="text-2xl">Update Agent Profile</CardTitle>
        <CardDescription className="text-blue-100 mt-1">
          Hello {formData.firstName || agent.firstName}, please review and complete your official CCSA Agent records.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-8 pt-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 flex items-center gap-2">
              <AlertCircleIcon className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Section: Personal Identity */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 border-b pb-2 mb-4">
              1. Personal Identity
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" name="email" value={formData.email} disabled className="bg-muted/50 cursor-not-allowed" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsAppNumber">WhatsApp Number (Optional)</Label>
                <Input id="whatsAppNumber" name="whatsAppNumber" value={formData.whatsAppNumber} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alternativePhone">Alternative Phone (Optional)</Label>
                <Input id="alternativePhone" name="alternativePhone" value={formData.alternativePhone} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nin">National Identification Number (NIN) *</Label>
                <Input id="nin" name="nin" value={formData.nin} onChange={handleChange} maxLength={11} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bvn">Bank Verification Number (BVN) *</Label>
                <Input id="bvn" name="bvn" value={formData.bvn} onChange={handleChange} maxLength={11} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input id="dateOfBirth" name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label>Gender *</Label>
                <Select value={formData.gender} onValueChange={(val) => handleSelectChange('gender', val)} required>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Marital Status *</Label>
                <Select value={formData.maritalStatus} onValueChange={(val) => handleSelectChange('maritalStatus', val)} required>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single">Single</SelectItem>
                    <SelectItem value="Married">Married</SelectItem>
                    <SelectItem value="Divorced">Divorced</SelectItem>
                    <SelectItem value="Widowed">Widowed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section: Education, Cluster & Experience */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 border-b pb-2 mb-4">
              2. Education &amp; Cluster Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Education Level *</Label>
                <Select value={formData.education} onValueChange={(val) => handleSelectChange('education', val)} required>
                  <SelectTrigger><SelectValue placeholder="Select Education Level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BSc">B.Sc / Bachelor&apos;s Degree</SelectItem>
                    <SelectItem value="HND">Higher National Diploma (HND)</SelectItem>
                    <SelectItem value="OND">Ordinary National Diploma (OND)</SelectItem>
                    <SelectItem value="NCE">Nigeria Certificate in Education (NCE)</SelectItem>
                    <SelectItem value="SSCE">SSCE / WASSCE / NECO</SelectItem>
                    <SelectItem value="MSc">Master&apos;s Degree (M.Sc)</SelectItem>
                    <SelectItem value="PhD">Doctorate (Ph.D)</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="courseOfStudy">Course of Study</Label>
                <Input id="courseOfStudy" name="courseOfStudy" value={formData.courseOfStudy} onChange={handleChange} placeholder="e.g. Agricultural Science, Computer Science" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Assigned Cluster / Institution</Label>
                <Select value={formData.cluster} onValueChange={(val) => handleSelectChange('cluster', val)}>
                  <SelectTrigger><SelectValue placeholder="Select Cluster" /></SelectTrigger>
                  <SelectContent>
                    {clusters.map((c) => (
                      <SelectItem key={c.id} value={c.title}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="jobHistory">Work Experience</Label>
                <Textarea
                  id="jobHistory"
                  name="jobHistory"
                  rows={3}
                  value={formData.jobHistory}
                  onChange={handleChange}
                  placeholder="e.g. Field Officer, NGO (2021-2023)"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="motivation">Motivation / Cover Note</Label>
                <Textarea
                  id="motivation"
                  name="motivation"
                  rows={2}
                  value={formData.motivation}
                  onChange={handleChange}
                  placeholder="Brief note on your background and interest"
                />
              </div>
            </div>
          </div>

          {/* Section: Residential Location */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 border-b pb-2 mb-4">
              3. Residential Location
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Residential Address *</Label>
                <Textarea
                  id="address"
                  name="address"
                  rows={2}
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Street number, street name, landmarks"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Select required onValueChange={handleStateChange} value={formData.state}>
                  <SelectTrigger id="state"><SelectValue placeholder="Select State" /></SelectTrigger>
                  <SelectContent>
                    {states.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="localGovernment">Local Government Area (LGA) *</Label>
                <Select required disabled={!formData.state} onValueChange={handleLgaChange} value={formData.localGovernment}>
                  <SelectTrigger id="localGovernment"><SelectValue placeholder="Select LGA" /></SelectTrigger>
                  <SelectContent>
                    {selectedStateData?.lgas.map((l: any) => {
                      const n = formatLocation(l.lga);
                      return <SelectItem key={n} value={n}>{n}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ward">Ward *</Label>
                <Select required disabled={!formData.localGovernment} onValueChange={handleWardChange} value={formData.ward}>
                  <SelectTrigger id="ward"><SelectValue placeholder="Select Ward" /></SelectTrigger>
                  <SelectContent>
                    {selectedLgaData?.wards.map((w: any) => {
                      const n = formatLocation(w.ward);
                      return <SelectItem key={n} value={n}>{n}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pollingUnit">Polling Unit *</Label>
                <Select required disabled={!formData.ward} onValueChange={(v) => handleSelectChange('pollingUnit', v)} value={formData.pollingUnit}>
                  <SelectTrigger id="pollingUnit"><SelectValue placeholder="Select Polling Unit" /></SelectTrigger>
                  <SelectContent>
                    {selectedWardData?.polling_units.map((pu: string) => {
                      const n = formatLocation(pu);
                      return <SelectItem key={n} value={n}>{n}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section: Banking Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 border-b pb-2 mb-4">
              4. Bank Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name *</Label>
                <Select
                  value={formData.bankName}
                  onValueChange={(val) => handleSelectChange('bankName', val)}
                >
                  <SelectTrigger><SelectValue placeholder="Select Bank" /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Commercial &amp; Digital Banks</SelectLabel>
                      {nigerianBanks.map((b: any) => (
                        <SelectItem key={b.code} value={b.name}>{b.name}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number *</Label>
                <Input id="accountNumber" name="accountNumber" value={formData.accountNumber} onChange={handleChange} maxLength={10} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="accountName">Account Name *</Label>
                <Input id="accountName" name="accountName" value={formData.accountName} onChange={handleChange} required />
              </div>
            </div>
          </div>

          {/* Section: Passport Photograph */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 border-b pb-2 mb-4">
              5. Passport Photograph
            </h3>
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(f); }}
              />

              {photoPreview ? (
                <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreview} alt="Passport preview" className="h-24 w-24 rounded-md object-cover border" />
                  <div className="flex-1">
                    {photoUploading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                        Uploading…
                      </div>
                    ) : formData.photoUrl ? (
                      <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 font-medium">
                        <CheckCircle2Icon className="h-5 w-5" />
                        Photo uploaded successfully
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-red-600">
                        <XCircleIcon className="h-5 w-5" />
                        {photoError || 'Upload failed'}
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 text-xs text-muted-foreground"
                      onClick={() => {
                        setPhotoPreview('');
                        setPhotoError('');
                        setFormData(prev => ({ ...prev, photoUrl: '' }));
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      Remove &amp; replace
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                  className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 cursor-pointer transition-colors
                    ${isDragging
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                      : 'border-border hover:border-muted-foreground/50 hover:bg-muted/30'}`}
                  aria-label="Upload passport photograph"
                >
                  {isDragging
                    ? <UploadCloudIcon className="h-12 w-12 text-green-500" />
                    : <ImageIcon className="h-12 w-12 text-muted-foreground" />}
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {isDragging ? 'Drop your photo here' : 'Drag & drop or click to upload'}
                  </p>
                  <p className="text-xs text-muted-foreground">JPG, PNG or WebP · Max 5 MB</p>
                </div>
              )}

              {photoError && !photoPreview && (
                <p className="mt-2 text-sm text-red-500">{photoError}</p>
              )}
            </div>
          </div>
        </CardContent>

        <CardFooter className="bg-gray-50 dark:bg-gray-800/50 rounded-b-lg border-t px-6 py-4">
          <Button
            type="submit"
            disabled={saving || photoUploading}
            className="w-full sm:w-auto ml-auto bg-[#013358] hover:bg-blue-800"
          >
            {saving && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
            {saving ? 'Saving Records...' : 'Save & Submit Profile'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

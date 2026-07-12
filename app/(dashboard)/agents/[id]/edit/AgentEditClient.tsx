'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hierarchicalData } from '@/lib/data/hierarchical-data';
import { Textarea } from "@/components/ui/textarea";

interface AgentEditClientProps {
    id: string;
}

export default function AgentEditClient({ id }: AgentEditClientProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Helper to format location names (remove hyphens, capitalize)
    const formatLocation = (name: string) => {
        if (!name) return '';
        return name
            .replace(/-/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
    };

    // Location Data
    const states = hierarchicalData.map(d => formatLocation(d.state));
    const [selectedStateData, setSelectedStateData] = useState<any>(null);
    const [selectedLgaData, setSelectedLgaData] = useState<any>(null);
    const [selectedWardData, setSelectedWardData] = useState<any>(null);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        middleName: '',
        email: '',
        phone: '',
        whatsAppNumber: '',
        alternativePhone: '',
        nin: '',
        bvn: '',
        gender: '',
        maritalStatus: '',
        dateOfBirth: '',
        address: '',
        education: '',
        courseOfStudy: '',
        enrollmentCode: '',
        cluster: '',
        jobHistory: '',
        motivation: '',
        bankName: '',
        accountNumber: '',
        accountName: '',
        state: '',
        lga: '',
        ward: '',
        pollingUnit: '',
        assignedState: '',
        assignedLGA: '',
        agentType: 'enrollment' as 'enrollment' | 'correction' | 'survey' | 'agribusiness',
        status: 'active',
        isActive: true,
        photoUrl: ''
    });

    const [photoUploading, setPhotoUploading] = useState(false);
    const [photoPreview, setPhotoPreview] = useState('');
    const [photoError, setPhotoError] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const ROLE_TO_AGENT_TYPE: Record<string, 'enrollment' | 'correction' | 'survey' | 'agribusiness'> = {
        agent: 'enrollment',
        data_correction_agent: 'correction',
        survey_agent: 'survey',
        agri_business_agent: 'agribusiness',
    };

    const AGENT_TYPE_TO_ROLE: Record<string, string> = {
        enrollment: 'agent',
        correction: 'data_correction_agent',
        survey: 'survey_agent',
        agribusiness: 'agri_business_agent',
    };

    useEffect(() => {
        const fetchAgent = async () => {
            try {
                const res = await fetch(`/api/agents/${id}`);
                if (!res.ok) throw new Error('Failed to fetch agent details');
                const data = await res.json();

                // Populate form
                const agentProfile = data.agent || {};
                const initialState = agentProfile.state || '';
                const initialLga = agentProfile.localGovernment || '';
                const initialWard = agentProfile.ward || '';

                setFormData({
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    middleName: agentProfile.middleName || '',
                    email: data.email || '',
                    phone: data.phoneNumber || '',
                    whatsAppNumber: agentProfile.whatsAppNumber || '',
                    alternativePhone: agentProfile.alternativePhone || '',
                    nin: agentProfile.nin || '',
                    bvn: agentProfile.bvn || '',
                    gender: agentProfile.gender || '',
                    maritalStatus: agentProfile.maritalStatus || '',
                    dateOfBirth: agentProfile.dateOfBirth ? new Date(agentProfile.dateOfBirth).toISOString().split('T')[0] : '',
                    address: agentProfile.address || '',
                    education: agentProfile.employmentStatus || '',
                    courseOfStudy: agentProfile.employmentType || '',
                    enrollmentCode: '',
                    cluster: '',
                    jobHistory: '',
                    motivation: '',
                    bankName: agentProfile.bankName || '',
                    accountNumber: agentProfile.accountNumber || '',
                    accountName: agentProfile.accountName || '',
                    state: initialState,
                    lga: initialLga,
                    ward: initialWard,
                    pollingUnit: agentProfile.pollingUnit || '',
                    assignedState: agentProfile.assignedState || '',
                    assignedLGA: agentProfile.assignedLGA || '',
                    agentType: (ROLE_TO_AGENT_TYPE[data.role] || 'enrollment') as 'enrollment' | 'correction' | 'survey' | 'agribusiness',
                    status: agentProfile.status || (data.isActive ? 'active' : 'inactive'),
                    isActive: data.isActive,
                    photoUrl: agentProfile.photoUrl || ''
                });

                // Parse address blob back into individual fields
                const rawAddress: string = agentProfile.address || '';
                if (rawAddress) {
                    const extractLine = (label: string) => {
                        const m = rawAddress.match(new RegExp(`${label}:\\s*([^\\n]+)`, 'i'));
                        return m ? m[1].trim() : '';
                    };
                    const extractMulti = (label: string) => {
                        const sentinel = ['Enrollment Code', 'Cluster', 'Course of Study', 'Job History', 'Cover Note'].join('|');
                        const m = rawAddress.match(new RegExp(`${label}:\\n?([\\s\\S]*?)(?=\\n\\n(?:${sentinel}):)`, 'i'));
                        if (m) return m[1].trim();
                        const m2 = rawAddress.match(new RegExp(`${label}:\\n?([\\s\\S]*)$`, 'i'));
                        return m2 ? m2[1].trim() : '';
                    };
                    setFormData(prev => ({
                        ...prev,
                        enrollmentCode: extractLine('Enrollment Code'),
                        cluster: extractLine('Cluster'),
                        jobHistory: extractMulti('Job History'),
                        motivation: extractMulti('Cover Note'),
                    }));
                }

                if (agentProfile.photoUrl) {
                    setPhotoPreview(agentProfile.photoUrl);
                }

                // Set initial location data selection
                if (initialState) {
                    const sData = hierarchicalData.find(s => formatLocation(s.state) === initialState);
                    setSelectedStateData(sData || null);

                    if (sData && initialLga) {
                        const lData = sData.lgas.find((l: any) => formatLocation(l.lga) === initialLga);
                        setSelectedLgaData(lData || null);

                        if (lData && initialWard) {
                            const wData = lData.wards.find((w: any) => formatLocation(w.ward) === initialWard);
                            setSelectedWardData(wData || null);
                        }
                    }
                }

            } catch (err) {
                console.error(err);
                setErrorMsg('Failed to load agent details');
            } finally {
                setLoading(false);
            }
        };

        fetchAgent();
    }, [id]);

    const handleStateChange = (formattedStateName: string) => {
        setFormData(prev => ({ ...prev, state: formattedStateName, lga: '', ward: '', pollingUnit: '' }));
        const newState = hierarchicalData.find(s => formatLocation(s.state) === formattedStateName);
        setSelectedStateData(newState || null);
        setSelectedLgaData(null);
        setSelectedWardData(null);
    };

    const handleLgaChange = (formattedLgaName: string) => {
        setFormData(prev => ({ ...prev, lga: formattedLgaName, ward: '', pollingUnit: '' }));
        const newLga = selectedStateData?.lgas.find((l: any) => formatLocation(l.lga) === formattedLgaName);
        setSelectedLgaData(newLga || null);
        setSelectedWardData(null);
    };

    const handleWardChange = (formattedWardName: string) => {
        setFormData(prev => ({ ...prev, ward: formattedWardName, pollingUnit: '' }));
        const newWard = selectedLgaData?.wards.find((w: any) => formatLocation(w.ward) === formattedWardName);
        setSelectedWardData(newWard || null);
    };

    const handleAssignedStateChange = (stateName: string) => {
        setFormData(prev => ({ ...prev, assignedState: stateName }));
        // Could also cascade assigned LGA if needed, but keeping it simpler for assignment or manual
    };

    const [validatingNIN, setValidatingNIN] = useState(false);
    const [ninVerified, setNinVerified] = useState(false);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (field === 'nin') setNinVerified(false);
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

    const onPhotoDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handlePhotoSelect(file);
    }, [handlePhotoSelect]);

    const handleVerifyNIN = async () => {
        if (!formData.nin || formData.nin.length !== 11) {
            setErrorMsg('Please enter a valid 11-digit NIN');
            return;
        }
        setValidatingNIN(true);
        setErrorMsg('');

        try {
            const res = await fetch('/api/validate/nin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nin: formData.nin })
            });
            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.message || result.error || 'Verification failed');
            }

            if (result.success && result.data) {
                setNinVerified(true);
                // Auto-fill or confirmation
                const d = result.data;
                const updates: any = {};
                // Only overwrite empty fields or confirm matches
                // For now, let's aggressively fill 
                if (!formData.firstName && d.firstName) updates.firstName = d.firstName;
                if (!formData.lastName && d.lastName) updates.lastName = d.lastName;
                if (!formData.middleName && d.middleName) updates.middleName = d.middleName;
                if (!formData.dateOfBirth && d.dateOfBirth) updates.dateOfBirth = new Date(d.dateOfBirth).toISOString().split('T')[0];
                if (d.gender) updates.gender = d.gender;

                setFormData(prev => ({ ...prev, ...updates }));
                alert(`NIN Verified: ${d.firstName} ${d.lastName}`);
            }

        } catch (error: any) {
            console.error(error);
            setErrorMsg(error.message || 'NIN Validation Failed');
        } finally {
            setValidatingNIN(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setErrorMsg('');

        // Validate NIN only if provided
        if (formData.nin && formData.nin.trim() && !/^\d{10,11}$/.test(formData.nin)) {
            setErrorMsg('NIN must be 10-11 digits numeric.');
            setSaving(false);
            return;
        }

        // Validate BVN only if provided
        if (formData.bvn && formData.bvn.trim() && !/^\d{11}$/.test(formData.bvn)) {
            setErrorMsg('BVN must be exactly 11 digits numeric.');
            setSaving(false);
            return;
        }

        try {
            // Prepare update payload - only include non-empty fields
            const updatePayload: any = {};
            
            // Only include fields that have values
            if (formData.firstName?.trim()) updatePayload.firstName = formData.firstName.trim();
            if (formData.lastName?.trim()) updatePayload.lastName = formData.lastName.trim();
            if (formData.middleName?.trim()) updatePayload.middleName = formData.middleName.trim();
            if (formData.phone?.trim()) updatePayload.phone = formData.phone.trim();
            if (formData.nin?.trim()) updatePayload.nin = formData.nin.trim();
            if (formData.bvn?.trim()) updatePayload.bvn = formData.bvn.trim();
            if (formData.gender) updatePayload.gender = formData.gender;
            if (formData.maritalStatus) updatePayload.maritalStatus = formData.maritalStatus;
            if (formData.dateOfBirth) updatePayload.dateOfBirth = formData.dateOfBirth;
            if (formData.address?.trim()) updatePayload.address = formData.address.trim();
            if (formData.whatsAppNumber?.trim()) updatePayload.whatsAppNumber = formData.whatsAppNumber.trim();
            if (formData.alternativePhone?.trim()) updatePayload.alternativePhone = formData.alternativePhone.trim();
            if (formData.education?.trim()) updatePayload.employmentStatus = formData.education.trim();
            if (formData.courseOfStudy?.trim()) updatePayload.employmentType = formData.courseOfStudy.trim();
            // Rebuild address blob from structured fields
            const blobParts: string[] = [];
            if (formData.enrollmentCode?.trim()) blobParts.push(`Enrollment Code: ${formData.enrollmentCode.trim()}`);
            if (formData.cluster?.trim()) blobParts.push(`Cluster: ${formData.cluster.trim()}`);
            if (formData.jobHistory?.trim()) blobParts.push(`Job History:\n${formData.jobHistory.trim()}`);
            if (formData.motivation?.trim()) blobParts.push(`Cover Note:\n${formData.motivation.trim()}`);
            if (blobParts.length > 0) {
                updatePayload.address = blobParts.join('\n\n');
            } else if (formData.address?.trim()) {
                updatePayload.address = formData.address.trim();
            }
            if (formData.bankName?.trim()) updatePayload.bankName = formData.bankName.trim();
            if (formData.accountNumber?.trim()) updatePayload.accountNumber = formData.accountNumber.trim();
            if (formData.accountName?.trim()) updatePayload.accountName = formData.accountName.trim();
            if (formData.photoUrl?.trim()) updatePayload.photoUrl = formData.photoUrl.trim();
            if (formData.state) updatePayload.state = formData.state;
            if (formData.lga) updatePayload.localGovernment = formData.lga;
            if (formData.ward?.trim()) updatePayload.ward = formData.ward.trim();
            if (formData.pollingUnit?.trim()) updatePayload.pollingUnit = formData.pollingUnit.trim();
            if (formData.assignedState) updatePayload.assignedState = formData.assignedState;
            if (formData.assignedLGA?.trim()) updatePayload.assignedLGA = formData.assignedLGA.trim();
            if (formData.status) {
                updatePayload.status = formData.status;
                updatePayload.isActive = formData.status === 'Enrolled' || formData.status === 'active';
            }
            if (formData.agentType) {
                updatePayload.agentType = formData.agentType;
            }

            const res = await fetch(`/api/agents/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || data.message || 'Failed to update agent');
            }

            router.push(`/agents/${id}`);
            router.refresh();
        } catch (err: any) {
            console.error('Update error:', err);
            setErrorMsg(err.message || 'Failed to update agent. Please check the form and try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading agent data...</div>;

    return (
        <div className="w-full px-6 py-8"> {/* Full Width Layout */}
            <div className="mb-6 flex items-center gap-4">
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/agents/${id}`}>
                        <ArrowLeftIcon className="h-4 w-4 mr-2" />
                        Back to Details
                    </Link>
                </Button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Agent Compliance &amp; Profile</h1>
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
                                    <CardTitle>Identity & Personal Info</CardTitle>
                                    <CardDescription>Core biographical data.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Profile Photo */}
                                    <div className="space-y-2">
                                        <Label>Profile Photo</Label>
                                        <input ref={fileInputRef} type="file"
                                            accept="image/jpeg,image/jpg,image/png,image/webp"
                                            className="sr-only"
                                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(f); }} />
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
                                                <span className="text-sm text-gray-500 dark:text-gray-400">Drop photo or <span className="text-indigo-600 dark:text-indigo-400 underline">click to browse</span></span>
                                                <span className="text-xs text-gray-400 dark:text-gray-500">JPEG, PNG, WebP · max 5 MB</span>
                                            </div>
                                        )}
                                        {photoError && !photoPreview && (
                                            <p className="text-xs text-red-600 dark:text-red-400">{photoError}</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>First Name</Label>
                                            <Input required value={formData.firstName} onChange={(e) => handleChange('firstName', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Last Name</Label>
                                            <Input required value={formData.lastName} onChange={(e) => handleChange('lastName', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Middle Name</Label>
                                        <Input value={formData.middleName} onChange={(e) => handleChange('middleName', e.target.value)} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Email</Label>
                                        <Input disabled value={formData.email} className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Phone</Label>
                                        <Input required value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} />
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
                                        <Textarea value={formData.address} onChange={(e) => handleChange('address', e.target.value)} rows={3} />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Column 2: Compliance & Financial */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Compliance & Financials</CardTitle>
                                    <CardDescription>Banking and identification.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Agent Type</Label>
                                        <Select value={formData.agentType} onValueChange={(val) => handleChange('agentType', val)}>
                                            <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="enrollment">Enrollment Agent</SelectItem>
                                                <SelectItem value="correction">Correction Agent</SelectItem>
                                                <SelectItem value="survey">Survey Agent</SelectItem>
                                                <SelectItem value="agribusiness">Agri-Business Agent</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Status</Label>
                                        <Select value={formData.status} onValueChange={(val) => handleChange('status', val)}>
                                            <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Applied">Applied</SelectItem>
                                                <SelectItem value="CallForInterview">Call For Interview</SelectItem>
                                                <SelectItem value="Accepted">Accepted</SelectItem>
                                                <SelectItem value="Enrolled">Enrolled (Active)</SelectItem>
                                                <SelectItem value="Rejected">Rejected</SelectItem>
                                                <SelectItem value="inactive">Inactive</SelectItem>
                                                <SelectItem value="active">Active (Legacy)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-2">
                                            <Label>NIN</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    required
                                                    minLength={11}
                                                    maxLength={11}
                                                    value={formData.nin}
                                                    onChange={(e) => handleChange('nin', e.target.value)}
                                                    className={ninVerified ? "border-green-500 pr-10" : ""}
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
                                    </div>
                                    <div className="space-y-2">
                                        <Label>BVN</Label>
                                        <Input minLength={11} maxLength={11} value={formData.bvn} onChange={(e) => handleChange('bvn', e.target.value)} />
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
                                                <Input value={formData.accountNumber} onChange={(e) => handleChange('accountNumber', e.target.value)} maxLength={10} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Account Name</Label>
                                                <Input value={formData.accountName} onChange={(e) => handleChange('accountName', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Education & Background */}
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
                                            <Input value={formData.enrollmentCode} onChange={(e) => handleChange('enrollmentCode', e.target.value.toUpperCase())} placeholder="e.g. CCSA-001" className="font-mono" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Cluster</Label>
                                            <Input value={formData.cluster} onChange={(e) => handleChange('cluster', e.target.value)} placeholder="e.g. Kano North" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Work / Job History</Label>
                                        <Textarea rows={4} value={formData.jobHistory} onChange={(e) => handleChange('jobHistory', e.target.value)} placeholder={"List previous work experience, e.g.:\nNGO Field Officer, ActionAid, 2021–2023"} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Motivation / Cover Note</Label>
                                        <Textarea rows={3} value={formData.motivation} onChange={(e) => handleChange('motivation', e.target.value)} placeholder="Why do you want to be a field agent?" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Column 3: Location & Assignment */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Location & Assignment</CardTitle>
                                    <CardDescription>Geographic deployment.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="bg-gray-50 dark:bg-gray-700/40 p-3 rounded-md space-y-3">
                                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Residential Location</h4>
                                        <div className="space-y-2">
                                            <Label>State</Label>
                                            <Select required onValueChange={handleStateChange} value={formData.state}>
                                                <SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger>
                                                <SelectContent>
                                                    {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>LGA</Label>
                                            <Select required disabled={!formData.state} onValueChange={handleLgaChange} value={formData.lga}>
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
                                                    {Array.from(new Set(selectedWardData?.polling_units?.map((pu: string) => formatLocation(pu)) || [])).map((name: any, idx: number) => {
                                                        return <SelectItem key={`${name}-${idx}`} value={name}>{name}</SelectItem>;
                                                    })}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md space-y-3 border border-blue-100 dark:border-blue-500/30">
                                        <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300">Operational Assignment</h4>
                                        <div className="space-y-2">
                                            <Label>Assigned State</Label>
                                            <Select onValueChange={handleAssignedStateChange} value={formData.assignedState}>
                                                <SelectTrigger><SelectValue placeholder="Select Assignment State" /></SelectTrigger>
                                                <SelectContent>
                                                    {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
                        <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 min-w-37.5" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}

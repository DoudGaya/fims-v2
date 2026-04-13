'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
    SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { CloudArrowUpIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { hierarchicalData } from '@/lib/data/hierarchical-data';
import nigerianBanks from '@/data/nigerianBanks';

// ── Bank grouping ──────────────────────────────────────────────────────────────
const commercialBanks = nigerianBanks.filter((b: { code: string }) => b.code.length === 3);
const mfBanks         = nigerianBanks.filter((b: { code: string }) => b.code.startsWith('090'));
const digitalBanks    = nigerianBanks.filter(
    (b: { code: string }) => !b.code.startsWith('090') && b.code.length > 3,
);

// ── Section header divider ─────────────────────────────────────────────────────
function SectionHeader({ title, description }: { title: string; description?: string }) {
    return (
        <div className="border-t pt-6 mt-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
            {description && (
                <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
        </div>
    );
}

export default function AgentApplicationPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [step, setStep] = useState<'form' | 'success'>('form');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // ── Location helpers ──────────────────────────────────────────────────────────────
    const formatLocation = (name: string) => {
        if (!name) return '';
        return name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    };
    const states = hierarchicalData.map((d: any) => formatLocation(d.state));
    const [selectedStateData, setSelectedStateData] = useState<any>(null);
    const [selectedLgaData, setSelectedLgaData]     = useState<any>(null);
    const [selectedWardData, setSelectedWardData]   = useState<any>(null);

    // ── Form data (sent to API) ───────────────────────────────────────────────────────────
    const [formData, setFormData] = useState({
        enrollmentCode: '',
        firstName:     '',
        lastName:      '',
        email:         '',
        phone:         '',
        nin:           '',
        bvn:           '',
        gender:        '',
        education:     '',
        courseOfStudy: '',
        cluster:       '',
        jobHistory:    '',
        state:         '',
        lga:           '',
        ward:          '',
        pollingUnit:   '',
        bankName:      '',
        bankCode:      '',
        accountName:   '',
        accountNumber: '',
        photoUrl:      '',
        message:       '',
    });

    // ── Confirmation fields (UI-only, never sent) ──────────────────────────────────────────
    const [confirmEmail,         setConfirmEmail]         = useState('');
    const [confirmPhone,         setConfirmPhone]         = useState('');
    const [confirmNin,           setConfirmNin]           = useState('');
    const [confirmBvn,           setConfirmBvn]           = useState('');
    const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
    const [courseOfStudyOther, setCourseOfStudyOther]     = useState('');

    // ── Photo state ──────────────────────────────────────────────────────────────
    const [photoPreview,   setPhotoPreview]   = useState('');
    const [photoUploading, setPhotoUploading] = useState(false);
    const [photoError,     setPhotoError]     = useState('');
    const [isDragging,     setIsDragging]     = useState(false);

    // ── Helpers ──────────────────────────────────────────────────────────────
    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleStateChange = (name: string) => {
        setFormData((prev) => ({ ...prev, state: name, lga: '', ward: '', pollingUnit: '' }));
        const node = hierarchicalData.find((s: any) => formatLocation(s.state) === name);
        setSelectedStateData(node || null);
        setSelectedLgaData(null);
        setSelectedWardData(null);
    };

    const handleLgaChange = (name: string) => {
        setFormData((prev) => ({ ...prev, lga: name, ward: '', pollingUnit: '' }));
        const node = selectedStateData?.lgas.find((l: any) => formatLocation(l.lga) === name);
        setSelectedLgaData(node || null);
        setSelectedWardData(null);
    };

    const handleWardChange = (name: string) => {
        setFormData((prev) => ({ ...prev, ward: name, pollingUnit: '' }));
        const node = selectedLgaData?.wards.find((w: any) => formatLocation(w.ward) === name);
        setSelectedWardData(node || null);
    };

    const handleBankChange = (bankName: string) => {
        const bank = nigerianBanks.find((b: any) => b.name === bankName);
        setFormData((prev) => ({
            ...prev,
            bankName: bank?.name ?? bankName,
            bankCode: bank?.code ?? '',
        }));
    };

    // ── Photo upload ──────────────────────────────────────────────────────────────
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
            setFormData((prev) => ({ ...prev, photoUrl: data.url }));
        } catch (err: any) {
            setPhotoError(err.message);
            setPhotoPreview('');
            setFormData((prev) => ({ ...prev, photoUrl: '' }));
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
        [handlePhotoSelect],
    );

    // ── Submit ──────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        if (formData.email !== confirmEmail) { setErrorMsg('Email addresses do not match.'); return; }
        if (formData.phone !== confirmPhone) { setErrorMsg('Phone numbers do not match.'); return; }
        if (!/^\d{11}$/.test(formData.nin))  { setErrorMsg('NIN must be exactly 11 digits.'); return; }
        if (formData.nin !== confirmNin)      { setErrorMsg('NIN entries do not match.'); return; }
        if (formData.accountNumber && formData.accountNumber !== confirmAccountNumber) {
            setErrorMsg('Account numbers do not match.'); return;
        }
        if (formData.bvn && !/^\d{11}$/.test(formData.bvn)) { setErrorMsg('BVN must be exactly 11 digits.'); return; }
        if (formData.bvn && formData.bvn !== confirmBvn)      { setErrorMsg('BVN entries do not match.'); return; }
        if (!formData.photoUrl) { setErrorMsg('Please upload a passport photograph before submitting.'); return; }

        setLoading(true);
        try {
            const res = await fetch('/api/agents/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to submit application');
            }
            setStep('success');
        } catch (err: any) {
            setErrorMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Success screen ────────────────────────────────────────────────────────────
    if (step === 'success') {
        return (
            <div className="max-w-md mx-auto mt-16 px-4">
                <Card className="text-center py-10 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                    <CardContent className="space-y-4">
                        <div className="flex justify-center">
                            <CheckCircleIcon className="h-16 w-16 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-green-900 dark:text-green-100">
                            Application Received!
                        </h2>
                        <p className="text-green-800 dark:text-green-200">
                            Thank you for applying to be a Field Agent. We have received your details and will review your application shortly.
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                            Check your email for confirmation and next steps.
                        </p>
                        <div className="pt-6">
                            <Button
                                onClick={() => window.location.reload()}
                                variant="outline"
                                className="border-green-600 text-green-700 hover:bg-green-100 dark:border-green-500 dark:text-green-400 dark:hover:bg-green-900"
                            >
                                Submit Another Application
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ── Form ──────────────────────────────────────────────────────────────
    return (
        <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
            <div className="text-center mb-10">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                    Join Our Field Team
                </h1>
                <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
                    Become a key player in agricultural transformation. Apply now to become a Field Agent.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Application Form</CardTitle>
                    <CardDescription>
                        Please fill out all sections accurately. Fields marked * are required.
                    </CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6">

                        {/* ── Error banner ── */}
                        {errorMsg && (
                            <div className="rounded-md bg-red-50 p-4 border border-red-200 dark:bg-red-950/30 dark:border-red-900">
                                <div className="flex">
                                    <XCircleIcon className="h-5 w-5 text-red-400 shrink-0" />
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Please fix the following</h3>
                                        <p className="mt-1 text-sm text-red-700 dark:text-red-400">{errorMsg}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ════════════════════════════════════════════
                            0. ENROLLMENT CODE
                        ════════════════════════════════════════════ */}
                        <div className="space-y-2">
                            <Label htmlFor="enrollmentCode">Enrollment Code *</Label>
                            <Input id="enrollmentCode" required
                                placeholder="Enter your enrollment / referral code"
                                value={formData.enrollmentCode}
                                onChange={(e) => handleChange('enrollmentCode', e.target.value.toUpperCase())} />
                            <p className="text-[10px] text-muted-foreground">This code is provided by the institution or coordinator that referred you.</p>
                        </div>

                        {/* ════════════════════════════════════════════
                            1. PERSONAL DETAILS
                        ════════════════════════════════════════════ */}
                        <SectionHeader title="Personal Details" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First Name *</Label>
                                <Input id="firstName" required placeholder="e.g. John"
                                    value={formData.firstName}
                                    onChange={(e) => handleChange('firstName', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last Name *</Label>
                                <Input id="lastName" required placeholder="e.g. Doe"
                                    value={formData.lastName}
                                    onChange={(e) => handleChange('lastName', e.target.value)} />
                            </div>
                        </div>

                        {/* Email + confirm */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address *</Label>
                                <Input id="email" type="email" required placeholder="john.doe@example.com"
                                    value={formData.email}
                                    onChange={(e) => handleChange('email', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmEmail">Confirm Email *</Label>
                                <Input id="confirmEmail" type="email" required placeholder="Re-enter email"
                                    value={confirmEmail}
                                    onChange={(e) => setConfirmEmail(e.target.value)}
                                    className={confirmEmail
                                        ? formData.email !== confirmEmail
                                            ? 'border-red-400 focus-visible:ring-red-400'
                                            : 'border-green-400 focus-visible:ring-green-400'
                                        : ''} />
                                {confirmEmail && formData.email !== confirmEmail && (
                                    <p className="text-xs text-red-500">Emails don&apos;t match</p>
                                )}
                            </div>
                        </div>

                        {/* Phone + confirm */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number *</Label>
                                <Input id="phone" type="tel" required placeholder="e.g. 08012345678"
                                    value={formData.phone}
                                    onChange={(e) => handleChange('phone', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPhone">Confirm Phone *</Label>
                                <Input id="confirmPhone" type="tel" required placeholder="Re-enter phone"
                                    value={confirmPhone}
                                    onChange={(e) => setConfirmPhone(e.target.value)}
                                    className={confirmPhone
                                        ? formData.phone !== confirmPhone
                                            ? 'border-red-400 focus-visible:ring-red-400'
                                            : 'border-green-400 focus-visible:ring-green-400'
                                        : ''} />
                                {confirmPhone && formData.phone !== confirmPhone && (
                                    <p className="text-xs text-red-500">Numbers don&apos;t match</p>
                                )}
                            </div>
                        </div>

                        {/* NIN + confirm */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="nin">NIN (National Identity Number) *</Label>
                                <Input id="nin" minLength={11} maxLength={11} required
                                    placeholder="11-digit NIN"
                                    value={formData.nin}
                                    onChange={(e) => handleChange('nin', e.target.value.replace(/\D/g, ''))} />
                                <p className="text-[10px] text-muted-foreground">We will verify this during onboarding.</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmNin">Confirm NIN *</Label>
                                <Input id="confirmNin" minLength={11} maxLength={11} required
                                    placeholder="Re-enter NIN"
                                    value={confirmNin}
                                    onChange={(e) => setConfirmNin(e.target.value.replace(/\D/g, ''))}
                                    className={confirmNin
                                        ? formData.nin !== confirmNin
                                            ? 'border-red-400 focus-visible:ring-red-400'
                                            : 'border-green-400 focus-visible:ring-green-400'
                                        : ''} />
                                {confirmNin && formData.nin !== confirmNin && (
                                    <p className="text-xs text-red-500">NIN entries don&apos;t match</p>
                                )}
                            </div>
                        </div>

                        {/* Gender */}
                        <div className="space-y-2">
                            <Label htmlFor="gender">Gender *</Label>
                            <Select required onValueChange={(val) => handleChange('gender', val)}>
                                <SelectTrigger id="gender"><SelectValue placeholder="Select gender" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Male">Male</SelectItem>
                                    <SelectItem value="Female">Female</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* ════════════════════════════════════════════
                            2. EDUCATION & EXPERIENCE
                        ════════════════════════════════════════════ */}
                        <SectionHeader
                            title="Education & Experience"
                            description="Tell us about your academic background and work history."
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="education">Highest Education Level *</Label>
                                <Select required onValueChange={(val) => handleChange('education', val)}>
                                    <SelectTrigger id="education"><SelectValue placeholder="Select level" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Primary">Primary</SelectItem>
                                        <SelectItem value="Secondary / WAEC / NECO">Secondary / WAEC / NECO</SelectItem>
                                        <SelectItem value="OND / NCE">OND / NCE</SelectItem>
                                        <SelectItem value="HND">HND</SelectItem>
                                        <SelectItem value="BSc / BA">BSc / BA</SelectItem>
                                        <SelectItem value="MSc / MA / MBA">MSc / MA / MBA</SelectItem>
                                        <SelectItem value="PhD">PhD</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="courseOfStudy">Course of Study</Label>
                                <Select onValueChange={(val) => {
                                    handleChange('courseOfStudy', val === 'Other' ? '' : val);
                                    setCourseOfStudyOther(val === 'Other' ? '__other__' : '');
                                }}>
                                    <SelectTrigger id="courseOfStudy"><SelectValue placeholder="Select course" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectLabel>Agriculture &amp; Environment</SelectLabel>
                                            <SelectItem value="Agricultural Science">Agricultural Science</SelectItem>
                                            <SelectItem value="Agricultural Economics">Agricultural Economics</SelectItem>
                                            <SelectItem value="Agronomy">Agronomy</SelectItem>
                                            <SelectItem value="Animal Science">Animal Science</SelectItem>
                                            <SelectItem value="Fisheries &amp; Aquaculture">Fisheries &amp; Aquaculture</SelectItem>
                                            <SelectItem value="Forestry &amp; Wildlife">Forestry &amp; Wildlife</SelectItem>
                                            <SelectItem value="Soil Science">Soil Science</SelectItem>
                                            <SelectItem value="Rural Development">Rural Development</SelectItem>
                                            <SelectItem value="Environmental Science">Environmental Science</SelectItem>
                                        </SelectGroup>
                                        <SelectGroup>
                                            <SelectLabel>Sciences &amp; Technology</SelectLabel>
                                            <SelectItem value="Biology">Biology</SelectItem>
                                            <SelectItem value="Chemistry">Chemistry</SelectItem>
                                            <SelectItem value="Physics">Physics</SelectItem>
                                            <SelectItem value="Mathematics">Mathematics</SelectItem>
                                            <SelectItem value="Statistics">Statistics</SelectItem>
                                            <SelectItem value="Computer Science">Computer Science</SelectItem>
                                            <SelectItem value="Information Technology">Information Technology</SelectItem>
                                            <SelectItem value="Geography">Geography</SelectItem>
                                            <SelectItem value="Geology">Geology</SelectItem>
                                        </SelectGroup>
                                        <SelectGroup>
                                            <SelectLabel>Social Sciences &amp; Humanities</SelectLabel>
                                            <SelectItem value="Economics">Economics</SelectItem>
                                            <SelectItem value="Sociology">Sociology</SelectItem>
                                            <SelectItem value="Political Science">Political Science</SelectItem>
                                            <SelectItem value="Public Administration">Public Administration</SelectItem>
                                            <SelectItem value="Geography &amp; Planning">Geography &amp; Planning</SelectItem>
                                            <SelectItem value="History">History</SelectItem>
                                            <SelectItem value="English Language">English Language</SelectItem>
                                            <SelectItem value="Mass Communication">Mass Communication</SelectItem>
                                        </SelectGroup>
                                        <SelectGroup>
                                            <SelectLabel>Business &amp; Management</SelectLabel>
                                            <SelectItem value="Business Administration">Business Administration</SelectItem>
                                            <SelectItem value="Accounting">Accounting</SelectItem>
                                            <SelectItem value="Banking &amp; Finance">Banking &amp; Finance</SelectItem>
                                            <SelectItem value="Marketing">Marketing</SelectItem>
                                            <SelectItem value="Public Relations">Public Relations</SelectItem>
                                        </SelectGroup>
                                        <SelectGroup>
                                            <SelectLabel>Education</SelectLabel>
                                            <SelectItem value="Education">Education (General)</SelectItem>
                                            <SelectItem value="Agricultural Education">Agricultural Education</SelectItem>
                                            <SelectItem value="Science Education">Science Education</SelectItem>
                                        </SelectGroup>
                                        <SelectGroup>
                                            <SelectLabel>Health &amp; Medicine</SelectLabel>
                                            <SelectItem value="Nursing">Nursing</SelectItem>
                                            <SelectItem value="Public Health">Public Health</SelectItem>
                                            <SelectItem value="Community Health">Community Health</SelectItem>
                                        </SelectGroup>
                                        <SelectItem value="Other">Other (please specify)</SelectItem>
                                    </SelectContent>
                                </Select>
                                {courseOfStudyOther === '__other__' && (
                                    <Input
                                        placeholder="Enter your course of study"
                                        autoFocus
                                        value={formData.courseOfStudy}
                                        onChange={(e) => handleChange('courseOfStudy', e.target.value)}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cluster">Cluster / Institution</Label>
                            <Select onValueChange={(val) => handleChange('cluster', val)} value={formData.cluster}>
                                <SelectTrigger id="cluster"><SelectValue placeholder="Select your cluster" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Audu Bako College of Agriculture, Danbatta, Kano State">
                                        Audu Bako College of Agriculture, Danbatta, Kano State
                                    </SelectItem>
                                    <SelectItem value="Oyo State College of Agriculture and Technology (OYSCATECH)">
                                        Oyo State College of Agriculture and Technology (OYSCATECH)
                                    </SelectItem>
                                    <SelectItem value="Adamawa State College of Education, Hong">
                                        Adamawa State College of Education, Hong
                                    </SelectItem>
                                    <SelectItem value="College of Agriculture, Science and Technology, Lafia">
                                        College of Agriculture, Science and Technology, Lafia
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="jobHistory">Work Experience</Label>
                            <Textarea id="jobHistory" className="h-28"
                                placeholder={"List your previous work experience. e.g.:\nNGO Field Officer, ActionAid Nigeria, 2021–2023\nFarm Supervisor, Kebbi State ADP, 2019–2021"}
                                value={formData.jobHistory}
                                onChange={(e) => handleChange('jobHistory', e.target.value)} />
                        </div>

                        {/* ════════════════════════════════════════════
                            3. LOCATION
                        ════════════════════════════════════════════ */}
                        <SectionHeader title="Target Location" description="The state and LGA where you intend to work." />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                <Label htmlFor="lga">LGA *</Label>
                                <Select required disabled={!formData.state} onValueChange={handleLgaChange} value={formData.lga}>
                                    <SelectTrigger id="lga"><SelectValue placeholder="Select LGA" /></SelectTrigger>
                                    <SelectContent>
                                        {selectedStateData?.lgas.map((l: any) => {
                                            const n = formatLocation(l.lga);
                                            return <SelectItem key={n} value={n}>{n}</SelectItem>;
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ward">Ward</Label>
                                <Select disabled={!formData.lga} onValueChange={handleWardChange} value={formData.ward}>
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
                                <Label htmlFor="pollingUnit">Polling Unit</Label>
                                <Select disabled={!formData.ward} onValueChange={(v) => handleChange('pollingUnit', v)} value={formData.pollingUnit}>
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

                        {/* ════════════════════════════════════════════
                            4. BANK DETAILS
                        ════════════════════════════════════════════ */}
                        <SectionHeader title="Bank Details" description="Provide the account where payments will be made." />

                        <div className="space-y-2">
                            <Label htmlFor="bankName">Bank Name *</Label>
                            <Select required onValueChange={handleBankChange}>
                                <SelectTrigger id="bankName"><SelectValue placeholder="Select your bank" /></SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Commercial Banks</SelectLabel>
                                        {commercialBanks.map((b: any) => (
                                            <SelectItem key={b.code} value={b.name}>{b.name}</SelectItem>
                                        ))}
                                    </SelectGroup>
                                    <SelectGroup>
                                        <SelectLabel>Microfinance Banks</SelectLabel>
                                        {mfBanks.map((b: any) => (
                                            <SelectItem key={b.code} value={b.name}>{b.name}</SelectItem>
                                        ))}
                                    </SelectGroup>
                                    <SelectGroup>
                                        <SelectLabel>Digital Banks &amp; Fintech</SelectLabel>
                                        {digitalBanks.map((b: any) => (
                                            <SelectItem key={b.code} value={b.name}>{b.name}</SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* BVN + confirm */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="bvn">BVN (Bank Verification Number)</Label>
                                <Input id="bvn" maxLength={11}
                                    placeholder="11-digit BVN"
                                    value={formData.bvn}
                                    onChange={(e) => handleChange('bvn', e.target.value.replace(/\D/g, ''))} />
                                <p className="text-[10px] text-muted-foreground">Optional — will be verified during onboarding.</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmBvn">Confirm BVN</Label>
                                <Input id="confirmBvn" maxLength={11}
                                    placeholder="Re-enter BVN"
                                    value={confirmBvn}
                                    onChange={(e) => setConfirmBvn(e.target.value.replace(/\D/g, ''))}
                                    className={confirmBvn
                                        ? formData.bvn !== confirmBvn
                                            ? 'border-red-400 focus-visible:ring-red-400'
                                            : 'border-green-400 focus-visible:ring-green-400'
                                        : ''} />
                                {confirmBvn && formData.bvn !== confirmBvn && (
                                    <p className="text-xs text-red-500">BVN entries don&apos;t match</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="accountName">Account Name *</Label>
                            <Input id="accountName" required
                                placeholder="Name exactly as it appears on your bank account"
                                value={formData.accountName}
                                onChange={(e) => handleChange('accountName', e.target.value)} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="accountNumber">Account Number *</Label>
                                <Input id="accountNumber" required maxLength={10}
                                    placeholder="10-digit account number"
                                    value={formData.accountNumber}
                                    onChange={(e) => handleChange('accountNumber', e.target.value.replace(/\D/g, ''))} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmAccountNumber">Confirm Account Number *</Label>
                                <Input id="confirmAccountNumber" required maxLength={10}
                                    placeholder="Re-enter account number"
                                    value={confirmAccountNumber}
                                    onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\D/g, ''))}
                                    className={confirmAccountNumber
                                        ? formData.accountNumber !== confirmAccountNumber
                                            ? 'border-red-400 focus-visible:ring-red-400'
                                            : 'border-green-400 focus-visible:ring-green-400'
                                        : ''} />
                                {confirmAccountNumber && formData.accountNumber !== confirmAccountNumber && (
                                    <p className="text-xs text-red-500">Account numbers don&apos;t match</p>
                                )}
                            </div>
                        </div>

                        {/* ════════════════════════════════════════════
                            5. PASSPORT PHOTOGRAPH
                        ════════════════════════════════════════════ */}
                        <SectionHeader
                            title="Passport Photograph *"
                            description="Upload a clear, recent passport-sized photo. JPEG, PNG or WebP — max 5 MB."
                        />

                        <div>
                            <input ref={fileInputRef} type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                className="sr-only"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(f); }} />

                            {photoPreview ? (
                                <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={photoPreview} alt="Passport preview"
                                        className="h-24 w-24 rounded-md object-cover border" />
                                    <div className="flex-1">
                                        {photoUploading ? (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <span className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                                Uploading…
                                            </div>
                                        ) : formData.photoUrl ? (
                                            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 font-medium">
                                                <CheckCircleIcon className="h-5 w-5" />
                                                Photo uploaded successfully
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-sm text-red-600">
                                                <XCircleIcon className="h-5 w-5" />
                                                {photoError || 'Upload failed'}
                                            </div>
                                        )}
                                        <Button type="button" variant="ghost" size="sm"
                                            className="mt-2 h-7 text-xs text-muted-foreground"
                                            onClick={() => {
                                                setPhotoPreview('');
                                                setPhotoError('');
                                                setFormData((prev) => ({ ...prev, photoUrl: '' }));
                                                if (fileInputRef.current) fileInputRef.current.value = '';
                                            }}
                                        >
                                            Remove &amp; replace
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    role="button" tabIndex={0}
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
                                        ? <CloudArrowUpIcon className="h-12 w-12 text-green-500" />
                                        : <PhotoIcon className="h-12 w-12 text-muted-foreground" />}
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

                        {/* ════════════════════════════════════════════
                            6. MOTIVATION
                        ════════════════════════════════════════════ */}
                        <SectionHeader title="Motivation" />

                        <div className="space-y-2">
                            <Label htmlFor="message">
                                Why do you want to join us?{' '}
                                <span className="text-muted-foreground font-normal">(Optional)</span>
                            </Label>
                            <Textarea id="message" className="h-20"
                                placeholder="Briefly describe your motivation or any additional information you'd like to share…"
                                value={formData.message}
                                onChange={(e) => handleChange('message', e.target.value)} />
                        </div>

                    </CardContent>

                    <CardFooter className="flex justify-between bg-gray-50 dark:bg-muted/50 p-6 rounded-b-xl border-t">
                        <Button variant="ghost" type="button" onClick={() => router.push('/')}>Cancel</Button>
                        <Button type="submit" className="bg-green-600 hover:bg-green-700"
                            disabled={loading || photoUploading}>
                            {loading ? 'Submitting…' : 'Submit Application'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}

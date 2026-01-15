'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
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
        nin: '',
        bvn: '',
        gender: '',
        maritalStatus: '',
        dateOfBirth: '',
        address: '',
        bankName: '',
        accountNumber: '',
        accountName: '',
        state: '',
        lga: '',
        ward: '',
        pollingUnit: '',
        assignedState: '',
        assignedLGA: '',
        status: 'active',
        isActive: true
    });

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
                    nin: agentProfile.nin || '',
                    bvn: agentProfile.bvn || '',
                    gender: agentProfile.gender || '',
                    maritalStatus: agentProfile.maritalStatus || '',
                    dateOfBirth: agentProfile.dateOfBirth ? new Date(agentProfile.dateOfBirth).toISOString().split('T')[0] : '',
                    address: agentProfile.address || '',
                    bankName: agentProfile.bankName || '',
                    accountNumber: agentProfile.accountNumber || '',
                    accountName: agentProfile.accountName || '',
                    state: initialState,
                    lga: initialLga,
                    ward: initialWard,
                    pollingUnit: agentProfile.pollingUnit || '',
                    assignedState: agentProfile.assignedState || '',
                    assignedLGA: agentProfile.assignedLGA || '',
                    status: agentProfile.status || (data.isActive ? 'active' : 'inactive'),
                    isActive: data.isActive
                });

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
        // Reset valid state if NIN changes
        if (field === 'nin') setNinVerified(false);
    };

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

        // Validate NIN
        if (!/^\d{11}$/.test(formData.nin)) {
            setErrorMsg('NIN must be exactly 11 digits numeric.');
            setSaving(false);
            return;
        }

        try {
            const res = await fetch(`/api/agents/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    localGovernment: formData.lga, // Map to API expected field
                    isActive: formData.status === 'Enrolled' || formData.status === 'active' // simplistic logic, backend handles sync
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update agent');
            }

            router.push(`/agents/${id}`);
            router.refresh();
        } catch (err: any) {
            console.error(err);
            setErrorMsg(err.message);
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
                <h1 className="text-2xl font-bold text-gray-900">Edit Agent Compliance & Profile</h1>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="space-y-8">
                    {errorMsg && (
                        <div className="bg-red-50 text-red-700 p-4 rounded-md text-sm border border-red-200">
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
                                        <Input disabled value={formData.email} className="bg-gray-100" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Phone</Label>
                                        <Input required value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} />
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
                                        <h4 className="text-sm font-medium mb-3 text-gray-900">Bank Account Details</h4>
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
                        </div>

                        {/* Column 3: Location & Assignment */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Location & Assignment</CardTitle>
                                    <CardDescription>Geographic deployment.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="bg-gray-50 p-3 rounded-md space-y-3">
                                        <h4 className="text-sm font-semibold text-gray-700">Residential Location</h4>
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
                                                    {selectedWardData?.polling_units.map((pu: string) => {
                                                        const name = formatLocation(pu);
                                                        return <SelectItem key={name} value={name}>{name}</SelectItem>;
                                                    })}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="bg-blue-50 p-3 rounded-md space-y-3 border border-blue-100">
                                        <h4 className="text-sm font-semibold text-blue-800">Operational Assignment</h4>
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

                    <div className="flex justify-end gap-4 bg-white p-4 border rounded-lg shadow-sm sticky bottom-4 z-10">
                        <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 min-w-[150px]" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}

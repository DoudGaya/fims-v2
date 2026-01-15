'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { hierarchicalData } from '@/lib/data/hierarchical-data';

export default function AgentApplicationPage() {
    const router = useRouter();
    const [step, setStep] = useState<'form' | 'success' | 'error'>('form');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Helper to format location names (remove hyphens, capitalize)
    const formatLocation = (name: string) => {
        if (!name) return '';
        return name
            .replace(/-/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
    };

    // Location Data derived from hierarchicalData
    const states = hierarchicalData.map(d => formatLocation(d.state));
    const [selectedStateData, setSelectedStateData] = useState<any>(null);
    const [selectedLgaData, setSelectedLgaData] = useState<any>(null);
    const [selectedWardData, setSelectedWardData] = useState<any>(null);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        nin: '',
        state: '',
        lga: '',
        ward: '',
        pollingUnit: '',
        gender: '',
        about: ''
    });

    const handleStateChange = (formattedStateName: string) => {
        setFormData(prev => ({ ...prev, state: formattedStateName, lga: '', ward: '', pollingUnit: '' }));
        // Find original node by matching formatted name
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

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        // Validate NIN
        if (!/^\d{11}$/.test(formData.nin)) {
            setErrorMsg('NIN must be exactly 11 digits numeric.');
            setLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/public/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to submit application');
            }

            setStep('success');
        } catch (err: any) {
            console.error(err);
            setErrorMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (step === 'success') {
        return (
            <div className="max-w-md mx-auto mt-16 px-4">
                <Card className="text-center py-10 border-green-200 bg-green-50">
                    <CardContent className="space-y-4">
                        <div className="flex justify-center">
                            <CheckCircleIcon className="h-16 w-16 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-green-900">Application Received!</h2>
                        <p className="text-green-800">
                            Thank you for applying to be a Field Agent. We have received your details and will review your application shortly.
                        </p>
                        <p className="text-sm text-green-700">
                            Check your email for confirmation and next steps.
                        </p>
                        <div className="pt-6">
                            <Button onClick={() => window.location.reload()} variant="outline" className="border-green-600 text-green-700 hover:bg-green-100">
                                Submit Another
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
            <div className="text-center mb-10">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Join Our Field Team</h1>
                <p className="mt-2 text-lg text-gray-600">
                    Become a key player in agricultural transformation. Apply now to become a Field Agent.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Application Form</CardTitle>
                    <CardDescription>Please fill out your personal information and location accurately.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6">
                        {errorMsg && (
                            <div className="rounded-md bg-red-50 p-4 border border-red-200">
                                <div className="flex">
                                    <div className="shrink-0">
                                        <XCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-red-800">Application Error</h3>
                                        <div className="mt-2 text-sm text-red-700">
                                            <p>{errorMsg}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Personal Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First Name</Label>
                                <Input
                                    id="firstName"
                                    required
                                    placeholder="e.g. John"
                                    value={formData.firstName}
                                    onChange={(e) => handleChange('firstName', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input
                                    id="lastName"
                                    required
                                    placeholder="e.g. Doe"
                                    value={formData.lastName}
                                    onChange={(e) => handleChange('lastName', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                required
                                placeholder="john.doe@example.com"
                                value={formData.email}
                                onChange={(e) => handleChange('email', e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    required
                                    placeholder="+234..."
                                    value={formData.phone}
                                    onChange={(e) => handleChange('phone', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="nin">NIN (National Identity Number)</Label>
                                <Input
                                    id="nin"
                                    minLength={11}
                                    maxLength={11}
                                    placeholder="11-digit NIN"
                                    value={formData.nin}
                                    onChange={(e) => handleChange('nin', e.target.value)}
                                />
                                <p className="text-[10px] text-muted-foreground">We will verify this during onboarding.</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="gender">Gender</Label>
                            <Select required onValueChange={(val) => handleChange('gender', val)}>
                                <SelectTrigger id="gender">
                                    <SelectValue placeholder="Select Gender" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Male">Male</SelectItem>
                                    <SelectItem value="Female">Female</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Location Details */}
                        <div className="border-t pt-4 mt-4 bg-gray-50/50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-gray-900 mb-4">Target Location</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="state">State</Label>
                                    <Select required onValueChange={handleStateChange} value={formData.state}>
                                        <SelectTrigger id="state">
                                            <SelectValue placeholder="Select State" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {states.map(state => (
                                                <SelectItem key={state} value={state}>{state}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="lga">LGA (Local Government)</Label>
                                    <Select required disabled={!formData.state} onValueChange={handleLgaChange} value={formData.lga}>
                                        <SelectTrigger id="lga">
                                            <SelectValue placeholder="Select LGA" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {selectedStateData?.lgas.map((lga: any) => {
                                                const name = formatLocation(lga.lga);
                                                return <SelectItem key={name} value={name}>{name}</SelectItem>;
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="ward">Ward</Label>
                                    <Select disabled={!formData.lga} onValueChange={handleWardChange} value={formData.ward}>
                                        <SelectTrigger id="ward">
                                            <SelectValue placeholder="Select Ward" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {selectedLgaData?.wards.map((ward: any) => {
                                                const name = formatLocation(ward.ward);
                                                return <SelectItem key={name} value={name}>{name}</SelectItem>;
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="pollingUnit">Polling Unit</Label>
                                    <Select disabled={!formData.ward} onValueChange={(val) => handleChange('pollingUnit', val)} value={formData.pollingUnit}>
                                        <SelectTrigger id="pollingUnit">
                                            <SelectValue placeholder="Select Polling Unit" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {selectedWardData?.polling_units.map((pu: string) => {
                                                const name = formatLocation(pu);
                                                return <SelectItem key={name} value={name}>{name}</SelectItem>;
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="about">Why do you want to join us? (Optional)</Label>
                            <Textarea
                                id="about"
                                placeholder="Briefly describe your experience or motivation..."
                                className="h-24"
                                value={formData.about}
                                onChange={(e) => handleChange('about', e.target.value)}
                            />
                        </div>

                    </CardContent>
                    <CardFooter className="flex justify-between bg-gray-50 p-6 rounded-b-xl border-t">
                        <Button variant="ghost" type="button" onClick={() => router.push('/')}>Cancel</Button>
                        <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={loading}>
                            {loading ? 'Submitting...' : 'Submit Application'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}

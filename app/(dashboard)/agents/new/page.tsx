'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hierarchicalData } from '@/lib/data/hierarchical-data';

export default function NewAgentPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
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

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        nin: '',
        state: '',
        lga: '',
        assignedState: '',
        assignedLGA: '',
        status: 'active'
    });

    const handleStateChange = (formattedStateName: string) => {
        setFormData(prev => ({ ...prev, state: formattedStateName, lga: '' }));
        const newState = hierarchicalData.find(s => formatLocation(s.state) === formattedStateName);
        setSelectedStateData(newState || null);
        setSelectedLgaData(null);
    };

    const handleLgaChange = (formattedLgaName: string) => {
        setFormData(prev => ({ ...prev, lga: formattedLgaName }));
        const newLga = selectedStateData?.lgas.find((l: any) => formatLocation(l.lga) === formattedLgaName);
        setSelectedLgaData(newLga || null);
    };

    const handleAssignedStateChange = (stateName: string) => {
        setFormData(prev => ({ ...prev, assignedState: stateName }));
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
            const res = await fetch('/api/agents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create agent');
            }

            router.push('/agents');
            router.refresh();
        } catch (err: any) {
            console.error(err);
            setErrorMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-6 flex items-center gap-4">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/agents">
                        <ArrowLeftIcon className="h-4 w-4 mr-2" />
                        Back to Agents
                    </Link>
                </Button>
                <h1 className="text-2xl font-bold text-gray-900">Enroll New Agent</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Agent Details</CardTitle>
                    <CardDescription>Create a new agent account directly. They will be marked as Active by default.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6">
                        {errorMsg && (
                            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
                                {errorMsg}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First Name</Label>
                                <Input required value={formData.firstName} onChange={(e) => handleChange('firstName', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input required value={formData.lastName} onChange={(e) => handleChange('lastName', e.target.value)} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input type="email" required value={formData.email} onChange={(e) => handleChange('email', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input type="tel" required value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="password">Initial Password</Label>
                                <Input type="password" required value={formData.password} onChange={(e) => handleChange('password', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="nin">NIN</Label>
                                <Input required minLength={11} maxLength={11} value={formData.nin} onChange={(e) => handleChange('nin', e.target.value)} />
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <h3 className="text-sm font-medium mb-4">Location & Assignment</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Residence */}
                                <div className="space-y-2">
                                    <Label>Resident State</Label>
                                    <Select required onValueChange={handleStateChange} value={formData.state}>
                                        <SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger>
                                        <SelectContent>
                                            {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Resident LGA</Label>
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

                                {/* Assignment */}
                                <div className="space-y-2">
                                    <Label>Assigned State</Label>
                                    <Select required onValueChange={handleAssignedStateChange} value={formData.assignedState}>
                                        <SelectTrigger><SelectValue placeholder="Select Assignment State" /></SelectTrigger>
                                        <SelectContent>
                                            {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Assigned LGA (Optional)</Label>
                                    <Input placeholder="Enter assigned LGA manually if differs" value={formData.assignedLGA} onChange={(e) => handleChange('assignedLGA', e.target.value)} />
                                </div>
                            </div>
                        </div>

                    </CardContent>
                    <CardFooter className="flex justify-end gap-3 bg-gray-50 p-6 rounded-b-xl border-t">
                        <Button variant="ghost" type="button" onClick={() => router.push('/agents')}>Cancel</Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
                            {loading ? 'Creating...' : 'Enroll Agent'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}

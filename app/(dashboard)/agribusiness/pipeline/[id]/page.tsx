import { notFound } from 'next/navigation';
import Link from 'next/link';
import { BuildingOffice2Icon, CheckCircleIcon, MapPinIcon, ShieldCheckIcon, DocumentTextIcon, UsersIcon } from '@heroicons/react/24/outline';
import prisma from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const revalidate = 0; // Prevent aggressive caching

export default async function AgriBusinessDetailPage({ params }: { params: { id: string } }) {
  const stakeholder = await prisma.businessStakeholder.findUnique({
    where: { id: params.id },
    include: {
      kyb: true,
      applications: true,
      agreements: true,
      outreachPlans: true,
      farmers: { take: 10, select: { id: true, firstName: true, lastName: true, phone: true } },
      createdBy: { select: { firstName: true, lastName: true, role: true } },
    },
  });

  if (!stakeholder) {
    notFound();
  }

  return (
    <div className="space-y-6 py-4">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-slate-900">{stakeholder.businessName}</h1>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {stakeholder.status.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-slate-500">{stakeholder.businessType} • Captured on {stakeholder.createdAt.toLocaleDateString()}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/agribusiness/pipeline">Back to Pipeline</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Core Info */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BuildingOffice2Icon className="h-5 w-5 text-slate-500" />
                Business Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">Contact Name</p>
                <p className="font-medium">{stakeholder.contactName}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Contact Role</p>
                <p className="font-medium">{stakeholder.contactRole || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Email</p>
                <p className="font-medium">{stakeholder.email}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Phone</p>
                <p className="font-medium">{stakeholder.phone || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-slate-500">Location</p>
                <p className="font-medium flex items-center gap-1">
                  <MapPinIcon className="h-4 w-4 text-slate-400" />
                  {[stakeholder.lga, stakeholder.state].filter(Boolean).join(', ') || 'Not specified'}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-slate-500 mb-1">Interests</p>
                <div className="flex flex-wrap gap-2">
                  {stakeholder.interests.map((interest) => (
                    <Badge key={interest} variant="secondary">{interest}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheckIcon className="h-5 w-5 text-slate-500" />
                KYB & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <Badge className={stakeholder.kybStatus === 'VERIFIED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'}>
                  {stakeholder.kybStatus.replace('_', ' ')}
                </Badge>
              </div>
              {stakeholder.kyb ? (
                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div>
                    <p className="text-sm text-slate-500">CAC Number</p>
                    <p className="font-medium">{stakeholder.kyb.cacNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">TIN</p>
                    <p className="font-medium">{stakeholder.kyb.tin || 'N/A'}</p>
                  </div>
                  {stakeholder.kyb.documentUrls && stakeholder.kyb.documentUrls.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-sm text-slate-500">Documents</p>
                      <div className="flex gap-2 mt-1">
                        {stakeholder.kyb.documentUrls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
                            <DocumentTextIcon className="h-4 w-4" /> View Doc {i + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No KYB submission yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UsersIcon className="h-5 w-5 text-slate-500" />
                Associated Farmers (Sample)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stakeholder.farmers.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {stakeholder.farmers.map((farmer) => (
                    <li key={farmer.id} className="py-2 flex justify-between items-center">
                      <span className="font-medium">{farmer.firstName} {farmer.lastName}</span>
                      <span className="text-slate-500 text-sm">{farmer.phone}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No farmers associated yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Related Entities */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lead Source</CardTitle>
            </CardHeader>
            <CardContent>
              {stakeholder.createdBy ? (
                <div>
                  <p className="font-medium">{stakeholder.createdBy.firstName} {stakeholder.createdBy.lastName}</p>
                  <Badge variant="secondary" className="mt-1">{stakeholder.createdBy.role}</Badge>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Public Application</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Applications</CardTitle>
            </CardHeader>
            <CardContent>
              {stakeholder.applications.length > 0 ? (
                <ul className="space-y-3">
                  {stakeholder.applications.map((app) => (
                    <li key={app.id} className="border-l-2 border-blue-500 pl-3">
                      <p className="font-medium text-sm">{app.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{app.status}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No applications.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Agreements</CardTitle>
            </CardHeader>
            <CardContent>
              {stakeholder.agreements.length > 0 ? (
                <ul className="space-y-3">
                  {stakeholder.agreements.map((agr) => (
                    <li key={agr.id} className="border-l-2 border-green-500 pl-3">
                      <p className="font-medium text-sm">{agr.agreementType}</p>
                      <p className="text-xs text-slate-500 mt-1">{agr.status}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No agreements.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

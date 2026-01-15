import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import {
  CheckCircle,
  XCircle,
  MapPin,
  Calendar,
  User,
  FileText
} from 'lucide-react';

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export default async function VerifyCertificatePage({ params }: Props) {
  const { id } = await params;

  const certificate = await prisma.certificate.findUnique({
    where: { certificateId: id },
    include: {
      farmer: {
        include: {
          farms: true,
          cluster: true
        }
      }
    }
  });

  if (!certificate) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border-l-4 border-red-500">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Invalid Certificate</h1>
          <p className="text-gray-600">
            The certificate ID <span className="font-mono font-bold">{id}</span> could not be found in our records.
          </p>
        </div>
      </div>
    );
  }

  const { farmer } = certificate;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header Badge */}
        <div className="bg-green-600 px-6 py-8 text-center">
          <div className="inline-flex items-center justify-center bg-white p-3 rounded-full mb-4 shadow-md">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Certificate Verified</h1>
          <p className="text-green-100 font-medium">
            This certificate is valid and issued by the Centre for Climate-Smart Agriculture
          </p>
        </div>

        <div className="p-8">
          {/* Certificate Details */}
          <div className="border-b border-gray-200 pb-8 mb-8">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Certificate Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Certificate ID</p>
                  <p className="text-lg font-mono font-bold text-gray-900">{certificate.certificateId}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Issued On</p>
                  <p className="text-lg font-medium text-gray-900">
                    {new Date(certificate.issuedDate).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Farmer Details */}
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Farmer Information</h2>
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
              <div className="flex items-start space-x-4 mb-6">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {farmer.firstName} {farmer.middleName ? farmer.middleName + ' ' : ''}{farmer.lastName}
                  </h3>
                  <p className="text-gray-500 mb-1">Registered Farmer</p>
                  <div className="flex items-center text-sm text-gray-400 space-x-2">
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium border border-blue-100">
                      {farmer.gender ? farmer.gender.charAt(0).toUpperCase() + farmer.gender.slice(1).toLowerCase() : 'N/A'}
                    </span>
                    <span>•</span>
                    <span>NIN: {farmer.nin || 'xxxxxxxx'}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoItem label="Based In" value={`${farmer.lga || ''}, ${farmer.state || ''}`} icon={MapPin} />
                <InfoItem label="Ward" value={farmer.ward || 'N/A'} />
                <InfoItem label="Farms Registered" value={farmer.farms.length.toString()} />
                <InfoItem label="Cluster" value={farmer.cluster?.title || 'No Cluster'} />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-400">
              Verified by CCSA Certificate System • Cosmopolitan University Abuja
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value, icon: Icon }: { label: string, value: string, icon?: any }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-400 uppercase font-medium mb-1">{label}</span>
      <div className="flex items-center font-medium text-gray-700">
        {Icon && <Icon className="w-4 h-4 mr-1.5 text-gray-400" />}
        <span>{value}</span>
      </div>
    </div>
  );
}

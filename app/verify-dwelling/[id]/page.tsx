import prisma from '@/lib/prisma';
import Image from 'next/image';
import Link from 'next/link';
import { formatPollingUnit } from '@/lib/textUtils';
import {
  CheckCircle,
  XCircle,
  MapPin,
  Calendar,
  User,
  Phone,
  ShieldCheck,
  Zap,
  Home,
  Users,
  ExternalLink,
  Radio,
  FileBadge,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export default async function VerifyDwellingPage({ params }: Props) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id || '').trim();

  // Find by houseNumber, id, or offlineId
  const household = await prisma.household.findFirst({
    where: {
      OR: [
        { houseNumber: decodedId },
        { id: decodedId },
        { offlineId: decodedId },
      ],
    },
    include: {
      agent: {
        select: {
          displayName: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
  });

  if (!household) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-slate-100 to-slate-200 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-2xl max-w-lg w-full text-center border-t-4 border-rose-500">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <XCircle className="w-10 h-10 text-rose-500" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Record Not Found</h1>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            No official dwelling registration could be resolved matching identification code{' '}
            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
              {decodedId}
            </span>
            . Please verify that the code was entered or scanned correctly.
          </p>
          <div className="text-xs text-slate-400 border-t border-slate-100 pt-4">
            Centre for Climate-Smart Agriculture (CCSA) • Cosmopolitan University Abuja
          </div>
        </div>
      </div>
    );
  }

  const fullName = [household.headFirstName, household.headMiddleName, household.headLastName]
    .filter(Boolean)
    .join(' ');

  const maskedNin = household.headNin
    ? `${household.headNin.slice(0, 4)}••••${household.headNin.slice(-3)}`
    : null;

  const googleMapsUrl =
    household.latitude && household.longitude
      ? `https://www.google.com/maps?q=${household.latitude},${household.longitude}`
      : null;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80">
        {/* ── Institutional Brand Banner ── */}
        <div className="bg-[#081B33] text-white px-6 sm:px-10 py-8 relative overflow-hidden">
          {/* Subtle gold accent top bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-[#C5A059] via-[#E8D4A8] to-[#C5A059]" />

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-full bg-white/10 p-1.5 backdrop-blur border border-white/20 shadow-xl">
              <Image
                src="/certificate-logo.png"
                alt="Cosmopolitan University / CCSA Seal"
                width={96}
                height={96}
                className="w-full h-full object-contain"
                priority
              />
            </div>

            <div className="flex-1">
              <div className="inline-flex items-center gap-2 bg-[#C5A059]/20 border border-[#C5A059]/40 text-[#F5E6C4] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                <FileBadge className="w-3.5 h-3.5 text-[#C5A059]" />
                Official Dwelling Registry Record
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                Centre for Climate-Smart Agriculture
              </h1>
              <p className="text-sm font-semibold text-sky-200 mt-0.5">
                Cosmopolitan University Abuja
              </p>
              <p className="text-xs font-bold text-[#E8D4A8] tracking-widest mt-0.5 uppercase">
                CCSA / AGROMONEY • National Household & Energy Registry
              </p>
            </div>
          </div>
        </div>

        {/* ── Verification Status Pill Bar ── */}
        <div className="bg-linear-to-r from-emerald-600 to-emerald-700 px-6 sm:px-10 py-4 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0 border border-white/30">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-sm font-extrabold tracking-wide uppercase">
                Dwelling Registration Confirmed & Active
              </div>
              <div className="text-xs text-emerald-100">
                Official verified record registered on the national database
              </div>
            </div>
          </div>

          <div className="font-mono text-xs font-bold bg-white text-emerald-900 px-3 py-1.5 rounded-lg shadow-sm border border-emerald-200">
            {household.houseNumber}
          </div>
        </div>

        {/* ── Document Body ── */}
        <div className="p-6 sm:p-10 space-y-8">
          {/* House Code & Key Overview */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Standardized House Code
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono text-[#081B33] tracking-tight mt-1">
                {household.houseNumber}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Cataloged: {new Date(household.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-blue-600" />
                Status: {household.interventionStatus}
              </span>
              {household.hasPUE && (
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  PUE Active
                </span>
              )}
            </div>
          </div>

          {/* Grid: Head of Household & Spatial Coordinates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Head of Household */}
            <div className="border border-slate-200 rounded-2xl p-6 bg-white shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-2 rounded-lg bg-blue-50 text-[#081B33]">
                  <User className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Head of Household
                  </h2>
                  <p className="text-xs text-slate-400">Identity & Demographic Information</p>
                </div>
              </div>

              <div className="flex items-start gap-4 pt-1">
                {household.headPhotoUrl ? (
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                    <img
                      src={household.headPhotoUrl}
                      alt={fullName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-100 text-slate-600 font-bold flex items-center justify-center shrink-0 border border-slate-200 text-lg">
                    {household.headFirstName?.[0]}{household.headLastName?.[0]}
                  </div>
                )}

                <div className="space-y-1">
                  <div className="text-base font-extrabold text-slate-900">{fullName}</div>
                  <div className="text-xs text-slate-500 font-medium">
                    Gender: {household.headGender || 'MALE'}
                    {household.headMaritalStatus ? ` • ${household.headMaritalStatus}` : ''}
                  </div>
                  {household.headEmploymentStatus && (
                    <div className="text-xs text-slate-500">
                      Occupation: {household.headEmploymentStatus}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 space-y-3 border-t border-slate-100">
                {/* NIN */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">National Identity (NIN):</span>
                  <span className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                    {maskedNin || 'Verified'}
                    {household.headNinVerified ? (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-semibold border border-emerald-200">
                        NIMC Verified
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        On File
                      </span>
                    )}
                  </span>
                </div>

                {/* Phone */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    Phone Number:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">
                      {household.headPhone || 'N/A'}
                    </span>
                    {household.headPhoneVerified ? (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold border border-emerald-200">
                        ✓ Validated via OTP
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold border border-amber-200">
                        Not Validated
                      </span>
                    )}
                  </div>
                </div>

                {/* Occupancy */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    Household Residents:
                  </span>
                  <span className="font-bold text-slate-900">
                    {household.totalHouseholdMembers || 1} Occupants
                    <span className="text-slate-400 font-normal ml-1">
                      ({household.wivesCount} Wives, {household.childrenCount} Children)
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Physical Location & Spatial Coordinates */}
            <div className="border border-slate-200 rounded-2xl p-6 bg-white shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800">
                  <MapPin className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Dwelling Spatial Location
                  </h2>
                  <p className="text-xs text-slate-400">Physical Address & Administrative Boundaries</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                {/* Physical Address */}
                <div>
                  <span className="text-slate-400 font-medium uppercase text-[10px] block">
                    Full Physical Address
                  </span>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {household.address || 'Address registered on file'}
                  </div>
                </div>

                {/* Administrative Boundary */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 font-medium text-[10px] uppercase block">State / LGA</span>
                    <span className="font-bold text-slate-900">{household.state} • {household.lga}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium text-[10px] uppercase block">Ward</span>
                    <span className="font-bold text-slate-900">{household.ward}</span>
                  </div>
                </div>

                {/* Polling Unit */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-400 font-medium text-[10px] uppercase block">Polling Unit</span>
                  <span className="font-semibold text-slate-900">
                    {formatPollingUnit(household.pollingUnit)}
                  </span>
                </div>

                {/* GPS Coordinates */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 font-medium text-[10px] uppercase block">
                      GPS Georeference
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {household.latitude && household.longitude
                        ? `${household.latitude.toFixed(6)}, ${household.longitude.toFixed(6)}`
                        : 'Georeferenced on capture'}
                    </span>
                  </div>
                  {googleMapsUrl && (
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200"
                    >
                      Maps <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Energy & Connectivity Profile Card */}
          <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/70 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-800">
                <Zap className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Energy & Productive Use of Power (PUE) Profile
                </h2>
                <p className="text-xs text-slate-400">Electrification and productive capacity</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-semibold uppercase text-[10px] block">
                  Primary Energy Source
                </span>
                <span className="text-sm font-bold text-slate-900 mt-1 block">
                  {household.primaryEnergySource || 'Grid / Standalone Solar / None'}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-semibold uppercase text-[10px] block">
                  PUE Business Status
                </span>
                <span className="text-sm font-bold text-slate-900 mt-1 block">
                  {household.hasPUE ? (
                    <span className="text-emerald-700">Active Productive Activity</span>
                  ) : (
                    <span className="text-slate-600">Residential Dwelling</span>
                  )}
                </span>
                {household.pueType && (
                  <span className="text-[11px] text-slate-500 block mt-0.5 font-medium">
                    Type: {household.pueType}
                  </span>
                )}
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-semibold uppercase text-[10px] block">
                  Telco & Connectivity
                </span>
                <span className="text-sm font-bold text-slate-900 mt-1 block">
                  {household.telcoProviders?.length > 0
                    ? household.telcoProviders.join(', ')
                    : 'GSM Active'}
                </span>
                {household.networkType && (
                  <span className="text-[11px] text-slate-500 block mt-0.5 font-medium">
                    Network: {household.networkType}
                  </span>
                )}
              </div>
            </div>

            {household.pueEquipment && household.pueEquipment.length > 0 && (
              <div className="text-xs bg-white p-3.5 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-semibold uppercase text-[10px] block">
                  Productive Equipment on Site
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {household.pueEquipment.map((eq: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-medium text-[11px] border border-slate-200"
                    >
                      {eq}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* House Front Exterior Photo (if captured) */}
          {household.houseFrontPhotoUrl && (
            <div className="border border-slate-200 rounded-2xl p-6 bg-white space-y-3">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Dwelling Photographic Verification
              </span>
              <div className="relative h-64 sm:h-72 w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                <img
                  src={household.houseFrontPhotoUrl}
                  alt="Dwelling Exterior"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Audit Verification Footer */}
          <div className="border-t border-slate-200 pt-6 text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#081B33]">
              <ShieldCheck className="w-4 h-4 text-[#C5A059]" />
              <span>Cryptographically Secured National Dwelling Registry Record</span>
            </div>
            <p className="text-xs text-slate-500 max-w-xl mx-auto leading-relaxed">
              This digital record is issued by the Centre for Climate-Smart Agriculture (CCSA) at
              Cosmopolitan University Abuja in partnership with AgroMoney. Tampering or unauthorized
              reproduction is prohibited under federal data integrity and registration guidelines.
            </p>
            <div className="text-[11px] text-slate-400 font-mono pt-1">
              Ref ID: {household.id} • Registered: {new Date(household.createdAt).toISOString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

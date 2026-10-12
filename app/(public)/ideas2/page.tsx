'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TraineeData {
  id: string;
  firstName: string;
  lastName: string;
  nin: string;
  bvn: string | null;
  phone: string;
  email: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  state: string | null;
  lga: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
  cluster: string;
  enrolledAt: string;
}

// ─── Admission Letter Component (printable) ───────────────────────────────────

function AdmissionLetter({ data }: { data: TraineeData }) {
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const enrollDate = new Date(data.enrolledAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const fullName = `${data.firstName} ${data.lastName}`.toUpperCase();

  return (
    <div id="admission-letter" className="bg-white text-gray-900" style={{ fontFamily: 'Georgia, serif', maxWidth: '210mm', margin: '0 auto', padding: '20mm 20mm', minHeight: '297mm' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', borderBottom: '3px solid #013358', paddingBottom: '12px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
          <div style={{ fontSize: '11px', textAlign: 'left', maxWidth: '200px' }}>
            <div style={{ fontWeight: 'bold', color: '#013358' }}>THE FEDERAL MINISTRY OF EDUCATION</div>
            <div style={{ color: '#444' }}>& THE WORLD BANK</div>
            <div style={{ color: '#013358', marginTop: '2px' }}>IDEAS-TVET INITIATIVE</div>
          </div>
          <div style={{ width: '60px', height: '60px', backgroundColor: '#013358', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', textAlign: 'center', fontWeight: 'bold', lineHeight: '1.2', padding: '4px' }}>
            CCSA<br />COSMO
          </div>
          <div style={{ fontSize: '11px', textAlign: 'right', maxWidth: '200px' }}>
            <div style={{ fontWeight: 'bold', color: '#013358' }}>CENTRE FOR CLIMATE-SMART AGRICULTURE</div>
            <div style={{ color: '#444' }}>Cosmopolitan University Abuja</div>
            <div style={{ color: '#666', fontSize: '10px' }}>admin@cosmopolitan.edu.ng</div>
          </div>
        </div>
        <div style={{ fontSize: '8px', color: '#666', marginTop: '4px' }}>
          Technical & Vocational Education and Training (TVET) Programme
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', margin: '16px 0' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#013358', letterSpacing: '1px' }}>
          ADMISSION / ENROLMENT LETTER
        </div>
        <div style={{ fontSize: '13px', color: '#444', marginTop: '4px' }}>
          Climate-Smart Agriculture Training (Crop Production)
        </div>
      </div>

      {/* Date & Reference */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '12px' }}>
        <div><span style={{ fontWeight: 'bold' }}>Date:</span> {today}</div>
        <div><span style={{ fontWeight: 'bold' }}>Ref No:</span> CCSA/IDEAS2/{data.id.slice(-8).toUpperCase()}</div>
      </div>

      {/* Salutation */}
      <div style={{ marginBottom: '12px', fontSize: '12px' }}>
        <p>Dear <strong>{fullName}</strong>,</p>
      </div>

      {/* Body */}
      <div style={{ fontSize: '12px', lineHeight: '1.8', marginBottom: '16px' }}>
        <p>
          We are pleased to inform you that following a review of your application, you have been <strong>successfully enrolled</strong> in the <strong>IDEAS-TVET Initiative</strong> under the programme listed below:
        </p>
      </div>

      {/* Programme Box */}
      <div style={{ border: '2px solid #013358', borderRadius: '6px', padding: '12px 16px', marginBottom: '16px', backgroundColor: '#f0f6ff' }}>
        <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ fontWeight: 'bold', width: '40%', paddingBottom: '6px', color: '#013358' }}>Programme:</td>
              <td style={{ paddingBottom: '6px' }}>Climate-Smart Agriculture Training (Crop Production)</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold', paddingBottom: '6px', color: '#013358' }}>Training Provider:</td>
              <td style={{ paddingBottom: '6px' }}>Centre for Climate-Smart Agriculture, Cosmopolitan University Abuja</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold', paddingBottom: '6px', color: '#013358' }}>Cluster:</td>
              <td style={{ paddingBottom: '6px' }}>{data.cluster}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold', paddingBottom: '6px', color: '#013358' }}>Initiative:</td>
              <td style={{ paddingBottom: '6px' }}>IDEAS-TVET (World Bank / Federal Ministry of Education)</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold', color: '#013358' }}>Enrolment Date:</td>
              <td>{enrollDate}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Trainee Details */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#013358', borderBottom: '1px solid #013358', paddingBottom: '4px', marginBottom: '10px' }}>
          TRAINEE PARTICULARS
        </div>
        <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse' }}>
          <tbody>
            <tr style={{ backgroundColor: '#f8fafc' }}>
              <td style={{ padding: '5px 8px', fontWeight: 'bold', width: '35%', border: '1px solid #e2e8f0' }}>Full Name</td>
              <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0' }}>{fullName}</td>
              <td style={{ padding: '5px 8px', fontWeight: 'bold', width: '20%', border: '1px solid #e2e8f0' }}>Gender</td>
              <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0' }}>{data.gender || '—'}</td>
            </tr>
            <tr>
              <td style={{ padding: '5px 8px', fontWeight: 'bold', border: '1px solid #e2e8f0' }}>Phone Number</td>
              <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0' }}>{data.phone}</td>
              <td style={{ padding: '5px 8px', fontWeight: 'bold', border: '1px solid #e2e8f0' }}>Date of Birth</td>
              <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0' }}>{data.dateOfBirth ? new Date(data.dateOfBirth).toLocaleDateString('en-GB') : '—'}</td>
            </tr>
            <tr style={{ backgroundColor: '#f8fafc' }}>
              <td style={{ padding: '5px 8px', fontWeight: 'bold', border: '1px solid #e2e8f0' }}>NIN</td>
              <td style={{ padding: '5px 8px', fontFamily: 'monospace', border: '1px solid #e2e8f0' }}>{data.nin.startsWith('IDEAS2-') ? 'Pending' : data.nin}</td>
              <td style={{ padding: '5px 8px', fontWeight: 'bold', border: '1px solid #e2e8f0' }}>State</td>
              <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0' }}>{data.state || '—'}</td>
            </tr>
            <tr>
              <td style={{ padding: '5px 8px', fontWeight: 'bold', border: '1px solid #e2e8f0' }}>BVN</td>
              <td style={{ padding: '5px 8px', fontFamily: 'monospace', border: '1px solid #e2e8f0' }}>{data.bvn || '—'}</td>
              <td style={{ padding: '5px 8px', fontWeight: 'bold', border: '1px solid #e2e8f0' }}>LGA</td>
              <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0' }}>{data.lga || '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bank Details */}
      {(data.bankName || data.accountNumber) && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#013358', borderBottom: '1px solid #013358', paddingBottom: '4px', marginBottom: '10px' }}>
            BANK ACCOUNT DETAILS (For Stipend / Allowance Disbursement)
          </div>
          <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <td style={{ padding: '5px 8px', fontWeight: 'bold', width: '33%', border: '1px solid #e2e8f0' }}>Bank Name</td>
                <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0' }}>{data.bankName || '—'}</td>
              </tr>
              <tr>
                <td style={{ padding: '5px 8px', fontWeight: 'bold', border: '1px solid #e2e8f0' }}>Account Number</td>
                <td style={{ padding: '5px 8px', fontFamily: 'monospace', border: '1px solid #e2e8f0' }}>{data.accountNumber || '—'}</td>
              </tr>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <td style={{ padding: '5px 8px', fontWeight: 'bold', border: '1px solid #e2e8f0' }}>Account Name</td>
                <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0' }}>{data.accountName || '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Body text */}
      <div style={{ fontSize: '12px', lineHeight: '1.8', marginBottom: '16px' }}>
        <p>
          You are expected to actively participate in all scheduled training sessions, field activities, and assessments. Attendance is compulsory. Any trainee who drops out without formal notification will forfeit their enrolment benefits.
        </p>
        <p style={{ marginTop: '8px' }}>
          This letter serves as your official proof of enrolment and should be retained for your records. Kindly present it when required at any programme-related event or assessment.
        </p>
        <p style={{ marginTop: '8px' }}>
          We wish you a productive and rewarding training experience.
        </p>
      </div>

      {/* Signatures */}
      <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ borderTop: '1px solid #666', paddingTop: '6px' }}>
            <div style={{ fontWeight: 'bold' }}>Programme Coordinator</div>
            <div style={{ color: '#666' }}>Centre for Climate-Smart Agriculture</div>
            <div style={{ color: '#666' }}>Cosmopolitan University Abuja</div>
          </div>
        </div>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ borderTop: '1px solid #666', paddingTop: '6px' }}>
            <div style={{ fontWeight: 'bold' }}>IDEAS-TVET Programme Officer</div>
            <div style={{ color: '#666' }}>Federal Ministry of Education</div>
            <div style={{ color: '#666' }}>Abuja, Nigeria</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '32px', paddingTop: '10px', borderTop: '2px solid #013358', fontSize: '10px', color: '#666', textAlign: 'center' }}>
        <p>This is a computer-generated letter. Verify authenticity at <strong>fims.cosmopolitan.edu.ng/ideas2</strong></p>
        <p style={{ marginTop: '2px' }}>Centre for Climate-Smart Agriculture · Cosmopolitan University Abuja · admin@cosmopolitan.edu.ng</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function IDEAS2LetterPage() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trainee, setTrainee] = useState<TraineeData | null>(null);
  const letterRef = useRef<HTMLDivElement>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setLoading(true);
    setError('');
    setTrainee(null);

    try {
      const res = await fetch('/api/ideas2/letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lookup failed');
      setTrainee(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Print-only: show just the letter */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #print-target { display: block !important; }
          #print-target { position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>

      {/* Screen UI */}
      <div className="min-h-screen bg-linear-to-br from-blue-950 via-[#013358] to-blue-800 py-12 px-4 print:hidden">
        <div className="max-w-xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-white/10 mb-4">
              <span className="text-white text-3xl font-bold">🌱</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">IDEAS-TVET Admission Letter</h1>
            <p className="mt-2 text-blue-200 text-sm">
              Climate-Smart Agriculture Training (Crop Production)<br />
              Centre for Climate-Smart Agriculture · Cosmopolitan University Abuja
            </p>
            <div className="mt-3 inline-block bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              🔒 IDEAS Cluster Members Only
            </div>
          </div>

          {/* Lookup Card */}
          {!trainee && (
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Download Your Letter</h2>
              <p className="text-sm text-gray-500 mb-6">
                Enter your NIN or the phone number you registered with. Access is restricted to enrolled IDEAS programme trainees.
              </p>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg">
                  <strong>Not found:</strong> {error}
                </div>
              )}

              <form onSubmit={handleLookup} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    NIN or Phone Number
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. 12345678901 or 08012345678"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <p className="mt-1.5 text-xs text-gray-400">
                    Your NIN is 11 digits. Your phone number should be in the format 0801234567 8.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !identifier.trim()}
                  className="w-full bg-[#013358] hover:bg-blue-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Verifying...
                    </span>
                  ) : (
                    '🔍 Retrieve My Letter'
                  )}
                </button>
              </form>

              <p className="mt-6 text-xs text-gray-400 text-center">
                ⚠️ This portal is exclusively for trainees enrolled under the IDEAS-TVET programme. Unauthorised access attempts are logged.
              </p>
            </div>
          )}

          {/* Success: show download option */}
          {trainee && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl shadow-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-green-600 text-lg">✓</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Verified Successfully</h3>
                    <p className="text-sm text-gray-500">{trainee.firstName} {trainee.lastName} · {trainee.cluster}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handlePrint}
                    className="flex-1 bg-[#013358] hover:bg-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-sm"
                  >
                    🖨️ Print / Save as PDF
                  </button>
                  <button
                    onClick={() => setTrainee(null)}
                    className="px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                  >
                    ← Back
                  </button>
                </div>

                <p className="mt-3 text-xs text-gray-400 text-center">
                  Use your browser's Print function → Save as PDF to download.
                </p>
              </div>

              {/* Preview */}
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden scale-[0.85] origin-top -mb-16">
                <div className="p-2 bg-gray-100 border-b flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-400" />
                  <div className="h-2 w-2 rounded-full bg-yellow-400" />
                  <div className="h-2 w-2 rounded-full bg-green-400" />
                  <span className="ml-2 text-xs text-gray-500">Admission Letter Preview</span>
                </div>
                <AdmissionLetter data={trainee} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Print target — full letter, hidden on screen */}
      <div id="print-target" style={{ display: 'none' }}>
        {trainee && <AdmissionLetter data={trainee} />}
      </div>
    </>
  );
}

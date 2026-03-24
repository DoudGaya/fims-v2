import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'FIMS — Farmer Information Management System | CCSA',
  description:
    'The CCSA Farmer Information Management System (FIMS) captures the most accurate farmer and farm data in Nigeria using advanced geospatial technology and rigorous field verification.',
};

const stats = [
  { label: 'Registered Farmers', value: '50,000+' },
  { label: 'Farm Plots Captured', value: '70,000+' },
  { label: 'States Covered', value: '36' },
  { label: 'Data Accuracy Rate', value: '99.2%' },
];

const features = [
  {
    title: 'GPS Farm Boundary Mapping',
    description:
      'Every farm plot is demarcated using sub-metre GPS coordinates collected by trained field agents, producing precise polygon boundaries rather than estimated acreage.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
      </svg>
    ),
  },
  {
    title: 'Satellite Imagery Verification',
    description:
      'Captured farm boundaries are cross-validated against high-resolution satellite imagery to detect outliers, duplicate registrations, and boundary errors before data is committed.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
  },
  {
    title: 'Biometric Identity Verification',
    description:
      'Each farmer is enrolled with NIN and BVN identity checks, eliminating ghost farmers and ensuring one-farmer-one-record integrity across all programme clusters.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0 1 19.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 0 0 4.5 10.5a7.464 7.464 0 0 1-1.15 3.993m1.989 3.559A11.209 11.209 0 0 0 8.25 10.5a3.75 3.75 0 1 1 7.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 0 1-3.6 9.75m6.633-4.596a18.666 18.666 0 0 1-2.485 5.33" />
      </svg>
    ),
  },
  {
    title: 'Multi-Stage Field Validation',
    description:
      'Data passes through agent capture, cluster supervisor review, and state-level validation before receiving Verified status — creating an auditable, multi-party approval chain.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
      </svg>
    ),
  },
  {
    title: 'Real-Time GIS Dashboard',
    description:
      'All registered farms are rendered on an interactive GIS layer, allowing programme managers to visualise spatial distribution, identify coverage gaps, and monitor registration progress.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
      </svg>
    ),
  },
  {
    title: 'Open, Auditable API',
    description:
      'Verified data is made available to government agencies, research institutions, and development partners through a scoped, token-based REST API with comprehensive usage logging.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
      </svg>
    ),
  },
];

const dataScopes = [
  {
    scope: 'Farmer Registry',
    description: 'Names, demographics, location, and registration status for enrolled farmers.',
    endpoint: '/api/v1/farmers',
  },
  {
    scope: 'Farm Plots',
    description: 'Crop type, farm size, season, and geolocation metadata for captured farms.',
    endpoint: '/api/v1/farms',
  },
  {
    scope: 'Cluster Data',
    description: 'Organisational units grouping farmers by geography and programme cluster.',
    endpoint: '/api/v1/clusters',
  },
  {
    scope: 'Aggregated Analytics',
    description: 'Statistical summaries: totals, breakdowns by state/crop/status, growth trends.',
    endpoint: '/api/v1/analytics',
  },
];

export default function FimsLandingPage() {
  return (
    <div className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#013358]">
        {/* Deep navy → teal diagonal gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#013358] via-[#014a7a] to-[#016a8a] pointer-events-none" />

        {/* Radial glow — top-right */}
        <div className="absolute -top-24 -right-24 h-[520px] w-[520px] rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />
        {/* Radial glow — bottom-left */}
        <div className="absolute -bottom-16 -left-16 h-[380px] w-[380px] rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />

        {/* Subtle dot-grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 bg-white/10 text-blue-100 text-sm font-medium mb-6 backdrop-blur-sm">
              <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
              Live — API v1.0
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white mb-6">
              Nigeria&apos;s most accurate{' '}
              <span className="text-teal-300">
                farmer data platform
              </span>
            </h1>

            <p className="text-lg md:text-xl text-blue-100 leading-relaxed mb-8 max-w-2xl">
              FIMS is the Centre for Climate Smart Agriculture&apos;s (CCSA's) flagship farmer
              information platform: Combining GPS farm mapping, biometric identity
              verification, and multi-stage field validation to produce uniquely
              reliable agricultural data.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/access"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#013358] font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-md"
              >
                Request API Access
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-semibold rounded-lg border border-white/20 hover:bg-white/20 transition-colors backdrop-blur-sm"
              >
                View API Docs
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats band ───────────────────────────────────────────── */}
      <section className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map(({ label, value }) => (
              <div key={label} className="text-center">
                <dt className="text-3xl font-bold text-[#013358] dark:text-blue-300">{value}</dt>
                <dd className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── About FIMS ───────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Built for programme integrity
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              FIMS was purpose-built by the Centre for Climate Smart Agriculture at
              Cosmopolitan University Abuja to address the systemic data quality
              failures that plague agricultural intervention programmes in Nigeria:
              duplicate beneficiaries, ghost farmers, and inaccurate land sizes.
            </p>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              Every record in FIMS goes through agent capture → supervisor
              verification → state validation before it can advance to &apos;Verified&apos;
              status. This creates genuine accountability at every level of the data
              collection pipeline.
            </p>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              The result is a registry that government agencies, NGOs, and development
              finance institutions can trust for beneficiary targeting, subsidy
              disbursement, and impact measurement.
            </p>
          </div>
          <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-8">
            <div className="space-y-4">
              {['Agent Field Capture', 'Biometric Identity Check', 'GPS Farm Boundary', 'Supervisor Verification', 'State Validation', 'Verified Record'].map((step, i) => (
                <div key={step} className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${i === 5 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-[#013358]/10 text-[#013358] dark:bg-blue-900/30 dark:text-blue-300'}`}>
                    {i === 5 ? '✓' : i + 1}
                  </div>
                  <span className={`text-sm ${i === 5 ? 'font-semibold text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>{step}</span>
                  {i < 5 && <div className="ml-4 h-px flex-1 bg-gray-200 dark:bg-gray-700" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Geospatial Technology ────────────────────────────────── */}
      <section className="bg-[#013358] dark:bg-[#01264a] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <h2 className="text-3xl font-bold mb-4">Advanced geospatial data collection</h2>
            <p className="text-blue-100 leading-relaxed">
              FIMS combines field-grade GPS hardware, satellite imagery cross-validation,
              and GIS analytics to produce farm boundary data with precision unavailable
              from any other agricultural registry in Nigeria.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ title, description, icon }) => (
              <div
                key={title}
                className="rounded-xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition-colors"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-blue-200 mb-4">
                  {icon}
                </div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-blue-100 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── API Data Overview ────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            What data is available via the API?
          </h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-xl mx-auto">
            Approved partners receive scoped, token-based access to the datasets
            below. Sensitive identity and financial fields are redacted by default.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-12">
          {dataScopes.map(({ scope, description, endpoint }) => (
            <div
              key={scope}
              className="rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:border-[#013358]/30 dark:hover:border-blue-500/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">{scope}</h3>
                <code className="text-xs bg-gray-100 dark:bg-gray-800 text-[#013358] dark:text-blue-300 px-2 py-0.5 rounded font-mono shrink-0">
                  {endpoint}
                </code>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 text-sm text-gray-600 dark:text-gray-400">
          <span className="font-semibold text-gray-900 dark:text-white">Privacy note: </span>
          All API responses include a <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">meta.redactedGroups</code> field
          listing which PII groups are withheld. Identity (NIN), financial (BVN, bank details),
          and contact (phone, email) fields are never exposed to third-party tokens.
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to integrate with FIMS data?
          </h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-lg mx-auto mb-8">
            Submit a short access request and our team will review your use case. Approved
            partners receive a scoped API token within 2–3 business days.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/access"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#013358] text-white font-semibold rounded-lg hover:bg-[#01264a] transition-colors shadow-sm"
            >
              Request API Access
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
            >
              Read the Docs
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

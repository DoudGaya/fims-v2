import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  Handshake,
  Landmark,
  MapPinned,
  ShieldCheck,
  Sprout,
  Truck,
  Users,
} from 'lucide-react';
import { agribusinessInterestAreas, stakeholderTypes } from '@/lib/brand';

const benefits = [
  {
    title: 'Verified farmer intelligence',
    description: 'Plan programmes using farmer cohorts, crops, states, LGAs, clusters, and farm records captured through FIMS.',
    icon: Users,
  },
  {
    title: 'Targeted market access',
    description: 'Connect off-takers, processors, and aggregators to the right production communities.',
    icon: Handshake,
  },
  {
    title: 'KYB-backed partnerships',
    description: 'Onboard organisations with structured business data, compliance review, and auditable approvals.',
    icon: ShieldCheck,
  },
  {
    title: 'Outreach roadmap',
    description: 'Move from interest to activation with campaigns, surveys, field-agent assignments, and measurable results.',
    icon: MapPinned,
  },
];

const stakeholderCards = [
  { title: 'Input Suppliers', icon: Sprout, text: 'Reach crop-specific farmer groups for seed, fertilizer, and advisory programmes.' },
  { title: 'Financial Institutions', icon: Landmark, text: 'Design farmer finance and insurance products using verified agricultural profiles.' },
  { title: 'Processors & Off-takers', icon: Building2, text: 'Discover supply corridors and build structured procurement partnerships.' },
  { title: 'Logistics Partners', icon: Truck, text: 'Plan aggregation, movement, and storage around farmer distribution and crop demand.' },
];

export const metadata = {
  title: 'Agri-Business Partnerships | CCSA FIMS',
  description: 'Partner with CCSA through FIMS to connect with verified farmer cohorts and agri-entrepreneurship opportunities.',
};

export default function AgriBusinessLandingPage() {
  return (
    <div className="bg-white text-[#1E293B] dark:bg-gray-950 dark:text-gray-100">
      <section className="relative overflow-hidden brand-gradient-dark">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(220,234,243,0.22),transparent_35%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-semibold text-[#DCEAF3] backdrop-blur">
              <BadgeCheck className="h-4 w-4" />
              CCSA Agri-Business & Agri-Entrepreneurship
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-normal text-white md:text-6xl">
              Partner with CCSA through verified FIMS farmer intelligence.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#DCEAF3]">
              FIMS is being extended into an agri-business platform where verified stakeholders can
              complete KYB, declare areas of interest, apply for programmes, sign partnership
              agreements, and connect with over 60,000 farmers through CCSA-approved pathways.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/agribusiness/apply"
                className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-bold text-[#013358] shadow-sm transition hover:bg-[#F3F8FC]"
              >
                Apply as a Partner
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/fims"
                className="inline-flex items-center gap-2 rounded-md border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15"
              >
                View FIMS Results
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#E5E7EB] bg-[#F8FAFC] dark:border-gray-800 dark:bg-gray-900/40">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-8 sm:px-6 md:grid-cols-4 lg:px-8">
          {[
            ['60,000+', 'Farmers and records'],
            ['GIS', 'Farm intelligence'],
            ['KYB', 'Partner verification'],
            ['360', 'Outreach and reporting'],
          ].map(([value, label]) => (
            <div key={label} className="rounded-lg border border-[#DCEAF3] bg-white p-5 shadow-sm dark:bg-card">
              <div className="text-3xl font-bold text-[#013358] dark:text-[#DCEAF3]">{value}</div>
              <div className="mt-1 text-sm font-medium text-[#475569] dark:text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-wide text-[#02426F]">Mandate alignment</p>
          <h2 className="mt-2 text-3xl font-bold text-[#1E293B] dark:text-white">
            Built for agri-entrepreneurship, market access, and farmer productivity.
          </h2>
          <p className="mt-4 text-base leading-7 text-[#475569] dark:text-gray-300">
            The hub supports the CCSA mandate by turning verified farmer data into practical
            partnerships: training, finance, insurance, input access, off-take, value-chain
            development, digital agriculture, and climate-smart advisory.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {benefits.map(({ title, description, icon: Icon }) => (
            <div key={title} className="rounded-lg border border-[#DCEAF3] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-card">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-md bg-[#F3F8FC] text-[#013358]">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-[#1E293B] dark:text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#475569] dark:text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#F8FAFC] dark:bg-gray-900/40">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-[#02426F]">Who can participate?</p>
            <h2 className="mt-2 text-3xl font-bold">A structured front door for agricultural stakeholders.</h2>
            <p className="mt-4 leading-7 text-[#475569] dark:text-gray-300">
              Stakeholders can register their organisation, submit KYB details, choose value-chain
              interests, and request a partnership pathway with CCSA.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {stakeholderTypes.slice(0, 10).map((type) => (
                <span key={type} className="rounded-full border border-[#DCEAF3] bg-white px-3 py-1 text-xs font-semibold text-[#013358] dark:bg-card">
                  {type}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {stakeholderCards.map(({ title, icon: Icon, text }) => (
              <div key={title} className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-[#DCEAF3] dark:bg-card">
                <Icon className="h-6 w-6 text-[#02426F]" />
                <h3 className="mt-4 font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#475569] dark:text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-[#DCEAF3] bg-white p-6 shadow-sm md:p-8 dark:bg-card">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[#02426F]">
                <BarChart3 className="h-4 w-4" />
                Interest areas
              </div>
              <h2 className="mt-2 text-2xl font-bold">Capture what each partner wants to do, then match them to the right FIMS opportunity.</h2>
            </div>
            <Link href="/agribusiness/apply" className="inline-flex shrink-0 items-center justify-center rounded-md bg-[#013358] px-5 py-3 text-sm font-bold text-white hover:bg-[#02426F]">
              Start Application
            </Link>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {agribusinessInterestAreas.map((interest) => (
              <div key={interest} className="rounded-md bg-[#F3F8FC] px-3 py-2 text-sm font-semibold text-[#013358]">
                {interest}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

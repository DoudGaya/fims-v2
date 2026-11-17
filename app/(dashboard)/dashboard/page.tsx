'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { usePermissions } from '@/components/PermissionProvider';
import { PERMISSIONS } from '@/lib/permissions';
import { getFirstAvailableRoute } from '@/lib/redirectHelper';
import { PageLoader } from '@/components/ui/loading-spinner';
import {
  UsersIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  GlobeAltIcon,
  ArrowRightIcon,
  HomeIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';

import {
  RegistrationEstimatorChart,
  GenderDistributionChart,
  ClusterPerformanceChart,
  CropsStatesInteractiveChart
} from "@/components/dashboard/dashboard-charts"
import { StatsCard, GoalProgress } from "@/components/dashboard/dashboard-summary"
import { Button } from "@/components/ui/button"

type DashboardAnalytics = {
  overview: {
    totalFarmers: number;
    totalAgents: number;
    totalClusters: number;
    totalHectares: number;
    totalHouseholds?: number;
    totalHouseholdMembers?: number;
    totalChildren?: number;
    totalCommercialCustomers?: number;
    pueAdopters?: number;
    recentHouseholds?: number;
  };
  households?: {
    total: number;
    totalMembers: number;
    totalChildren: number;
    commercialCustomers: number;
    pueAdopters: number;
    recent: number;
    byState?: { state: string; count: number }[];
  };
  geography?: {
    byState?: { state: string; count: number }[];
  };
  demographics?: {
    byGender?: { gender: string; count: number }[];
  };
  clusters?: {
    byClusters?: { clusterTitle: string; farmersCount: number }[];
  };
  trends?: {
    monthly?: { month: string; count: number }[];
  };
  crops?: {
    topCrops?: { crop: string; count: number }[];
  };
};

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading' || permissionsLoading) return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    // Check dashboard access permission
    if (!hasPermission(PERMISSIONS.DASHBOARD_ACCESS)) {
      // Redirect to first available route instead of signin
      const firstAvailableRoute = getFirstAvailableRoute(hasPermission);
      if (firstAvailableRoute.startsWith('/auth/signin')) {
        signOut({ callbackUrl: firstAvailableRoute });
      } else {
        router.push(firstAvailableRoute);
      }
      return;
    }

    fetchDashboardAnalytics();
  }, [session, status, permissionsLoading, hasPermission, router]);

  const fetchDashboardAnalytics = async () => {
    try {
      const response = await fetch('/api/dashboard/analytics');

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else {
        console.error(
          'Analytics API error:',
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num?.toLocaleString() || 0;
  };

  if (status === 'loading' || permissionsLoading || loading) {
    return <PageLoader />;
  }

  if (!session) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Please sign in to view dashboard.</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-600">
          Failed to load analytics data. Please refresh the page.
        </div>
      </div>
    );
  }

  const { overview, geography, demographics, clusters, trends, crops } = analytics;
  const firstName = session.user?.name?.split(' ')[0] || 'User';

  return (
    <div className="space-y-6 pb-6">
      <section className="overflow-hidden rounded-lg border border-[#DCEAF3] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        <div className="brand-gradient-dark p-6 text-white lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#DCEAF3]">CCSA FIMS Command Centre</p>
              <h1 className="mt-3 text-3xl font-bold tracking-normal lg:text-4xl">
                Welcome back, {firstName}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#DCEAF3]">
                Monitor farmer records, field agents, clusters, farms, and stakeholder growth from one operational view.
              </p>
            </div>
            <div className="rounded-md border border-white/15 bg-white/10 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#DCEAF3]">2026 Mandate</p>
              <p className="mt-1 text-2xl font-bold">2,000,000 farmers</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-3 lg:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
            <StatsCard
              title="Farmers"
              value={formatNumber(overview.totalFarmers)}
              icon={UsersIcon}
              description="Registered farmers"
              trendUp={true}
            />
            <StatsCard
              title="Households"
              value={formatNumber(overview.totalHouseholds || 0)}
              icon={HomeIcon}
              description={`${formatNumber(overview.totalHouseholdMembers || 0)} residents enrolled`}
              trendUp={true}
            />
            <StatsCard
              title="Agents"
              value={formatNumber(overview.totalAgents)}
              icon={UserGroupIcon}
              description="Field & household agents"
            />
            <StatsCard
              title="PUE Adopters"
              value={formatNumber(overview.pueAdopters || 0)}
              icon={BoltIcon}
              description="Productive energy users"
            />
            <StatsCard
              title="Clusters"
              value={formatNumber(overview.totalClusters)}
              icon={BuildingOfficeIcon}
              description="Farming clusters"
            />
            <StatsCard
              title="Land Coverage"
              value={formatNumber(overview.totalHectares)}
              icon={GlobeAltIcon}
              description="Total hectares"
            />
          </div>

          <GoalProgress
            current={overview.totalFarmers}
            target={2000000}
            title="2026 Target"
            subtext="2 Million Farmers"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="col-span-1 lg:col-span-2">
          <RegistrationEstimatorChart trends={trends?.monthly} />
        </div>
        <div className="col-span-1 lg:col-span-2 h-full">
          <CropsStatesInteractiveChart
            cropsData={crops?.topCrops}
            statesData={geography?.byState}
          />
        </div>

        {/* Row 2: Gender and Cluster Charts (Side by Side) */}
        <div className="col-span-1 lg:col-span-2">
          <GenderDistributionChart data={demographics?.byGender} />
        </div>
        <div className="col-span-1 lg:col-span-2">
          <ClusterPerformanceChart data={clusters?.byClusters} />
        </div>
      </div>

      {/* Household & Rural Interventions Spotlight */}
      <section className="overflow-hidden rounded-lg border border-[#DCEAF3] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        <div className="border-b border-[#E5E7EB] dark:border-gray-700 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
              <HomeIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1E293B] dark:text-gray-100 flex items-center gap-2">
                Household Interventions &amp; Clean Energy
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300">
                  Active
                </span>
              </h3>
              <p className="text-sm text-[#64748B] dark:text-gray-400">
                Dwelling capture, resident tracking, and productive use of energy (PUE) adoption across rural communities.
              </p>
            </div>
          </div>
          <Button
            onClick={() => router.push('/households')}
            variant="outline"
            size="sm"
            className="border-teal-200 text-teal-800 hover:bg-teal-50 dark:border-teal-800 dark:text-teal-300 self-start sm:self-auto gap-1.5"
          >
            <span>View All Households</span>
            <ArrowRightIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-[#F8FAFC]/60 dark:bg-gray-800/40">
          <div className="rounded-lg border border-teal-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-gray-400">Enrolled Households</span>
            <div className="text-2xl font-bold text-teal-700 dark:text-teal-300 mt-1">
              {formatNumber(overview.totalHouseholds || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Verified dwelling slips</p>
          </div>

          <div className="rounded-lg border border-blue-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-gray-400">Community Residents</span>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
              {formatNumber(overview.totalHouseholdMembers || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatNumber(overview.totalChildren || 0)} children registered
            </p>
          </div>

          <div className="rounded-lg border border-amber-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-gray-400">PUE Adopters</span>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">
              {formatNumber(overview.pueAdopters || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Productive clean power</p>
          </div>

          <div className="rounded-lg border border-indigo-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-gray-400">Commercial Clients</span>
            <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-400 mt-1">
              {formatNumber(overview.totalCommercialCustomers || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Local micro-enterprises</p>
          </div>
        </div>
      </section>

      <div className="rounded-lg border border-[#DCEAF3] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm dark:bg-card">
        <div className="border-b border-[#E5E7EB] px-6 py-4">
          <h3 className="text-lg font-bold text-[#1E293B] dark:text-gray-100">Quick Actions</h3>
          <p className="mt-1 text-sm text-[#64748B] dark:text-gray-400">Jump into the workflows used most often by FIMS teams.</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Button onClick={() => router.push('/agents/new')} className="justify-between">
              <span className="inline-flex items-center">
              <UserGroupIcon className="h-4 w-4 mr-2" />
              Create New Agent
              </span>
              <ArrowRightIcon className="h-4 w-4" />
            </Button>
            <Button onClick={() => router.push('/farmers')} variant="outline" className="justify-between">
              <span className="inline-flex items-center">
              <UsersIcon className="h-4 w-4 mr-2" />
              View All Farmers
              </span>
              <ArrowRightIcon className="h-4 w-4" />
            </Button>
            <Button onClick={() => router.push('/households')} variant="outline" className="justify-between border-teal-200 hover:bg-teal-50 dark:border-teal-800 text-teal-800 dark:text-teal-300">
              <span className="inline-flex items-center">
              <HomeIcon className="h-4 w-4 mr-2 text-teal-600" />
              Household Registry
              </span>
              <ArrowRightIcon className="h-4 w-4" />
            </Button>
            <Button onClick={() => router.push('/clusters')} variant="outline" className="justify-between">
              <span className="inline-flex items-center">
              <BuildingOfficeIcon className="h-4 w-4 mr-2" />
              Manage Clusters
              </span>
              <ArrowRightIcon className="h-4 w-4" />
            </Button>
            <Button onClick={() => router.push('/farms')} variant="outline" className="justify-between">
              <span className="inline-flex items-center">
              <GlobeAltIcon className="h-4 w-4 mr-2" />
              View Farms
              </span>
              <ArrowRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useSession } from 'next-auth/react';
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
  const { hasPermission } = usePermissions();
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    // Check dashboard access permission
    if (!hasPermission(PERMISSIONS.DASHBOARD_ACCESS)) {
      // Redirect to first available route instead of signin
      const firstAvailableRoute = getFirstAvailableRoute(hasPermission);
      router.push(firstAvailableRoute);
      return;
    }

    fetchDashboardAnalytics();
  }, [session, status, hasPermission, router]);

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

  if (status === 'loading' || loading) {
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
    <div className="space-y-6 py-6">
      <section className="overflow-hidden rounded-lg border border-[#DCEAF3] bg-white shadow-sm">
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
              // trend="+12% from last month"
              trendUp={true}
            />
            <StatsCard
              title="Agents"
              value={formatNumber(overview.totalAgents)}
              icon={UserGroupIcon}
              description="Field agents"
            />
            <StatsCard
              title="Clusters"
              value={formatNumber(overview.totalClusters)}
              icon={BuildingOfficeIcon}
              description="Clusters"
            />
            <StatsCard
              title="Hectares"
              value={formatNumber(overview.totalHectares)}
              icon={GlobeAltIcon}
              description="Land coverage"
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

      <div className="rounded-lg border border-[#DCEAF3] bg-white shadow-sm dark:bg-card">
        <div className="border-b border-[#E5E7EB] px-6 py-4">
          <h3 className="text-lg font-bold text-[#1E293B] dark:text-gray-100">Quick Actions</h3>
          <p className="mt-1 text-sm text-[#64748B]">Jump into the workflows used most often by FIMS teams.</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

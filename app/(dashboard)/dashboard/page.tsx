'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { usePermissions } from '@/components/PermissionProvider';
import { PERMISSIONS } from '@/lib/permissions';
import { getFirstAvailableRoute } from '@/lib/redirectHelper';
import {
  UsersIcon,
  UserGroupIcon,
  MapIcon,
  BuildingOfficeIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';

import {
  RegistrationEstimatorChart,
  GenderDistributionChart,
  ClusterPerformanceChart,
  CropsStatesInteractiveChart
} from "@/components/dashboard/dashboard-charts"
import { StatsCard, GoalProgress } from "@/components/dashboard/dashboard-summary"

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [analytics, setAnalytics] = useState<any>(null);
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
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
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

  const { overview, geography, demographics, clusters, trends, crops } =
    analytics;

  return (
    <div className="space-y-6 py-6">
      {/* Top Section: Welcome & Goal */}
      <div className="grid bg-stone-200 rounded-lg p-3 grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          {/* <div>
            <h3 className="text-2xl font-bold tracking-tight">
              Welcome back, {session.user?.name?.split(' ')[0] || "User"}
            </h3>
            <p className="text-muted-foreground">
              Here's what's happening with your farmer registration today.
            </p>
          </div> */}

          <div className="grid grid-cols-1 h-full sm:grid-cols-2 gap-4">
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
        </div>

        <div className="md:col-span-1">
          <GoalProgress
            current={overview.totalFarmers}
            target={2000000}
            title="2026 Target"
            subtext="2 Million Farmers"
          />
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Row 1: Registration Trends (Full Width) */}
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

        {/* Row 3: Interactive Crops & States (Full Width) */}

      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <button
              onClick={() => router.push('/agents/new')}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors"
            >
              <UserGroupIcon className="h-4 w-4 mr-2" />
              Create New Agent
            </button>
            <button
              onClick={() => router.push('/farmers')}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <UsersIcon className="h-4 w-4 mr-2" />
              View All Farmers
            </button>
            <button
              onClick={() => router.push('/clusters')}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <BuildingOfficeIcon className="h-4 w-4 mr-2" />
              Manage Clusters
            </button>
            <button
              onClick={() => router.push('/farms')}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <GlobeAltIcon className="h-4 w-4 mr-2" />
              View Farms
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

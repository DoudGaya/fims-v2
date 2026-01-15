import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface DashboardState {
  stats: {
    farmers: { total: number; new: number; verified: number };
    farms: { total: number; totalHectares: number };
    clusters: { total: number; active: number };
    certificates: { total: number; pending: number };
  };
  recentActivity: any[];
  topStates: any[];
  topCrops: any[];
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
  fetchDashboardStats: () => Promise<any>;
  refreshStats: () => Promise<any>;
}

export const useDashboardStore = create<DashboardState>()(
  devtools(
    (set, get) => ({
      stats: {
        farmers: { total: 0, new: 0, verified: 0 },
        farms: { total: 0, totalHectares: 0 },
        clusters: { total: 0, active: 0 },
        certificates: { total: 0, pending: 0 }
      },
      recentActivity: [],
      topStates: [],
      topCrops: [],
      loading: false,
      error: null,
      lastFetched: null,

      fetchDashboardStats: async () => {
        set({ loading: true, error: null });

        try {
          const response = await fetch('/api/dashboard/stats');
          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const data = await response.json();
          set({
            stats: data.stats || {},
            recentActivity: data.recentActivity || [],
            topStates: data.topStates || [],
            topCrops: data.topCrops || [],
            loading: false,
            lastFetched: new Date()
          });

          return data;
        } catch (error: any) {
          console.error('Error fetching dashboard stats:', error);
          set({ loading: false, error: error.message });
          throw error;
        }
      },

      refreshStats: async () => {
        return get().fetchDashboardStats();
      }
    }),
    { name: 'DashboardStore' }
  )
);

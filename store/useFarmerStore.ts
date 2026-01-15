import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Farmer } from '@prisma/client';

interface FarmerState {
  farmers: Farmer[];
  loading: boolean;
  error: string | null;
  selectedFarmer: Farmer | null;
  filters: {
    search: string;
    state: string;
    gender: string;
    status: string;
    cluster: string;
    startDate: string;
    endDate: string;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasMore: boolean;
    loadedAll: boolean;
  };
  analytics: {
    overview: {
      totalFarmers: number;
      totalHectares: number;
      totalFarms: number;
      verificationRate: number;
      farmRegistrationRate: number;
    };
    topStates: any[];
    topLGAs: any[];
    topCrops: any[];
  };
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<FarmerState['filters']>) => void;
  resetFilters: () => void;
  setPagination: (pagination: Partial<FarmerState['pagination']>) => void;
  setSelectedFarmer: (farmer: Farmer | null) => void;
  fetchFarmers: (loadAll?: boolean) => Promise<Farmer[]>;
}

export const useFarmerStore = create<FarmerState>()(
  devtools(
    persist(
      (set, get) => ({
        farmers: [],
        loading: false,
        error: null,
        selectedFarmer: null,
        filters: {
          search: '',
          state: '',
          gender: '',
          status: 'all',
          cluster: '',
          startDate: '',
          endDate: ''
        },
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          pages: 0,
          hasMore: false,
          loadedAll: false
        },
        analytics: {
          overview: {
            totalFarmers: 0,
            totalHectares: 0,
            totalFarms: 0,
            verificationRate: 0,
            farmRegistrationRate: 0
          },
          topStates: [],
          topLGAs: [],
          topCrops: []
        },

        setLoading: (loading) => set({ loading }),
        
        setError: (error) => set({ error }),
        
        setFilters: (filters) => set((state) => ({
          filters: { ...state.filters, ...filters }
        })),
        
        resetFilters: () => set({
          filters: {
            search: '',
            state: '',
            gender: '',
            status: 'all',
            cluster: '',
            startDate: '',
            endDate: ''
          }
        }),

        setPagination: (pagination) => set((state) => ({
          pagination: { ...state.pagination, ...pagination }
        })),

        setSelectedFarmer: (farmer) => set({ selectedFarmer: farmer }),

        fetchFarmers: async (loadAll = false) => {
          const { filters, pagination } = get();
          
          set({ loading: true, error: null });

          try {
            const queryParams = new URLSearchParams();
            queryParams.append('page', pagination.page.toString());
            queryParams.append('limit', loadAll ? '10000' : pagination.limit.toString());
            
            if (filters.search) queryParams.append('search', filters.search);
            if (filters.state) queryParams.append('state', filters.state);
            if (filters.status !== 'all') queryParams.append('status', filters.status);
            if (filters.cluster) queryParams.append('cluster', filters.cluster);
            if (filters.startDate) queryParams.append('startDate', filters.startDate);
            if (filters.endDate) queryParams.append('endDate', filters.endDate);
            if (loadAll) queryParams.append('loadAll', 'true');

            const response = await fetch(`/api/farmers?${queryParams.toString()}`);
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            set({
              farmers: data.farmers || [],
              pagination: {
                ...pagination,
                total: data.pagination?.total || 0,
                pages: data.pagination?.pages || 0,
                hasMore: (data.pagination?.page || 1) < (data.pagination?.pages || 0)
              },
              loading: false
            });
            
            return data.farmers || [];
          } catch (error: any) {
            console.error('Error fetching farmers:', error);
            set({ loading: false, error: error.message });
            throw error;
          }
        }
      }),
      { name: 'farmer-store' }
    )
  )
);

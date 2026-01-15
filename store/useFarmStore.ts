import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Farm } from '@prisma/client';

interface FarmState {
  farms: Farm[];
  loading: boolean;
  error: string | null;
  selectedFarm: Farm | null;
  filters: {
    search: string;
    state: string;
    crop: string;
    ownership: string;
    farmerId: string;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<FarmState['filters']>) => void;
  resetFilters: () => void;
  fetchFarms: () => Promise<Farm[]>;
  getFarmById: (id: string) => Promise<Farm>;
}

export const useFarmStore = create<FarmState>()(
  devtools(
    persist(
      (set, get) => ({
        farms: [],
        loading: false,
        error: null,
        selectedFarm: null,
        filters: {
          search: '',
          state: '',
          crop: '',
          ownership: '',
          farmerId: ''
        },
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          pages: 0
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
            crop: '',
            ownership: '',
            farmerId: ''
          }
        }),

        fetchFarms: async () => {
          const { filters, pagination } = get();
          set({ loading: true, error: null });

          try {
            const queryParams = new URLSearchParams();
            queryParams.append('page', pagination.page.toString());
            queryParams.append('limit', pagination.limit.toString());
            
            if (filters.search) queryParams.append('search', filters.search);
            if (filters.state) queryParams.append('state', filters.state);
            if (filters.crop) queryParams.append('crop', filters.crop);
            if (filters.farmerId) queryParams.append('farmerId', filters.farmerId);

            const response = await fetch(`/api/farms?${queryParams.toString()}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            set({
              farms: data.farms || [],
              pagination: {
                page: data.pagination?.page || 1,
                limit: data.pagination?.limit || 50,
                total: data.pagination?.total || 0,
                pages: data.pagination?.pages || 0
              },
              loading: false
            });

            return data.farms;
          } catch (error: any) {
            console.error('Error fetching farms:', error);
            set({ loading: false, error: error.message, farms: [] });
            throw error;
          }
        },

        getFarmById: async (id) => {
          set({ loading: true, error: null });

          try {
            const response = await fetch(`/api/farms/${id}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            set({ selectedFarm: data, loading: false });
            return data;
          } catch (error: any) {
            console.error('Error fetching farm:', error);
            set({ loading: false, error: error.message });
            throw error;
          }
        }
      }),
      { name: 'farm-store' }
    )
  )
);

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Cluster } from '@prisma/client';

interface ClusterState {
  clusters: Cluster[];
  loading: boolean;
  error: string | null;
  selectedCluster: Cluster | null;
  filters: {
    search: string;
    state: string;
    status: string;
  };
  setFilters: (filters: Partial<ClusterState['filters']>) => void;
  fetchClusters: () => Promise<Cluster[]>;
  getClusterById: (id: string) => Promise<Cluster>;
  createCluster: (clusterData: Partial<Cluster>) => Promise<Cluster>;
  updateCluster: (id: string, updates: Partial<Cluster>) => Promise<Cluster>;
}

export const useClusterStore = create<ClusterState>()(
  devtools(
    persist(
      (set, get) => ({
        clusters: [],
        loading: false,
        error: null,
        selectedCluster: null,
        filters: {
          search: '',
          state: '',
          status: 'all'
        },

        setFilters: (filters) => set((state) => ({
          filters: { ...state.filters, ...filters }
        })),

        fetchClusters: async () => {
          set({ loading: true, error: null });

          try {
            const response = await fetch('/api/clusters');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            set({ clusters: data.clusters || data, loading: false });
            return data.clusters || data;
          } catch (error: any) {
            console.error('Error fetching clusters:', error);
            set({ loading: false, error: error.message, clusters: [] });
            throw error;
          }
        },

        getClusterById: async (id) => {
          set({ loading: true, error: null });

          try {
            const response = await fetch(`/api/clusters/${id}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            set({ selectedCluster: data, loading: false });
            return data;
          } catch (error: any) {
            console.error('Error fetching cluster:', error);
            set({ loading: false, error: error.message });
            throw error;
          }
        },

        createCluster: async (clusterData) => {
          set({ loading: true, error: null });

          try {
            const response = await fetch('/api/clusters', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(clusterData)
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const newCluster = await response.json();
            set((state) => ({
              clusters: [...state.clusters, newCluster],
              loading: false
            }));

            return newCluster;
          } catch (error: any) {
            console.error('Error creating cluster:', error);
            set({ loading: false, error: error.message });
            throw error;
          }
        },

        updateCluster: async (id, updates) => {
          set({ loading: true, error: null });

          try {
            const response = await fetch(`/api/clusters/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updates)
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const updatedCluster = await response.json();
            set((state) => ({
              clusters: state.clusters.map(c => c.id === id ? updatedCluster : c),
              selectedCluster: state.selectedCluster?.id === id ? updatedCluster : state.selectedCluster,
              loading: false
            }));

            return updatedCluster;
          } catch (error: any) {
            console.error('Error updating cluster:', error);
            set({ loading: false, error: error.message });
            throw error;
          }
        }
      }),
      { name: 'cluster-store' }
    )
  )
);

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User, Agent } from '@prisma/client';

interface UserState {
  users: User[];
  agents: Agent[];
  loading: boolean;
  error: string | null;
  selectedUser: User | null;
  filters: {
    search: string;
    role: string;
    status: string;
  };
  setFilters: (filters: Partial<UserState['filters']>) => void;
  fetchUsers: () => Promise<User[]>;
  fetchAgents: () => Promise<Agent[]>;
  updateUser: (id: string, updates: Partial<User>) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
}

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set, get) => ({
        users: [],
        agents: [],
        loading: false,
        error: null,
        selectedUser: null,
        filters: {
          search: '',
          role: 'all',
          status: 'all'
        },

        setFilters: (filters) => set((state) => ({
          filters: { ...state.filters, ...filters }
        })),

        fetchUsers: async () => {
          set({ loading: true, error: null });

          try {
            const response = await fetch('/api/users');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            set({ users: data.users || data, loading: false });
            return data.users || data;
          } catch (error: any) {
            console.error('Error fetching users:', error);
            set({ loading: false, error: error.message, users: [] });
            throw error;
          }
        },

        fetchAgents: async () => {
          set({ loading: true, error: null });

          try {
            const response = await fetch('/api/agents');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            set({ agents: data.agents || data, loading: false });
            return data.agents || data;
          } catch (error: any) {
            console.error('Error fetching agents:', error);
            set({ loading: false, error: error.message, agents: [] });
            throw error;
          }
        },

        updateUser: async (id, updates) => {
          set({ loading: true, error: null });

          try {
            const response = await fetch(`/api/users/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updates)
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const updatedUser = await response.json();
            set((state) => ({
              users: state.users.map(u => u.id === id ? updatedUser : u),
              loading: false
            }));

            return updatedUser;
          } catch (error: any) {
            console.error('Error updating user:', error);
            set({ loading: false, error: error.message });
            throw error;
          }
        },

        deleteUser: async (id) => {
          set({ loading: true, error: null });

          try {
            const response = await fetch(`/api/users/${id}`, {
              method: 'DELETE'
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            set((state) => ({
              users: state.users.filter(u => u.id !== id),
              loading: false
            }));
          } catch (error: any) {
            console.error('Error deleting user:', error);
            set({ loading: false, error: error.message });
            throw error;
          }
        }
      }),
      { name: 'user-store' }
    )
  )
);

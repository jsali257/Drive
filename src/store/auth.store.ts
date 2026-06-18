import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, setAuth, clearAuth } from '@/lib/api';

interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  role: string;
  status: string;
  avatar?: string;
  storageQuotaBytes: number;
  storageUsedBytes: number;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          setAuth(data.accessToken, data.refreshToken);
          set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken, isAuthenticated: true });
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (email, username, password, displayName) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/register', { email, username, password, displayName });
          setAuth(data.accessToken, data.refreshToken);
          set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken, isAuthenticated: true });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        const { refreshToken } = get();
        try {
          if (refreshToken) await api.post('/auth/logout', { refreshToken });
        } catch {}
        clearAuth();
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },

      loadUser: async () => {
        set({ isLoading: true });
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data, isAuthenticated: true });
        } catch (err: any) {
          // Only clear auth on explicit 401 — not network errors
          if (err?.response?.status === 401) {
            set({ user: null, isAuthenticated: false });
          }
        } finally {
          set({ isLoading: false });
        }
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

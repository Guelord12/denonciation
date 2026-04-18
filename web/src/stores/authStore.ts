import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';

interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
  phone?: string;
  country?: string;
  city?: string;
  is_admin: boolean;
  is_banned: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  updateUser: (user: Partial<User>) => void;
  initialize: () => Promise<void>;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  country?: string;
  city?: string;
  nationality?: string;
  birth_date?: string;
  gender?: string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (username: string, password: string) => {
        try {
          console.log('📤 Login attempt:', { username });
          const response = await api.post('/auth/login', { username, password });
          const { user, tokens } = response.data;
          
          set({
            user,
            accessToken: tokens.access,
            refreshToken: tokens.refresh,
            isAuthenticated: true,
          });
          
          localStorage.setItem('accessToken', tokens.access);
          console.log('✅ Login successful');
        } catch (error: any) {
          console.error('❌ Login error:', error.response?.data);
          throw error;
        }
      },

      register: async (data: RegisterData) => {
        try {
          console.log('📤 Register attempt:', { 
            username: data.username, 
            email: data.email,
            phone: data.phone,
            birth_date: data.birth_date 
          });
          
          const response = await api.post('/auth/register', data);
          const { user, tokens } = response.data;
          
          set({
            user,
            accessToken: tokens.access,
            refreshToken: tokens.refresh,
            isAuthenticated: true,
          });
          
          localStorage.setItem('accessToken', tokens.access);
          console.log('✅ Register successful');
        } catch (error: any) {
          console.error('❌ Register error:', error.response?.data);
          throw error;
        }
      },

      logout: async () => {
        try {
          const refreshToken = get().refreshToken;
          if (refreshToken) {
            await api.post('/auth/logout', { refreshToken });
          }
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
          localStorage.removeItem('accessToken');
        }
      },

      refreshAccessToken: async () => {
        try {
          const refreshToken = get().refreshToken;
          if (!refreshToken) return null;

          const response = await api.post('/auth/refresh', { refreshToken });
          const { access } = response.data;
          
          set({ accessToken: access });
          localStorage.setItem('accessToken', access);
          
          return access;
        } catch (error) {
          get().logout();
          return null;
        }
      },

      updateUser: (userData: Partial<User>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        }));
      },

      initialize: async () => {
        set({ isLoading: true });
        
        const token = localStorage.getItem('accessToken');
        if (!token) {
          set({ isLoading: false });
          return;
        }
        
        try {
          const response = await api.get('/auth/me');
          set({
            user: response.data,
            isAuthenticated: true,
          });
        } catch (error) {
          const newToken = await get().refreshAccessToken();
          if (newToken) {
            try {
              const response = await api.get('/auth/me');
              set({
                user: response.data,
                isAuthenticated: true,
              });
            } catch (e) {
              get().logout();
            }
          }
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
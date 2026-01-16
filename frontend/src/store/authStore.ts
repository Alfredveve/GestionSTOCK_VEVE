import { create } from 'zustand';
import api from '@/services/api';

interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  login: (credentials: any) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: !!localStorage.getItem('access_token'),
  user: null,
  login: async (credentials) => {
    const response = await api.post('auth/token/', credentials);
    const { access, refresh } = response.data;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    set({ isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ isAuthenticated: false, user: null });
  },
  checkAuth: () => {
    set({ isAuthenticated: !!localStorage.getItem('access_token') });
  }
}));

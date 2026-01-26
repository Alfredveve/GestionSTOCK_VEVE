import { create } from 'zustand';
import api from '@/services/api';

interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  login: (credentials: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
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
    
    // Fetch user details immediately after login
    const userResponse = await api.get('users/me/');
    set({ isAuthenticated: true, user: userResponse.data });
  },
  register: async (data) => {
    await api.post('auth/users/', data);
  },
  resetPassword: async (identifier) => {
    await api.post('auth/users/reset_password/', { identifier });
  },
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ isAuthenticated: false, user: null });
  },
  checkAuth: async () => {
    const token = localStorage.getItem('access_token');
    if (token) {
        try {
            const userResponse = await api.get('users/me/');
            set({ isAuthenticated: true, user: userResponse.data });
        } catch (e) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            set({ isAuthenticated: false, user: null });
        }
    } else {
        set({ isAuthenticated: false, user: null });
    }
  }
}));

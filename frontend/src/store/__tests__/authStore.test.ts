import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '../authStore';
import api from '@/services/api';

// Mock api
vi.mock('@/services/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Reset Zustand store state
    useAuthStore.setState({ isAuthenticated: false, user: null });
  });

  it('should initialize with isAuthenticated false if no token', () => {
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('login should store tokens and set isAuthenticated to true', async () => {
    const mockResponse = {
      data: {
        access: 'mock-access-token',
        refresh: 'mock-refresh-token',
      },
    };
    (api.post as any).mockResolvedValue(mockResponse);

    await useAuthStore.getState().login({ username: 'test', password: 'password' });

    expect(localStorage.getItem('access_token')).toBe('mock-access-token');
    expect(localStorage.getItem('refresh_token')).toBe('mock-refresh-token');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('logout should remove tokens and set isAuthenticated to false', () => {
    localStorage.setItem('access_token', 'token');
    useAuthStore.setState({ isAuthenticated: true });

    useAuthStore.getState().logout();

    expect(localStorage.getItem('access_token')).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('checkAuth should update isAuthenticated based on token existence', () => {
    localStorage.setItem('access_token', 'token');
    useAuthStore.getState().checkAuth();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    localStorage.removeItem('access_token');
    useAuthStore.getState().checkAuth();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

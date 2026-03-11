import { api } from './client';
import type { AuthResponse, User } from './types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),

  register: (email: string, password: string, name: string) =>
    api.post<AuthResponse>('/auth/register', { email, password, name }),

  logout: () =>
    api.post<void>('/auth/logout', {}),

  refreshToken: (refreshToken: string) =>
    api.post<AuthResponse>('/auth/refresh', { refreshToken }),

  getProfile: () =>
    api.get<User>('/auth/profile'),

  updateProfile: (data: Partial<User>) =>
    api.put<User>('/auth/profile', data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<void>('/auth/change-password', { currentPassword, newPassword }),

  resetPassword: (email: string) =>
    api.post<void>('/auth/reset-password', { email }),

  verifyEmail: (token: string) =>
    api.post<void>('/auth/verify-email', { token }),

  oauth: (provider: 'google' | 'apple' | 'kakao') => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'https://api.lowestalert.com/v1'}/auth/oauth/${provider}`;
  },
};

export const tokenStorage = {
  getToken: () => localStorage.getItem('auth_token'),
  setToken: (token: string) => localStorage.setItem('auth_token', token),
  removeToken: () => localStorage.removeItem('auth_token'),
  
  getRefreshToken: () => localStorage.getItem('refresh_token'),
  setRefreshToken: (token: string) => localStorage.setItem('refresh_token', token),
  removeRefreshToken: () => localStorage.removeItem('refresh_token'),
  
  clear: () => {
    tokenStorage.removeToken();
    tokenStorage.removeRefreshToken();
  },
};

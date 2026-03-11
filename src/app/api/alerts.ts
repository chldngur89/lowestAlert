import { api } from './client';
import type { Alert, PaginatedResponse } from './types';

export const alertApi = {
  getAll: (page = 1, limit = 20, unreadOnly = false) =>
    api.get<PaginatedResponse<Alert>>(
      `/alerts?page=${page}&limit=${limit}&unread=${unreadOnly}`
    ),

  getUnreadCount: () =>
    api.get<{ count: number }>('/alerts/unread-count'),

  markAsRead: (id: number) =>
    api.put<Alert>(`/alerts/${id}/read`, {}),

  markAllAsRead: () =>
    api.put<void>('/alerts/read-all', {}),

  delete: (id: number) =>
    api.delete<void>(`/alerts/${id}`),

  create: (productId: number, threshold: number) =>
    api.post<Alert>('/alerts', { productId, threshold }),

  update: (id: number, threshold: number) =>
    api.put<Alert>(`/alerts/${id}`, { threshold }),

  toggle: (id: number, enabled: boolean) =>
    api.put<Alert>(`/alerts/${id}/toggle`, { enabled }),
};

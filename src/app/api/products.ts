import { api } from './client';
import type { Product, ProductAnalysis, PaginatedResponse } from './types';

export const productApi = {
  getAll: (page = 1, limit = 20) =>
    api.get<PaginatedResponse<Product>>(`/products?page=${page}&limit=${limit}`),

  getById: (id: number) =>
    api.get<Product>(`/products/${id}`),

  add: (url: string) =>
    api.post<ProductAnalysis>('/products/analyze', { url }),

  addFromAnalysis: (analysisId: string) =>
    api.post<Product>('/products', { analysisId }),

  remove: (id: number) =>
    api.delete<void>(`/products/${id}`),

  updateAlert: (id: number, threshold: number) =>
    api.put<Product>(`/products/${id}/alert`, { threshold }),

  getPriceHistory: (id: number, days = 30) =>
    api.get<Product[]>(`/products/${id}/history?days=${days}`),

  analyzeUrl: (url: string) =>
    api.post<ProductAnalysis>('/products/analyze', { url }),
};

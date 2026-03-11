export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
}

export interface Product {
  id: number;
  name: string;
  shop: string;
  currentPrice: number;
  originalPrice: number;
  change: number;
  isLowest: boolean;
  image: string;
  priceHistory: PriceHistory[];
  url: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PriceHistory {
  date: string;
  price: number;
}

export interface Alert {
  id: number;
  productId: number;
  productName: string;
  image: string;
  oldPrice: number;
  newPrice: number;
  discount: number;
  timestamp: string;
  shop: string;
  userId: string;
  read: boolean;
}

export interface ProductAnalysis {
  name: string;
  currentPrice: number;
  shop: string;
  shops: ShopPrice[];
  image: string;
  category?: string;
  description?: string;
}

export interface ShopPrice {
  name: string;
  price: number;
  url: string;
  isLowest: boolean;
  inStock: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

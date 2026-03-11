import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProductAnalysis, ProductOffer } from '../services/crawlerService';

export interface PricePoint {
  checkedAt: string;
  price: number;
}

export interface Product {
  change: number;
  createdAt: string;
  currentPrice: number;
  error?: string;
  id: string;
  image: string;
  isLowest: boolean;
  lastCheckedAt: string;
  lowestPrice: number;
  name: string;
  offers: ProductOffer[];
  originalPrice: number;
  priceHistory: PricePoint[];
  shop: string;
  updatedAt: string;
  url: string;
}

export interface Alert {
  createdAt: string;
  discount: number;
  id: string;
  image: string;
  newPrice: number;
  oldPrice: number;
  productId: string;
  productName: string;
  read: boolean;
  shop: string;
  url: string;
}

interface RefreshResult {
  alert: Alert | null;
  product: Product | null;
}

interface AddResult {
  isDuplicate: boolean;
  product: Product;
}

interface ProductStore {
  addTrackedProduct: (analysis: ProductAnalysis) => AddResult;
  alerts: Alert[];
  clearAlerts: () => void;
  getProductById: (id: string) => Product | undefined;
  markAlertAsRead: (id: string) => void;
  markAllAlertsAsRead: () => void;
  products: Product[];
  refreshProduct: (
    id: string,
    analysis: ProductAnalysis,
    thresholdPercent: number
  ) => RefreshResult;
  removeProduct: (id: string) => void;
  resetAll: () => void;
}

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toPricePoint(price: number, checkedAt: string): PricePoint {
  return { checkedAt, price };
}

function toTrackedProduct(analysis: ProductAnalysis): Product {
  const timestamp = analysis.checkedAt;
  const startingPrice = analysis.currentPrice;

  return {
    change: 0,
    createdAt: timestamp,
    currentPrice: startingPrice,
    id: createId(),
    image: analysis.image,
    isLowest: true,
    lastCheckedAt: timestamp,
    lowestPrice: startingPrice,
    name: analysis.name,
    offers: analysis.offers,
    originalPrice: analysis.originalPrice || startingPrice,
    priceHistory: [toPricePoint(startingPrice, timestamp)],
    shop: analysis.shop,
    updatedAt: timestamp,
    url: analysis.url,
  };
}

function createAlert(product: Product, newPrice: number, checkedAt: string): Alert {
  const priceDiff = product.currentPrice - newPrice;
  const discount = Number.parseFloat(((priceDiff / product.currentPrice) * 100).toFixed(1));

  return {
    createdAt: checkedAt,
    discount,
    id: createId(),
    image: product.image,
    newPrice,
    oldPrice: product.currentPrice,
    productId: product.id,
    productName: product.name,
    read: false,
    shop: product.shop,
    url: product.url,
  };
}

function normalizeHistory(history: PricePoint[], nextPoint: PricePoint) {
  const lastPoint = history[history.length - 1];
  if (lastPoint && lastPoint.price === nextPoint.price) {
    return history.map((point, index) =>
      index === history.length - 1 ? nextPoint : point
    );
  }

  return [...history, nextPoint].slice(-30);
}

export const useProductStore = create<ProductStore>()(
  persist(
    (set, get) => ({
      addTrackedProduct: (analysis) => {
        const existing = get().products.find((product) => product.url === analysis.url);

        if (existing) {
          return { isDuplicate: true, product: existing };
        }

        const product = toTrackedProduct(analysis);
        set((state) => ({ products: [product, ...state.products] }));

        return { isDuplicate: false, product };
      },
      alerts: [],
      clearAlerts: () => set({ alerts: [] }),
      getProductById: (id) => get().products.find((product) => product.id === id),
      markAlertAsRead: (id) =>
        set((state) => ({
          alerts: state.alerts.map((alert) =>
            alert.id === id ? { ...alert, read: true } : alert
          ),
        })),
      markAllAlertsAsRead: () =>
        set((state) => ({
          alerts: state.alerts.map((alert) => ({ ...alert, read: true })),
        })),
      products: [],
      refreshProduct: (id, analysis, thresholdPercent) => {
        const currentProduct = get().products.find((product) => product.id === id);
        if (!currentProduct) {
          return { alert: null, product: null };
        }

        const change = Number.parseFloat(
          (((analysis.currentPrice - currentProduct.currentPrice) / currentProduct.currentPrice) * 100).toFixed(1)
        );
        const updatedProduct: Product = {
          ...currentProduct,
          change,
          error: undefined,
          image: analysis.image || currentProduct.image,
          isLowest: analysis.currentPrice <= currentProduct.lowestPrice,
          lastCheckedAt: analysis.checkedAt,
          lowestPrice: Math.min(currentProduct.lowestPrice, analysis.currentPrice),
          name: analysis.name || currentProduct.name,
          offers: analysis.offers?.length ? analysis.offers : currentProduct.offers,
          priceHistory: normalizeHistory(
            currentProduct.priceHistory,
            toPricePoint(analysis.currentPrice, analysis.checkedAt)
          ),
          shop: analysis.shop || currentProduct.shop,
          updatedAt: analysis.checkedAt,
          url: analysis.url || currentProduct.url,
          currentPrice: analysis.currentPrice,
        };

        const shouldAlert =
          analysis.currentPrice < currentProduct.currentPrice &&
          Math.abs(change) >= thresholdPercent;

        const alert = shouldAlert
          ? createAlert(currentProduct, analysis.currentPrice, analysis.checkedAt)
          : null;

        set((state) => ({
          alerts: alert ? [alert, ...state.alerts] : state.alerts,
          products: state.products.map((product) =>
            product.id === id ? updatedProduct : product
          ),
        }));

        return { alert, product: updatedProduct };
      },
      removeProduct: (id) =>
        set((state) => ({
          alerts: state.alerts.filter((alert) => alert.productId !== id),
          products: state.products.filter((product) => product.id !== id),
        })),
      resetAll: () => set({ alerts: [], products: [] }),
    }),
    {
      migrate: (persistedState) => {
        const state = persistedState as Partial<ProductStore> & {
          alerts?: Alert[];
          products?: Product[];
        };

        const hasLegacyProducts = (state.products || []).some(
          (product) => typeof product.url !== 'string' || product.url.length === 0
        );

        if (hasLegacyProducts) {
          return { alerts: [], products: [] };
        }

        return {
          alerts: Array.isArray(state.alerts) ? state.alerts : [],
          products: Array.isArray(state.products) ? state.products : [],
        };
      },
      name: 'lowest-alert-storage',
      partialize: (state) => ({
        alerts: state.alerts,
        products: state.products,
      }),
      version: 2,
    }
  )
);

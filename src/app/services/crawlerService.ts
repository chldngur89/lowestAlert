export interface ProductOffer {
  image: string;
  inStock: boolean;
  isLowest: boolean;
  name: string;
  price: number;
  shop: string;
  url: string;
}

export interface ProductAnalysis {
  checkedAt: string;
  currentPrice: number;
  image: string;
  name: string;
  offers: ProductOffer[];
  originalPrice: number;
  shop: string;
  url: string;
}

class CrawlerError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = 'CrawlerError';
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function buildUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

async function postJson<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(buildUrl(path), {
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new CrawlerError(data.error || '가격 정보를 불러오지 못했습니다.', response.status);
  }

  return data.data as T;
}

export const crawlerApi = {
  analyzeUrl: (url: string) => postJson<ProductAnalysis>('/api/analyze', { url }),

  comparePrices: async (query: string) => {
    const results = await postJson<ProductOffer[]>('/api/compare', { productName: query });
    return results;
  },
};

export { CrawlerError };

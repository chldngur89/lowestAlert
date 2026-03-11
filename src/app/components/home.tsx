import { useCallback, useEffect, useRef, useState } from 'react';
import { Award, BellRing, Loader2, Plus, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { Link } from 'react-router';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { useProductStore, type Product } from '../store/productStore';
import { useSettingsStore } from '../store/settingsStore';
import { crawlerApi } from '../services/crawlerService';
import { sendPriceDropNotification } from '../services/notifications';

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    month: 'numeric',
    day: 'numeric',
  });
}

export function Home() {
  const { products, refreshProduct } = useProductStore();
  const { priceDropThreshold, pushEnabled } = useSettingsStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const initialRefreshDone = useRef(false);

  const refreshSingleProduct = useCallback(
    async (product: Product, notify: boolean) => {
      const analysis = await crawlerApi.analyzeUrl(product.url);
      const result = refreshProduct(product.id, analysis, priceDropThreshold);

      if (notify && result.alert) {
        const diff = Math.max(0, result.alert.oldPrice - result.alert.newPrice).toLocaleString();
        toast.success(`${product.name} 가격이 ${diff}원 내려갔습니다.`);

        if (pushEnabled) {
          sendPriceDropNotification(result.alert);
        }
      }

      return result.product;
    },
    [priceDropThreshold, pushEnabled, refreshProduct]
  );

  const refreshAllProducts = useCallback(
    async (notify = true) => {
      if (products.length === 0 || isRefreshing) {
        return;
      }

      setIsRefreshing(true);

      if (notify) {
        toast.info('등록한 상품 가격을 확인하고 있습니다.');
      }

      try {
        for (const product of products) {
          await refreshSingleProduct(product, notify);
        }

        const checkedAt = new Date().toISOString();
        setLastUpdated(checkedAt);

        if (notify) {
          toast.success('가격 확인이 완료되었습니다.');
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '상품 가격을 업데이트하지 못했습니다.';
        toast.error(message);
      } finally {
        setIsRefreshing(false);
      }
    },
    [isRefreshing, products, refreshSingleProduct]
  );

  useEffect(() => {
    if (products.length === 0) {
      initialRefreshDone.current = false;
      return;
    }

    if (initialRefreshDone.current) {
      return;
    }

    initialRefreshDone.current = true;
    void refreshAllProducts(false);
  }, [products.length, refreshAllProducts]);

  useEffect(() => {
    if (products.length === 0) {
      return;
    }

    const interval = window.setInterval(() => {
      void refreshAllProducts(false);
    }, 15 * 60 * 1000);

    return () => window.clearInterval(interval);
  }, [products.length, refreshAllProducts]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Tracked</p>
            <h1 className="text-xl font-bold">내 관심 상품</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {lastUpdated ? `마지막 확인 ${formatTime(lastUpdated)}` : '상품 링크를 등록하면 여기에서 계속 추적합니다.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isRefreshing && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
            <button
              aria-label="새로고침"
              className="rounded-xl p-2 transition-colors hover:bg-accent disabled:opacity-50"
              disabled={isRefreshing || products.length === 0}
              onClick={() => void refreshAllProducts(true)}
            >
              <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <Link
              aria-label="상품 추가"
              className="rounded-xl bg-primary p-2 text-primary-foreground transition-colors hover:bg-[#0052CC]"
              to="/add"
            >
              <Plus className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl p-4">
        {products.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-border bg-card p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
              <BellRing className="h-8 w-8" />
            </div>
            <h2 className="mb-2 text-xl font-bold">추적 중인 상품이 아직 없습니다.</h2>
            <p className="mb-6 text-muted-foreground">
              상품 상세 URL을 등록하면 가격 변동과 하락 알림을 실제로 기록합니다.
            </p>
            <Link
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-[#0052CC]"
              to="/add"
            >
              <Plus className="h-5 w-5" />
              상품 링크 등록
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <Link
                aria-label={`${product.name} 상세 보기`}
                className="block rounded-[1.6rem] border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                key={product.id}
                to={`/product/${product.id}`}
              >
                <div className="flex gap-4">
                  <div className="h-24 w-24 overflow-hidden rounded-2xl bg-muted">
                    {product.image ? (
                      <img alt={product.name} className="h-full w-full object-cover" src={product.image} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                        이미지 없음
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-start justify-between gap-3">
                      <h2 className="line-clamp-2 text-sm font-semibold leading-tight">{product.name}</h2>
                      {product.isLowest && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                          <Award className="h-3 w-3" />
                          내 최저가
                        </span>
                      )}
                    </div>

                    <p className="mb-3 text-xs text-muted-foreground">
                      {product.shop} · 마지막 확인 {formatTime(product.lastCheckedAt)}
                    </p>

                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <div className="text-2xl font-bold">{product.currentPrice.toLocaleString()}원</div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <span>기준가 {product.originalPrice.toLocaleString()}원</span>
                          <span>최저 {product.lowestPrice.toLocaleString()}원</span>
                        </div>
                        {product.change !== 0 && (
                          <div
                            className={`mt-2 inline-flex items-center gap-1 text-sm font-semibold ${
                              product.change < 0 ? 'text-red-500' : 'text-emerald-500'
                            }`}
                          >
                            {product.change < 0 ? (
                              <TrendingDown className="h-4 w-4" />
                            ) : (
                              <TrendingUp className="h-4 w-4" />
                            )}
                            {Math.abs(product.change)}%
                          </div>
                        )}
                      </div>

                      <div className="h-12 w-24">
                        <ResponsiveContainer height="100%" width="100%">
                          <LineChart data={product.priceHistory}>
                            <Line
                              dataKey="price"
                              dot={false}
                              stroke={product.change <= 0 ? '#ef4444' : '#10b981'}
                              strokeWidth={2.5}
                              type="monotone"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

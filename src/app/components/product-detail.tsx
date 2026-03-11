import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  RefreshCw,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';
import { crawlerApi } from '../services/crawlerService';
import { sendPriceDropNotification } from '../services/notifications';
import { useProductStore } from '../store/productStore';
import { useSettingsStore } from '../store/settingsStore';

function formatDate(iso: string) {
  const date = new Date(iso);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function ProductDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { getProductById, refreshProduct, removeProduct } = useProductStore();
  const { priceDropThreshold, pushEnabled } = useSettingsStore();
  const [loading, setLoading] = useState(false);

  const product = id ? getProductById(id) : undefined;

  const chartData = useMemo(
    () =>
      product?.priceHistory.map((point) => ({
        date: formatDate(point.checkedAt),
        price: point.price,
      })) ?? [],
    [product]
  );

  if (!product) {
    return (
      <div className="min-h-screen bg-background px-6 py-12">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="mb-3 text-2xl font-bold">상품을 찾을 수 없습니다.</h1>
          <p className="mb-6 text-muted-foreground">삭제되었거나 아직 저장되지 않은 상품입니다.</p>
          <button
            className="rounded-2xl bg-primary px-5 py-3 font-semibold text-primary-foreground"
            onClick={() => navigate('/home')}
            type="button"
          >
            홈으로 이동
          </button>
        </div>
      </div>
    );
  }

  const handleRefresh = async () => {
    setLoading(true);

    try {
      const analysis = await crawlerApi.analyzeUrl(product.url);
      const result = refreshProduct(product.id, analysis, priceDropThreshold);

      if (result.alert) {
        const diff = Math.max(0, result.alert.oldPrice - result.alert.newPrice).toLocaleString();
        toast.success(`${product.name} 가격이 ${diff}원 내려갔습니다.`);

        if (pushEnabled) {
          sendPriceDropNotification(result.alert);
        }
      } else {
        toast.success('최신 가격으로 갱신했습니다.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '가격 갱신에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    removeProduct(product.id);
    toast.success('상품 추적을 중단했습니다.');
    navigate('/home');
  };

  const discount = Math.max(
    0,
    Math.round(((product.originalPrice - product.currentPrice) / product.originalPrice) * 100)
  );

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button
            className="rounded-xl p-2 transition-colors hover:bg-accent"
            onClick={() => navigate(-1)}
            type="button"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">상품 상세</h1>
            <p className="text-xs text-muted-foreground">마지막 확인 {new Date(product.lastCheckedAt).toLocaleString('ko-KR')}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <div className="grid gap-6 md:grid-cols-[220px_1fr]">
            <div className="overflow-hidden rounded-[1.5rem] bg-muted">
              {product.image ? (
                <img alt={product.name} className="aspect-square h-full w-full object-cover" src={product.image} />
              ) : (
                <div className="flex aspect-square items-center justify-center text-sm text-muted-foreground">
                  이미지 없음
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-primary">{product.shop}</p>
              <h2 className="text-xl font-bold leading-tight">{product.name}</h2>

              <div className="mt-6 flex items-end gap-3">
                <div className="text-4xl font-bold">{product.currentPrice.toLocaleString()}원</div>
                {product.change !== 0 && (
                  <div
                    className={`mb-2 inline-flex items-center gap-1 font-semibold ${
                      product.change < 0 ? 'text-red-500' : 'text-emerald-500'
                    }`}
                  >
                    {product.change < 0 ? (
                      <TrendingDown className="h-5 w-5" />
                    ) : (
                      <TrendingUp className="h-5 w-5" />
                    )}
                    {Math.abs(product.change)}%
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>등록 당시 {product.originalPrice.toLocaleString()}원</span>
                <span>내 최저가 {product.lowestPrice.toLocaleString()}원</span>
                <span>하락 폭 {discount}%</span>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 font-semibold text-primary-foreground transition-colors hover:bg-[#0052CC]"
                  onClick={() => void handleRefresh()}
                  type="button"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
                  가격 다시 확인
                </button>
                <a
                  className="inline-flex items-center gap-2 rounded-2xl border border-border px-5 py-3 font-semibold transition-colors hover:bg-accent"
                  href={product.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ExternalLink className="h-5 w-5" />
                  상품 페이지 열기
                </a>
                <button
                  className="inline-flex items-center gap-2 rounded-2xl border border-border px-5 py-3 font-semibold text-destructive transition-colors hover:bg-destructive/10"
                  onClick={handleDelete}
                  type="button"
                >
                  <Trash2 className="h-5 w-5" />
                  추적 삭제
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <h3 className="font-bold">가격 이력</h3>
          <p className="mb-4 text-sm text-muted-foreground">최근 {product.priceHistory.length}회 확인 기록입니다.</p>

          <div className="h-64 w-full">
            <ResponsiveContainer height="100%" width="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} />
                <YAxis
                  stroke="var(--muted-foreground)"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                  }}
                  formatter={(value: number) => [`${value.toLocaleString()}원`, '가격']}
                />
                <Line
                  activeDot={{ r: 5 }}
                  dataKey="price"
                  dot={{ r: 3 }}
                  stroke="#0066FF"
                  strokeWidth={3}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-bold">현재 확인 가능한 가격</h3>
          <div className="space-y-3">
            {product.offers.map((offer) => (
              <a
                className={`flex items-center justify-between rounded-2xl border p-4 transition-colors hover:bg-accent/60 ${
                  offer.isLowest ? 'border-primary/30 bg-primary/5' : 'border-border'
                }`}
                href={offer.url}
                key={`${offer.shop}-${offer.url}`}
                rel="noreferrer"
                target="_blank"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{offer.shop}</span>
                    {offer.isLowest && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                        현재가
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{offer.name}</p>
                </div>
                <span className="text-lg font-bold">{offer.price.toLocaleString()}원</span>
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

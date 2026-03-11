import { useMemo, useState } from 'react';
import { ArrowLeft, Link2, Loader2, Plus, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { crawlerApi, type ProductAnalysis } from '../services/crawlerService';
import { useProductStore } from '../store/productStore';

function isValidUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function AddProduct() {
  const navigate = useNavigate();
  const { addTrackedProduct } = useProductStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<ProductAnalysis | null>(null);

  const canAnalyze = useMemo(() => isValidUrl(input.trim()), [input]);

  const handleAnalyze = async () => {
    if (!canAnalyze) {
      setError('상품 상세 URL만 등록할 수 있습니다.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await crawlerApi.analyzeUrl(input.trim());
      setPreview(result);
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : '상품 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = () => {
    if (!preview) {
      return;
    }

    const result = addTrackedProduct(preview);

    if (result.isDuplicate) {
      toast.info('이미 등록된 상품입니다. 기존 상세 화면으로 이동합니다.');
    } else {
      toast.success('상품 추적을 시작했습니다.');
    }

    navigate(`/product/${result.product.id}`);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button
            className="rounded-xl p-2 transition-colors hover:bg-accent"
            onClick={() => navigate(-1)}
            type="button"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">상품 추가</h1>
            <p className="text-xs text-muted-foreground">상품 상세 URL을 붙여 넣으면 바로 추적합니다.</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl p-6">
        {!preview ? (
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-border bg-card p-8 shadow-sm">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground">
                <Link2 className="h-8 w-8" />
              </div>
              <h2 className="mb-2 text-2xl font-bold">지원 쇼핑몰의 상품 상세 링크를 등록하세요.</h2>
              <p className="text-muted-foreground">
                서버리스 배포에 맞춰 검색어 비교 대신 직접 링크 추적 방식으로 정리했습니다. 등록 후에는
                홈과 상세 화면에서 계속 새 가격을 확인할 수 있습니다.
              </p>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">
                {error}
              </div>
            )}

            <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <label className="mb-2 block text-sm font-semibold">상품 상세 URL</label>
              <textarea
                className="h-36 w-full rounded-2xl border border-border bg-input-background px-4 py-3 outline-none transition-colors focus:border-primary"
                onChange={(event) => setInput(event.target.value)}
                placeholder="예: https://www.coupang.com/vp/products/..."
                value={input}
              />

              <p className="mt-3 text-xs text-muted-foreground">
                현재는 URL 기반 추적만 지원합니다. 검색어를 넣으면 저장되지 않습니다.
              </p>

              <button
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground transition-colors hover:bg-[#0052CC] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loading || !input.trim()}
                onClick={() => void handleAnalyze()}
                type="button"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    상품 정보 확인 중
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-5 w-5" />
                    상품 분석하기
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center text-sm font-medium text-emerald-600">
              실제 상품 정보를 확인했습니다. 이 상태로 추적을 시작할 수 있습니다.
            </div>

            <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <div className="flex gap-4">
                <div className="h-24 w-24 overflow-hidden rounded-2xl bg-muted">
                  {preview.image ? (
                    <img alt={preview.name} className="h-full w-full object-cover" src={preview.image} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                      이미지 없음
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-sm font-semibold text-primary">{preview.shop}</p>
                  <h2 className="line-clamp-3 text-lg font-bold leading-tight">{preview.name}</h2>
                  <p className="mt-3 text-3xl font-bold">{preview.currentPrice.toLocaleString()}원</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-muted/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Source URL</p>
                <p className="mt-2 break-all text-sm">{preview.url}</p>
              </div>

              <button
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground transition-colors hover:bg-[#0052CC]"
                onClick={handleAddProduct}
                type="button"
              >
                <Plus className="h-5 w-5" />
                이 상품 추적 시작
              </button>

              <button
                className="mt-3 w-full rounded-2xl border border-border py-3 font-semibold transition-colors hover:bg-accent"
                onClick={() => setPreview(null)}
                type="button"
              >
                다른 링크 등록
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

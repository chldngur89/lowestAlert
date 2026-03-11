import { BellRing, CheckCheck, ChevronRight, TrendingDown } from 'lucide-react';
import { Link } from 'react-router';
import { useProductStore } from '../store/productStore';

function formatAlertTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    month: 'numeric',
    day: 'numeric',
  });
}

export function Alerts() {
  const { alerts, markAlertAsRead, markAllAlertsAsRead } = useProductStore();
  const unreadCount = alerts.filter((alert) => !alert.read).length;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">최근 알림</h1>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}건` : '새로운 가격 하락이 생기면 여기에 쌓입니다.'}
            </p>
          </div>
          {alerts.length > 0 && (
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold transition-colors hover:bg-accent"
              onClick={markAllAlertsAsRead}
              type="button"
            >
              <CheckCheck className="h-4 w-4" />
              전체 읽음
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-2xl p-4">
        {alerts.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-border bg-card p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
              <BellRing className="h-8 w-8" />
            </div>
            <h2 className="mb-2 text-xl font-bold">아직 가격 하락 알림이 없습니다.</h2>
            <p className="text-muted-foreground">상품을 등록하고 가격을 다시 확인하면 실제 하락 이벤트가 기록됩니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <Link
                className={`block rounded-[1.6rem] border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  alert.read ? 'border-border bg-card' : 'border-primary/20 bg-primary/5'
                }`}
                key={alert.id}
                onClick={() => markAlertAsRead(alert.id)}
                to={`/product/${alert.productId}`}
              >
                <div className="mb-3 flex items-start gap-3">
                  <div className="h-16 w-16 overflow-hidden rounded-2xl bg-muted">
                    {alert.image ? (
                      <img alt={alert.productName} className="h-full w-full object-cover" src={alert.image} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        이미지 없음
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatAlertTime(alert.createdAt)}</span>
                      <span>•</span>
                      <span>{alert.shop}</span>
                    </div>
                    <h2 className="mt-1 line-clamp-2 text-sm font-semibold leading-tight">{alert.productName}</h2>
                  </div>
                </div>

                <div className="rounded-2xl bg-red-500/8 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-red-500">
                      <TrendingDown className="h-4 w-4" />
                      가격 하락
                    </span>
                    <span className="text-sm font-bold text-red-500">{alert.discount}%↓</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground line-through">
                        {alert.oldPrice.toLocaleString()}원
                      </span>
                      <span className="text-lg font-bold">{alert.newPrice.toLocaleString()}원</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
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

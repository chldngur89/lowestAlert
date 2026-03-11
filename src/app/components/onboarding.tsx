import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowRight, BellRing, Link2, LineChart } from 'lucide-react';

export function Onboarding() {
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('hasSeenOnboarding') === 'true') {
      navigate('/home', { replace: true });
    }
  }, [navigate]);

  const handleStart = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    navigate('/home', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(0,102,255,0.16),_transparent_45%),linear-gradient(180deg,_rgba(0,102,255,0.05),_transparent_55%)] p-6">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center">
        <div className="mb-10 rounded-[2rem] border border-border bg-card/95 p-8 shadow-xl backdrop-blur">
          <div className="mb-8 inline-flex rounded-3xl bg-primary px-5 py-4 text-primary-foreground shadow-lg">
            <LineChart className="h-10 w-10" />
          </div>

          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.24em] text-primary">
            LowestAlert
          </p>
          <h1 className="mb-3 text-3xl font-bold">상품 링크를 등록하면 가격을 계속 추적합니다.</h1>
          <p className="mb-8 text-muted-foreground">
            Vercel 배포 버전은 상품 상세 URL 기반 추적에 집중했습니다. 가짜 데이터 없이 현재 가격과
            가격 하락 알림이 실제로 동작합니다.
          </p>

          <div className="space-y-4">
            <div className="flex gap-3 rounded-2xl bg-muted/60 p-4">
              <Link2 className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">상품 링크 등록</p>
                <p className="text-sm text-muted-foreground">
                  쿠팡, 11번가, G마켓 등 상품 상세 페이지 URL을 바로 저장합니다.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-2xl bg-muted/60 p-4">
              <LineChart className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">가격 변동 기록</p>
                <p className="text-sm text-muted-foreground">
                  다시 확인할 때마다 이력이 쌓이고 최저가 여부를 바로 보여줍니다.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-2xl bg-muted/60 p-4">
              <BellRing className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">가격 하락 알림</p>
                <p className="text-sm text-muted-foreground">
                  설정한 기준 이상 가격이 내려가면 앱 안 알림과 브라우저 알림을 보냅니다.
                </p>
              </div>
            </div>
          </div>

          <button
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-lg font-semibold text-primary-foreground transition-colors hover:bg-[#0052CC]"
            onClick={handleStart}
          >
            시작하기
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          이미 설정을 마쳤다면 <Link className="font-semibold text-primary" to="/home">바로 홈으로 이동</Link>
        </p>
      </div>
    </div>
  );
}

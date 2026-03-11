import { useEffect } from 'react';
import { Bell, FileText, Monitor, Moon, RotateCcw, Sun, Trash2 } from 'lucide-react';
import { Link } from 'react-router';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { getNotificationPermissionStatus, requestNotificationPermission } from '../services/notifications';
import { useProductStore } from '../store/productStore';
import { useSettingsStore } from '../store/settingsStore';

export function Settings() {
  const { setTheme, theme } = useTheme();
  const { resetAll } = useProductStore();
  const {
    pushEnabled,
    priceDropThreshold,
    resetSettings,
    setPriceDropThreshold,
    setPushEnabled,
    setThemePreference,
    themePreference,
  } = useSettingsStore();

  useEffect(() => {
    setTheme(themePreference);
  }, [setTheme, themePreference]);

  const handlePushToggle = async () => {
    if (!pushEnabled) {
      const permission = await requestNotificationPermission();

      if (permission !== 'granted') {
        toast.error('브라우저 알림 권한이 필요합니다.');
        setPushEnabled(false);
        return;
      }
    }

    setPushEnabled(!pushEnabled);
  };

  const handleThemeChange = (nextTheme: 'light' | 'dark' | 'system') => {
    setTheme(nextTheme);
    setThemePreference(nextTheme);
  };

  const handleResetAll = () => {
    resetAll();
    resetSettings();
    localStorage.removeItem('hasSeenOnboarding');
    toast.success('저장된 추적 상품과 설정을 초기화했습니다.');
  };

  const notificationStatus = getNotificationPermissionStatus();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-xl font-bold">설정</h1>
          <p className="text-xs text-muted-foreground">지원하지 않는 기능은 제거하고 실제 동작 항목만 남겼습니다.</p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <h2 className="font-bold">알림</h2>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-border p-4">
            <div>
              <p className="font-semibold">브라우저 알림</p>
              <p className="text-sm text-muted-foreground">
                가격이 설정 기준 이상 내려가면 앱 내 알림과 브라우저 알림을 표시합니다.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                권한 상태: {notificationStatus === 'unsupported' ? '지원 안 됨' : notificationStatus}
              </p>
            </div>

            <button
              className={`relative h-7 w-12 rounded-full transition-colors ${
                pushEnabled ? 'bg-primary' : 'bg-switch-background'
              }`}
              onClick={() => void handlePushToggle()}
              type="button"
            >
              <span
                className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                  pushEnabled ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-border p-4">
            <label className="mb-2 block text-sm font-semibold">가격 하락 알림 기준</label>
            <select
              className="w-full rounded-xl border border-border bg-input-background px-4 py-3 outline-none transition-colors focus:border-primary"
              onChange={(event) => setPriceDropThreshold(Number(event.target.value))}
              value={priceDropThreshold}
            >
              <option value={3}>3% 이상 하락</option>
              <option value={5}>5% 이상 하락</option>
              <option value={10}>10% 이상 하락</option>
              <option value={15}>15% 이상 하락</option>
            </select>
          </div>
        </section>

        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-bold">테마</h2>
          <div className="grid grid-cols-3 gap-3">
            <button
              className={`rounded-2xl border-2 p-4 transition-colors ${
                theme === 'light' ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onClick={() => handleThemeChange('light')}
              type="button"
            >
              <Sun className="mx-auto h-6 w-6" />
              <span className="mt-2 block text-sm font-semibold">라이트</span>
            </button>
            <button
              className={`rounded-2xl border-2 p-4 transition-colors ${
                theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onClick={() => handleThemeChange('dark')}
              type="button"
            >
              <Moon className="mx-auto h-6 w-6" />
              <span className="mt-2 block text-sm font-semibold">다크</span>
            </button>
            <button
              className={`rounded-2xl border-2 p-4 transition-colors ${
                theme === 'system' ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onClick={() => handleThemeChange('system')}
              type="button"
            >
              <Monitor className="mx-auto h-6 w-6" />
              <span className="mt-2 block text-sm font-semibold">시스템</span>
            </button>
          </div>
        </section>

        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-bold">데이터</h2>
          <div className="space-y-3">
            <button
              className="flex w-full items-center justify-between rounded-2xl border border-border px-4 py-4 text-left transition-colors hover:bg-accent"
              onClick={resetSettings}
              type="button"
            >
              <span className="inline-flex items-center gap-3">
                <RotateCcw className="h-5 w-5 text-muted-foreground" />
                설정만 초기화
              </span>
              <span className="text-sm text-muted-foreground">즉시 반영</span>
            </button>

            <button
              className="flex w-full items-center justify-between rounded-2xl border border-destructive/20 px-4 py-4 text-left text-destructive transition-colors hover:bg-destructive/10"
              onClick={handleResetAll}
              type="button"
            >
              <span className="inline-flex items-center gap-3">
                <Trash2 className="h-5 w-5" />
                추적 상품과 알림 전체 삭제
              </span>
              <span className="text-sm">초기화</span>
            </button>

            <Link
              className="flex w-full items-center justify-between rounded-2xl border border-border px-4 py-4 transition-colors hover:bg-accent"
              to="/legal"
            >
              <span className="inline-flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                법적 정보
              </span>
              <span className="text-sm text-muted-foreground">열기</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

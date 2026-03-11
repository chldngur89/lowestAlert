import { Bell, Home, Plus, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router';

const navItems = [
  { icon: Home, label: '홈', path: '/home' },
  { icon: Plus, label: '추가', path: '/add' },
  { icon: Bell, label: '알림', path: '/alerts' },
  { icon: Settings, label: '설정', path: '/settings' },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-around">
        {navItems.map((item) => {
          const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
          const Icon = item.icon;

          return (
            <Link
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
              key={item.path}
              to={item.path}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

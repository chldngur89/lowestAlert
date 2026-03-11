import { Outlet, Navigate, useLocation } from 'react-router';
import { BottomNav } from './bottom-nav';

export function Layout() {
  const location = useLocation();
  const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');

  // Redirect to onboarding if not seen yet and trying to access app
  if (!hasSeenOnboarding && location.pathname !== '/') {
    return <Navigate to="/" replace />;
  }

  // Don't show bottom nav on product detail page
  const showBottomNav = !location.pathname.startsWith('/product/');

  return (
    <>
      <Outlet />
      {showBottomNav && <BottomNav />}
    </>
  );
}

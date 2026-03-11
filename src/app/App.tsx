import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { ErrorBoundary } from './components/error-boundary';
import { Layout } from './components/layout';
import { Onboarding } from './components/onboarding';
import { AnalyticsTracker } from './services/analytics';

const Home = lazy(() => import('./components/home').then(m => ({ default: m.Home })));
const AddProduct = lazy(() => import('./components/add-product').then(m => ({ default: m.AddProduct })));
const ProductDetail = lazy(() => import('./components/product-detail').then(m => ({ default: m.ProductDetail })));
const Alerts = lazy(() => import('./components/alerts').then(m => ({ default: m.Alerts })));
const Settings = lazy(() => import('./components/settings').then(m => ({ default: m.Settings })));
const Legal = lazy(() => import('./components/legal').then(m => ({ default: m.Legal })));

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066FF]"></div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen bg-background">
        <BrowserRouter>
          <AnalyticsTracker />
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<Onboarding />} />
                <Route element={<Layout />}>
                  <Route path="/home" element={<Home />} />
                  <Route path="/add" element={<AddProduct />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/legal" element={<Legal />} />
                </Route>
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </div>
      <Toaster position="top-center" richColors />
    </ThemeProvider>
  );
}

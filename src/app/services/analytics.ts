import { useEffect } from 'react';
import { useLocation } from 'react-router';
import ReactGA from 'react-ga4';

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX';
const analyticsEnabled =
  !import.meta.env.DEV &&
  Boolean(GA_MEASUREMENT_ID) &&
  !GA_MEASUREMENT_ID.includes('XXXXXXXXXX');

export const initAnalytics = () => {
  if (!analyticsEnabled) {
    console.log('[Analytics] Development mode - GA not initialized');
    return;
  }
  ReactGA.initialize(GA_MEASUREMENT_ID);
};

export const trackPageView = (path: string, title?: string) => {
  if (!analyticsEnabled) {
    console.log('[Analytics] Page view:', path, title);
    return;
  }
  ReactGA.send({ hitType: 'pageview', page: path, title });
};

export const trackEvent = (
  category: string,
  action: string,
  label?: string,
  value?: number
) => {
  if (!analyticsEnabled) {
    console.log('[Analytics] Event:', { category, action, label, value });
    return;
  }
  ReactGA.event({
    category,
    action,
    label,
    value,
  });
};

export function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    trackPageView(location.pathname, document.title);
  }, [location]);

  return null;
}

export const analytics = {
  init: initAnalytics,
  trackPageView,
  trackEvent,
  
  trackProductView: (productId: string, productName: string) => {
    trackEvent('Product', 'view', productName);
  },
  
  trackProductAdd: (productName: string) => {
    trackEvent('Product', 'add', productName);
  },
  
  trackProductRemove: (productName: string) => {
    trackEvent('Product', 'remove', productName);
  },
  
  trackSearch: (keyword: string) => {
    trackEvent('Search', 'submit', keyword);
  },
  
  trackAlertClick: (productName: string) => {
    trackEvent('Alert', 'click', productName);
  },
  
  trackSettingsChange: (settingName: string, value: string) => {
    trackEvent('Settings', 'change', `${settingName}: ${value}`);
  },
  
  trackThemeChange: (theme: string) => {
    trackEvent('Theme', 'change', theme);
  },
  
  trackError: (errorType: string, errorMessage: string) => {
    trackEvent('Error', errorType, errorMessage);
  },
};

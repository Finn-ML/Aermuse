const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export function trackPageView(path: string, title?: string) {
  if (!GA_ID || typeof window.gtag !== 'function') return;
  window.gtag('config', GA_ID, {
    page_path: path,
    page_title: title,
  });
}

export function trackEvent(action: string, category: string, label?: string, value?: number) {
  if (!GA_ID || typeof window.gtag !== 'function') return;
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value,
  });
}

export function trackConversion(name: string, params?: Record<string, unknown>) {
  if (!GA_ID || typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}

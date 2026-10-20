const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID || '';
const allowedKeys = new Set([
  'item_id',
  'item_type',
  'quantity',
  'value',
  'currency',
  'item_count',
  'query_length',
  'result_count',
  'transaction_id',
]);
const piiKeyPattern = /(email|phone|address|full.?name|customer)/i;
const emailPattern = /\b[^@\s]+@[^@\s]+\.[^@\s]+\b/;
const phonePattern = /(?:\+?84|0)\d{8,10}/;

export const sanitizeAnalyticsPayload = (payload = {}) =>
  Object.fromEntries(
    Object.entries(payload).filter(([key, value]) =>
      allowedKeys.has(key)
      && !piiKeyPattern.test(key)
      && !emailPattern.test(String(value))
      && !phonePattern.test(String(value))),
  );

export const trackEvent = (name, payload = {}) => {
  if (!measurementId || typeof window === 'undefined' || typeof window.gtag !== 'function') return false;
  window.gtag('event', name, sanitizeAnalyticsPayload(payload));
  return true;
};

export const initializeAnalytics = () => {
  if (!measurementId || typeof document === 'undefined' || document.getElementById('ga-loader')) return;
  const script = document.createElement('script');
  script.id = 'ga-loader';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, { anonymize_ip: true });
};

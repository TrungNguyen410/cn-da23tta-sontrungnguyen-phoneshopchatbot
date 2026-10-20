import { useEffect } from 'react';

const DEFAULT_TITLE = 'TechPhone | Điện thoại & Phụ kiện';
const DEFAULT_DESCRIPTION = 'TechPhone - Điện thoại và phụ kiện chính hãng, giá tốt, giao nhanh.';

const upsertMeta = (selector, attribute, key, value) => {
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement('meta');
    document.head.appendChild(node);
  }
  node.setAttribute(attribute, key);
  node.content = value;
};

const setCanonical = (value) => {
  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = value;
};

const resetPageMeta = () => {
  const canonicalUrl = new URL(window.location.pathname, window.location.origin).href;
  document.title = DEFAULT_TITLE;
  upsertMeta('meta[name="description"]', 'name', 'description', DEFAULT_DESCRIPTION);
  upsertMeta('meta[property="og:title"]', 'property', 'og:title', DEFAULT_TITLE);
  upsertMeta('meta[property="og:description"]', 'property', 'og:description', DEFAULT_DESCRIPTION);
  upsertMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
  upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
  upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary');
  document.head.querySelector('meta[property="og:image"]')?.remove();
  setCanonical(canonicalUrl);
};

export function usePageMeta({ title, description, image, canonicalPath, type = 'website', structuredData }) {
  useEffect(() => {
    const fullTitle = title ? `${title} | TechPhone` : DEFAULT_TITLE;
    const metaDescription = description || DEFAULT_DESCRIPTION;
    const canonicalUrl = new URL(canonicalPath || window.location.pathname, window.location.origin).href;
    document.title = fullTitle;
    upsertMeta('meta[name="description"]', 'name', 'description', metaDescription);
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', metaDescription);
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', type);
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    if (image) {
      upsertMeta('meta[property="og:image"]', 'property', 'og:image', new URL(image, window.location.origin).href);
    } else {
      document.head.querySelector('meta[property="og:image"]')?.remove();
    }
    setCanonical(canonicalUrl);

    const scriptId = 'page-structured-data';
    document.getElementById(scriptId)?.remove();
    if (structuredData) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }

    return () => {
      document.getElementById(scriptId)?.remove();
      resetPageMeta();
    };
  }, [canonicalPath, description, image, structuredData, title, type]);
}

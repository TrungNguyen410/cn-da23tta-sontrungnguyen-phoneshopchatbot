import { storage } from './storage';

const COMPARE_KEY = 'product_compare_items';
const RECENT_KEY = 'recently_viewed_products';
const notify = (name) => window.dispatchEvent(new CustomEvent(name));

export const getComparedProducts = () => storage.get(COMPARE_KEY, []);

export function toggleComparedProduct(id) {
  const current = getComparedProducts();
  if (!current.includes(id) && current.length >= 4) return current;
  const next = current.includes(id)
    ? current.filter((item) => item !== id)
    : [...current, id];
  storage.set(COMPARE_KEY, next);
  notify('compare-updated');
  return next;
}

export const removeComparedProduct = (id) => toggleComparedProduct(id);

export function recordRecentlyViewedProduct(id) {
  const next = [id, ...storage.get(RECENT_KEY, []).filter((item) => item !== id)].slice(0, 8);
  storage.set(RECENT_KEY, next);
  notify('recent-products-updated');
  return next;
}

export const getRecentlyViewedProducts = () => storage.get(RECENT_KEY, []);

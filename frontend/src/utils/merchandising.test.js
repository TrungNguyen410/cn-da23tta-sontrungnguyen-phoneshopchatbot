import { describe, expect, it } from 'vitest';
import {
  bestDeals,
  bestSellers,
  featuredAccessories,
  recommendAccessories,
  recommendFromHistory,
  recommendProducts,
} from './merchandising';

const item = (id, values = {}) => ({
  id,
  status: 'active',
  stock: 10,
  sold: 0,
  rating: 4,
  price: 100,
  oldPrice: 100,
  discountPercent: 0,
  ...values,
});

describe('homepage merchandising criteria', () => {
  it('sorts best sellers by sold quantity', () => {
    expect(bestSellers([item('a', { sold: 4 }), item('b', { sold: 20 })])[0].id).toBe('b');
  });

  it('only includes meaningful discounts and ranks by money saved', () => {
    const deals = bestDeals([
      item('small', { price: 80, oldPrice: 100, discountPercent: 20 }),
      item('large', { price: 900, oldPrice: 1200, discountPercent: 25 }),
      item('weak', { price: 95, oldPrice: 100, discountPercent: 5 }),
    ]);
    expect(deals.map(({ id }) => id)).toEqual(['large', 'small']);
  });

  it('uses rating and sales together for featured accessories', () => {
    const featured = featuredAccessories([
      item('popular', { rating: 4.6, sold: 200 }),
      item('rated', { rating: 4.9, sold: 30 }),
    ]);
    expect(featured[0].id).toBe('popular');
  });

  it('recommends available products by brand, price, RAM and storage', () => {
    const anchor = item('anchor', { brand: 'Apple', price: 1000, ram: '8GB', storage: '256GB' });
    const close = item('close', { brand: 'Apple', price: 1100, ram: '8GB', storage: '256GB' });
    const far = item('far', { brand: 'Other', price: 400, ram: '4GB', storage: '64GB' });
    const unavailable = item('sold-out', { brand: 'Apple', stock: 0 });
    expect(recommendProducts(anchor, [far, unavailable, close]).map(({ id }) => id)).toEqual(['close', 'far']);
  });

  it('falls back to best sellers when browsing history has no usable anchor', () => {
    expect(recommendFromHistory([item('a', { sold: 3 }), item('b', { sold: 8 })], ['missing'])[0].id).toBe('b');
  });

  it('prioritizes same-brand and universal accessories', () => {
    const accessories = [
      item('same-brand', { brand: 'Apple', category: 'Tai nghe', rating: 4.5 }),
      item('universal', { brand: 'Anker', category: 'Sạc', rating: 4.8 }),
      item('irrelevant', { brand: 'Other', category: 'Loa', rating: 5 }),
    ];
    expect(recommendAccessories({ brand: 'Apple' }, accessories).map(({ id }) => id)).toEqual([
      'same-brand',
      'universal',
    ]);
  });
});

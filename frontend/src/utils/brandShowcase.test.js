import { describe, expect, it } from 'vitest';
import { brandShowcase, FEATURED_BRANDS } from './brandShowcase';

describe('brandShowcase', () => {
  it('keeps only brands that have items, in the featured order', () => {
    const brands = brandShowcase(
      [{ brand: 'Samsung' }, { brand: 'Apple' }],
      [{ brand: 'JBL' }],
    );

    expect(brands.map((brand) => brand.name)).toEqual(['Apple', 'Samsung', 'JBL']);
  });

  it('links phone brands to the phone catalog and accessory-only brands to accessories', () => {
    const brands = brandShowcase([{ brand: 'apple' }], [{ brand: 'Apple' }, { brand: 'Anker' }]);

    expect(brands).toEqual([
      expect.objectContaining({ name: 'Apple', path: '/products?brand=Apple', logo: '/brands/apple.svg' }),
      expect.objectContaining({ name: 'Anker', path: '/accessories?brand=Anker' }),
    ]);
  });

  it('returns nothing when the catalog is empty', () => {
    expect(brandShowcase()).toEqual([]);
    expect(FEATURED_BRANDS.every((brand) => brand.logo.startsWith('/brands/'))).toBe(true);
  });
});

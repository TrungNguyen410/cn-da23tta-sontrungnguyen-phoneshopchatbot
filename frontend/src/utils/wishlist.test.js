import { describe, expect, it } from 'vitest';
import { mergeWishlists, normalizeWishlist, wishlistEquals } from './wishlist';

describe('wishlist synchronization', () => {
  it('keeps server order, appends local-only items and removes duplicates', () => {
    expect(mergeWishlists(['server-1', 'shared'], ['shared', 'local-1'])).toEqual([
      'server-1',
      'shared',
      'local-1',
    ]);
  });

  it('limits synchronized wishlists to 100 valid ids', () => {
    const values = Array.from({ length: 105 }, (_, index) => `item-${index}`);
    expect(normalizeWishlist([...values, null, '', 'item-0'])).toHaveLength(100);
  });

  it('compares ordered contents instead of length alone', () => {
    expect(wishlistEquals(['a'], ['b'])).toBe(false);
    expect(wishlistEquals(['a', 'b'], ['a', 'b'])).toBe(true);
  });
});

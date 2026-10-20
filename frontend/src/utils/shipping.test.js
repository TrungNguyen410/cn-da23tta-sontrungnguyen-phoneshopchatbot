import { describe, expect, it } from 'vitest';
import { getShippingQuote, SHIPPING_PROVINCES } from './shipping';

describe('shipping quotes', () => {
  it('uses the 34 current province-level administrative units', () => {
    expect(SHIPPING_PROVINCES).toHaveLength(34);
    expect(new Set(SHIPPING_PROVINCES).size).toBe(34);
  });

  it('matches the server-side fee rules', () => {
    expect(getShippingQuote({ province: 'TP. Hồ Chí Minh', subtotal: 1000000 }).fee).toBe(20000);
    expect(getShippingQuote({ province: 'Hà Nội', subtotal: 1000000 }).fee).toBe(30000);
    expect(getShippingQuote({ province: 'An Giang', subtotal: 1000000 }).fee).toBe(40000);
    expect(getShippingQuote({ province: 'An Giang', subtotal: 10000000 }).fee).toBe(0);
  });
});

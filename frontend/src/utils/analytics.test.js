import { describe, expect, it } from 'vitest';
import { sanitizeAnalyticsPayload } from './analytics';

describe('analytics privacy', () => {
  it('keeps funnel metrics and removes PII fields or values', () => {
    expect(sanitizeAnalyticsPayload({
      item_id: 'phone-1',
      quantity: 2,
      value: 1000000,
      email: 'buyer@example.com',
      phone: '0912345678',
      transaction_id: 'buyer@example.com',
      address: '123 Nguyen Hue',
    })).toEqual({ item_id: 'phone-1', quantity: 2, value: 1000000 });
  });
});

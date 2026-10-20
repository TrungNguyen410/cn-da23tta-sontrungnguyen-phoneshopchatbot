import { describe, expect, it } from 'vitest';
import {
  getNextOrderStatuses,
  getOrderStatus,
  ORDER_STATUS_TRANSITIONS,
  ORDER_TIMELINE,
} from './orderStatus';

describe('order status contract', () => {
  it('represents delivered orders explicitly', () => {
    expect(getOrderStatus('delivered').label).toBe('Đã giao hàng');
    expect(ORDER_TIMELINE).toContain('delivered');
  });

  it('exposes only legal next states', () => {
    expect(getNextOrderStatuses('pending')).toEqual(['confirmed', 'cancelled']);
    expect(getNextOrderStatuses('shipping')).toEqual(['delivered', 'completed']);
    expect(getNextOrderStatuses('completed')).toEqual([]);
    expect(ORDER_STATUS_TRANSITIONS.cancelled).toEqual([]);
  });
});

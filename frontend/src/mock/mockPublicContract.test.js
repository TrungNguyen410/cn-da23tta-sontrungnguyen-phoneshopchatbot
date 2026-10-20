import { afterEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../utils/constants';
import { storage } from '../utils/storage';
import { mockDb } from './mockDb';

describe('mock public contracts', () => {
  afterEach(() => mockDb.reset());

  it('exposes only active catalog entries publicly while preserving the admin collection', async () => {
    storage.set(STORAGE_KEYS.mockProducts, [
      { id: 'active-phone', name: 'Active', status: 'active' },
      { id: 'inactive-phone', name: 'Inactive', status: 'inactive' },
    ]);

    await expect(mockDb.listPublicCatalog('products')).resolves.toEqual([
      expect.objectContaining({ id: 'active-phone' }),
    ]);
    await expect(mockDb.getPublicCatalogItem('products', 'inactive-phone')).rejects.toThrow();
    await expect(mockDb.list('products')).resolves.toHaveLength(2);
  });

  it('normalizes lookup input and returns only the masked public order shape', async () => {
    storage.set(STORAGE_KEYS.mockOrders, [{
      id: 'order-public',
      orderNumber: 'TP260101',
      createdAt: '2026-01-01T00:00:00.000Z',
      status: 'pending',
      total: 1000000,
      customer: {
        fullName: 'Nguyen Van A',
        phone: '0912345678',
        email: 'private@example.com',
        address: 'Private address',
      },
      items: [{ id: 'phone-1', name: 'Phone', image: '', price: 1000000, quantity: 1, type: 'product' }],
    }]);

    const order = await mockDb.findOrder('tp260101', '+84 912 345 678');

    expect(order.customer).toEqual({ fullName: 'N***', phone: '091****678' });
    expect(order.customer.email).toBeUndefined();
    expect(order.customer.address).toBeUndefined();
    expect(Object.keys(order).sort()).toEqual([
      'createdAt', 'customer', 'estimatedDelivery', 'id', 'items', 'orderNumber', 'shippingProvider',
      'status', 'total', 'trackingNumber',
    ]);
  });
});

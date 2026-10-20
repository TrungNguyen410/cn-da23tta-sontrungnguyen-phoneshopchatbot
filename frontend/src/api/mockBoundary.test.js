import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../utils/constants', async (importOriginal) => ({
  ...(await importOriginal()),
  USE_MOCK: true,
}));

import { accessoryApi } from './accessoryApi';
import { productApi } from './productApi';
import { reviewApi } from './reviewApi';
import { mockDb } from '../mock/mockDb';
import { STORAGE_KEYS } from '../utils/constants';
import { storage } from '../utils/storage';

describe('mock adapter boundaries', () => {
  afterEach(() => mockDb.reset());

  it('keeps inactive catalog items out of public product and accessory adapters but exposes them to admin adapters', async () => {
    storage.set(STORAGE_KEYS.mockProducts, [
      { id: 'product-active', name: 'Active product', status: 'active' },
      { id: 'product-inactive', name: 'Inactive product', status: 'inactive' },
    ]);
    storage.set(STORAGE_KEYS.mockAccessories, [
      { id: 'accessory-active', name: 'Active accessory', status: 'active' },
      { id: 'accessory-inactive', name: 'Inactive accessory', status: 'inactive' },
    ]);

    await expect(productApi.getAll()).resolves.toHaveLength(1);
    await expect(accessoryApi.getAll()).resolves.toHaveLength(1);
    await expect(productApi.getById('product-inactive')).rejects.toThrow();
    await expect(accessoryApi.getById('accessory-inactive')).rejects.toThrow();
    await expect(productApi.getAllAdmin()).resolves.toHaveLength(2);
    await expect(accessoryApi.getAllAdmin()).resolves.toHaveLength(2);
  });

  it('keeps mock catalog mutations available through their existing adapters', async () => {
    const created = await productApi.create({ name: 'Created product', status: 'active' });
    const updated = await productApi.update(created.id, { name: 'Updated product' });

    expect(updated.name).toBe('Updated product');
    await expect(productApi.remove(created.id)).resolves.toEqual({ success: true });
  });

  it('returns only approved reviews publicly while retaining all review states for admins', async () => {
    storage.set(STORAGE_KEYS.mockReviews, [
      { id: 'review-approved', status: 'approved' },
      { id: 'review-pending', status: 'pending' },
      { id: 'review-rejected', status: 'rejected' },
    ]);

    await expect(reviewApi.getAll()).resolves.toEqual([
      expect.objectContaining({ id: 'review-approved' }),
    ]);
    await expect(reviewApi.getAllAdmin()).resolves.toHaveLength(3);
  });
});

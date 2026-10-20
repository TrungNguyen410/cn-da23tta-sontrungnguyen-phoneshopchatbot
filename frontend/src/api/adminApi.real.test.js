import { beforeEach, describe, expect, it, vi } from 'vitest';
import axiosClient from './axiosClient';
import { adminApi } from './adminApi';

vi.mock('../utils/constants', () => ({ USE_MOCK: false }));
vi.mock('../mock/mockDb', () => ({ mockDb: {} }));
vi.mock('./axiosClient', () => ({ default: { get: vi.fn() } }));

describe('adminApi real mode', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes customer search params and preserves the server page response', async () => {
    const response = {
      items: [{ id: 'customer-1' }],
      pagination: { page: 2, limit: 10, total: 11, totalPages: 2 },
    };
    axiosClient.get.mockResolvedValue(response);

    await expect(adminApi.getCustomers({ page: 2, limit: 10, search: 'Lan' })).resolves.toBe(response);
    expect(axiosClient.get).toHaveBeenCalledWith('/admin/customers', {
      params: { page: 2, limit: 10, search: 'Lan' },
    });
  });

  it('passes order search and status params and preserves the server page response', async () => {
    const response = {
      items: [{ id: 'order-1' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
    axiosClient.get.mockResolvedValue(response);

    await expect(adminApi.getOrders({
      page: 1,
      limit: 20,
      search: 'TP26',
      status: 'pending',
    })).resolves.toBe(response);
    expect(axiosClient.get).toHaveBeenCalledWith('/admin/orders', {
      params: { page: 1, limit: 20, search: 'TP26', status: 'pending' },
    });
  });
});

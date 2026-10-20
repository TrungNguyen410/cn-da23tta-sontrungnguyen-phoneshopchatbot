import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb } from '../mock/mockDb';
import { adminApi } from './adminApi';

vi.mock('../utils/constants', () => ({ USE_MOCK: true }));
vi.mock('../mock/mockDb', () => ({ mockDb: { list: vi.fn(), updateUser: vi.fn() } }));
vi.mock('./axiosClient', () => ({ default: { get: vi.fn() } }));

describe('adminApi pagination compatibility', () => {
  beforeEach(() => vi.clearAllMocks());

  it('normalizes mock customers to the server pagination contract', async () => {
    mockDb.list.mockImplementation((name) => Promise.resolve(name === 'users' ? [
      { id: 'customer-1', role: 'customer', password: 'secret' },
      { id: 'customer-2', role: 'customer', password: 'secret' },
    ] : [
      { userId: 'customer-2', status: 'delivered', total: 2500000 },
    ]));

    const response = await adminApi.getCustomers({ page: 2, limit: 1 });

    expect(response).toEqual({
      items: [expect.objectContaining({
        id: 'customer-2',
        orderCount: 1,
        totalSpent: 2500000,
      })],
      pagination: { page: 2, limit: 1, total: 2, totalPages: 2 },
    });
    expect(response.items[0]).not.toHaveProperty('password');
  });

  it('normalizes mock orders to the server pagination contract', async () => {
    mockDb.list.mockResolvedValue([{ id: 'order-1' }, { id: 'order-2' }]);

    await expect(adminApi.getOrders({ page: 1, limit: 1 })).resolves.toEqual({
      items: [{ id: 'order-1' }],
      pagination: { page: 1, limit: 1, total: 2, totalPages: 2 },
    });
  });
});

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../utils/constants';
import { storage } from '../utils/storage';
import { buildDashboard, buildRevenue } from './mockDashboard';
import { mockDb } from './mockDb';

const setSession = (user) => {
  storage.set(STORAGE_KEYS.currentUser, user);
  storage.set(STORAGE_KEYS.token, `token-${user.id}`);
};
const customer = { id: 'user-customer', role: 'customer', status: 'active' };
const admin = { id: 'user-admin', role: 'admin', status: 'active' };
const nextWeek = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const receiver = {
  fullName: 'Trần Thu Hà',
  email: 'ha@example.com',
  phone: '0912345678',
  address: '5 Trần Phú',
  province: 'Hà Nội',
  ward: 'Phường Ba Đình',
};
const activeProduct = () => storage.get(STORAGE_KEYS.mockProducts).find((item) => item.status === 'active' && item.stock > 3);

describe('mock dashboard builder', () => {
  it('groups delivered revenue by Vietnam year, month and day', () => {
    const revenue = buildRevenue([
      { status: 'completed', total: 1000000, createdAt: '2026-02-28T23:00:00.000Z' },
      { status: 'delivered', total: 2000000, createdAt: '2026-03-15T03:00:00.000Z' },
      { status: 'cancelled', total: 9000000, createdAt: '2026-03-15T03:00:00.000Z' },
      { status: 'completed', total: 500000, createdAt: '2025-12-31T18:00:00.000Z' },
    ], { year: 2026, month: 3 });

    expect(revenue.yearly.map((entry) => entry.year)).toEqual([2022, 2023, 2024, 2025, 2026]);
    expect(revenue.yearly.at(-1).total).toBe(3500000);
    expect(revenue.monthly.slice(0, 3)).toEqual([500000, 0, 3000000]);
    expect(revenue.daily).toHaveLength(31);
    expect(revenue.daily[0]).toBe(1000000);
  });

  it('ranks customers, merges accessories into best sellers and warns at 10 or less', () => {
    const dashboard = buildDashboard({
      products: [
        { id: 'p1', name: 'Phone ten', stock: 10, sold: 4, status: 'active' },
        { id: 'p2', name: 'Phone eleven', stock: 11, sold: 1, status: 'active' },
        { id: 'p3', name: 'Phone hidden', stock: 0, sold: 0, status: 'inactive' },
      ],
      accessories: [{ id: 'a1', name: 'Case empty', stock: 0, sold: 9, status: 'active' }],
      users: [
        { id: 'u1', role: 'customer', fullName: 'Lớn' },
        { id: 'u2', role: 'customer', fullName: 'Nhỏ' },
        { id: 'admin', role: 'admin', fullName: 'Admin' },
      ],
      orders: [
        { userId: 'u2', status: 'completed', total: 100, createdAt: '2026-01-02T00:00:00.000Z' },
        { userId: 'u1', status: 'completed', total: 300, createdAt: '2026-01-03T00:00:00.000Z' },
        { userId: 'u1', status: 'pending', total: 9000, createdAt: '2026-01-04T00:00:00.000Z' },
        { userId: 'admin', status: 'completed', total: 99999, createdAt: '2026-01-04T00:00:00.000Z' },
      ],
      year: 2026,
      month: 1,
    });

    expect(dashboard.topCustomers.map((entry) => [entry.fullName, entry.totalSpent])).toEqual([['Lớn', 300], ['Nhỏ', 100]]);
    expect(dashboard.topProducts.map((item) => [item.name, item.type])).toEqual([
      ['Case empty', 'accessory'],
      ['Phone ten', 'product'],
      ['Phone eleven', 'product'],
    ]);
    expect(dashboard.lowStock).toMatchObject({ threshold: 10, total: 2, outOfStock: 1 });
    expect(dashboard.lowStock.items.map((item) => item.name)).toEqual(['Case empty', 'Phone ten']);
  });
});

describe('mock customer rules', () => {
  beforeEach(() => {
    mockDb.reset();
    mockDb.list('products');
    mockDb.list('users');
  });

  afterEach(() => {
    mockDb.reset();
    storage.remove(STORAGE_KEYS.currentUser);
    storage.remove(STORAGE_KEYS.token);
  });

  it('lets a customer cancel only a pending order of their own', async () => {
    setSession(customer);
    const product = activeProduct();
    const order = await mockDb.createOrder({ items: [{ productId: product.id, quantity: 1 }], customer: receiver });

    await expect(mockDb.cancelMyOrder(order.id)).resolves.toMatchObject({ status: 'cancelled' });

    const second = await mockDb.createOrder({ items: [{ productId: product.id, quantity: 1 }], customer: receiver });
    setSession(admin);
    await mockDb.updateOrderStatus(second.id, 'confirmed');
    setSession(customer);
    await expect(mockDb.cancelMyOrder(second.id)).rejects.toMatchObject({ response: { status: 400 } });

    setSession({ id: 'user-3', role: 'customer', status: 'active' });
    await expect(mockDb.cancelMyOrder(second.id)).rejects.toMatchObject({ response: { status: 403 } });
  });

  it('keeps the saved address unless the customer asks to replace it', async () => {
    setSession(customer);
    const product = activeProduct();
    const savedBefore = storage.get(STORAGE_KEYS.mockUsers).find((user) => user.id === customer.id).shippingAddress;

    const order = await mockDb.createOrder({ items: [{ productId: product.id, quantity: 1 }], customer: receiver, saveAddress: false });
    expect(order).not.toHaveProperty('saveAddress');
    expect(storage.get(STORAGE_KEYS.mockUsers).find((user) => user.id === customer.id).shippingAddress).toEqual(savedBefore);

    await mockDb.createOrder({ items: [{ productId: product.id, quantity: 1 }], customer: receiver, saveAddress: true });
    expect(storage.get(STORAGE_KEYS.mockUsers).find((user) => user.id === customer.id).shippingAddress).toEqual(receiver);
  });

  it('shows and accepts a gift voucher only for the gifted customer', async () => {
    setSession(admin);
    const gift = await mockDb.giftVoucher(customer.id, { type: 'fixed', value: 100000, endDate: nextWeek() });
    expect(gift.code).toMatch(/^TRIAN[A-Z2-9]{6}$/);

    setSession(customer);
    await expect(mockDb.myVouchers()).resolves.toEqual([expect.objectContaining({ code: gift.code, status: 'available' })]);
    await expect(mockDb.checkVoucher(gift.code, 1000000)).resolves.toMatchObject({ code: gift.code });

    setSession({ id: 'user-3', role: 'customer', status: 'active' });
    await expect(mockDb.myVouchers()).resolves.toEqual([]);
    await expect(mockDb.checkVoucher(gift.code, 1000000)).rejects.toThrow('Mã giảm giá không hợp lệ');

    await expect(mockDb.giftVoucher(customer.id, { type: 'fixed', value: 100000, endDate: nextWeek() }))
      .rejects.toMatchObject({ response: { status: 403 } });
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import { mockDb } from '../mock/mockDb';
import { STORAGE_KEYS } from './constants';
import { calculateVoucherDiscount } from './checkoutPricing';
import { storage } from './storage';

describe('calculateVoucherDiscount', () => {
  it('caps a shipping voucher at the province-specific fee', () => {
    const voucher = { type: 'shipping', value: 30000 };
    expect(calculateVoucherDiscount(voucher, 1000000, 20000)).toBe(20000);
  });

  it('invalidates a voucher after subtotal drops below its minimum', () => {
    const voucher = { type: 'fixed', value: 200000, minOrder: 3000000 };
    expect(calculateVoucherDiscount(voucher, 2000000, 30000)).toBe(0);
  });
});

describe('mock checkout invariants', () => {
  const setActiveSession = (id = 'user-customer') => {
    storage.set(STORAGE_KEYS.currentUser, { id });
    storage.set(STORAGE_KEYS.token, `trusted-token-${id}`);
  };

  beforeEach(() => {
    mockDb.reset();
    storage.remove(STORAGE_KEYS.currentUser);
    storage.remove(STORAGE_KEYS.token);
    storage.set(STORAGE_KEYS.mockProducts, [
      {
        id: 'current-phone',
        name: 'Current Phone',
        image: 'phone.png',
        price: 1000000,
        stock: 2,
        sold: 0,
        status: 'active',
      },
    ]);
    storage.set(STORAGE_KEYS.mockVouchers, [
      {
        code: 'SHIP',
        type: 'shipping',
        value: 30000,
        minOrder: 0,
        quantity: 1,
        used: 0,
        active: true,
        startDate: '2020-01-01',
        endDate: '2099-12-31',
      },
    ]);
    setActiveSession();
  });

  it('uses current price and stock and decrements only once for an idempotency key', async () => {
    const payload = {
      userId: 'user-1',
      items: [{ id: 'current-phone', price: 1, quantity: 1 }],
      customer: {
        fullName: 'Test User',
        email: 'test@example.com',
        phone: '0911111111',
        address: 'Test address',
        province: 'TP. Hồ Chí Minh',
      },
      subtotal: 1,
      shippingFee: 0,
      discount: 0,
      total: 1,
      voucherCode: 'SHIP',
    };

    const first = await mockDb.createOrder(payload, 'same-attempt');
    const second = await mockDb.createOrder(payload, 'same-attempt');

    expect(second.id).toBe(first.id);
    expect(first.items[0].price).toBe(1000000);
    expect(first.subtotal).toBe(1000000);
    expect(first.shippingFee).toBe(20000);
    expect(first.discount).toBe(20000);
    expect(first.total).toBe(1000000);
    expect(storage.get(STORAGE_KEYS.mockProducts)[0].stock).toBe(1);
  });

  it('scopes the same idempotency key to the authenticated mock customer', async () => {
    const payload = {
      items: [{ id: 'current-phone', quantity: 1 }],
      customer: {
        fullName: 'Guest One',
        email: 'one@example.com',
        phone: '0911111111',
        address: 'Test address',
      },
    };

    const first = await mockDb.createOrder(payload, 'shared-key');
    const second = await mockDb.createOrder(
      {
        ...payload,
        customer: { ...payload.customer, email: 'two@example.com', phone: '0922222222' },
      },
      'shared-key',
    );

    expect(second.id).toBe(first.id);
  });

  it('ignores a client-supplied user id when scoping a mock checkout key', async () => {
    const payload = {
      userId: 'attacker-controlled-user',
      items: [{ id: 'current-phone', quantity: 1 }],
      customer: {
        fullName: 'Guest Customer',
        email: 'guest@example.com',
        phone: '0911111111',
        address: 'Test address',
      },
    };

    const first = await mockDb.createOrder(payload, 'guest-key');
    const second = await mockDb.createOrder(
      { ...payload, userId: 'different-attacker-controlled-user' },
      'guest-key',
    );

    expect(second.id).toBe(first.id);
    expect(storage.get(STORAGE_KEYS.mockProducts)[0].stock).toBe(1);
  });

  it('scopes a mock checkout key to the authenticated mock user', async () => {
    const payload = {
      items: [{ id: 'current-phone', quantity: 1 }],
      customer: {
        fullName: 'Shared Customer',
        email: 'shared@example.com',
        phone: '0911111111',
        address: 'Test address',
      },
    };

    setActiveSession('user-customer');
    const first = await mockDb.createOrder(payload, 'authenticated-key');
    setActiveSession('user-3');
    const second = await mockDb.createOrder(payload, 'authenticated-key');

    expect(second.id).not.toBe(first.id);
    expect(storage.get(STORAGE_KEYS.mockProducts)[0].stock).toBe(0);
  });

  it('persists authoritative mock ownership and lists orders for that owner', async () => {
    setActiveSession();
    const order = await mockDb.createOrder({
      userId: 'attacker-owner',
      items: [{ id: 'current-phone', quantity: 1 }],
      customer: {
        fullName: 'Owned Customer',
        email: 'owned@example.com',
        phone: '0911111111',
        address: 'Test address',
      },
    }, 'owned-key');

    expect(order.userId).toBe('user-customer');
    expect(await mockDb.ordersForUser('user-customer')).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: order.id, userId: 'user-customer' }),
    ]));
    expect(await mockDb.ordersForUser('attacker-owner')).toEqual([]);
  });

  it('rejects an unauthenticated mock checkout before inventory changes', async () => {
    storage.remove(STORAGE_KEYS.currentUser);
    storage.remove(STORAGE_KEYS.token);
    await expect(mockDb.createOrder({
      userId: 'attacker-owner',
      items: [{ id: 'current-phone', quantity: 1 }],
      customer: {
        fullName: 'Guest Customer',
        email: 'guest-owner@example.com',
        phone: '0911111111',
        address: 'Test address',
      },
    }, 'guest-owned-key')).rejects.toThrow();

    expect(storage.get(STORAGE_KEYS.mockProducts)[0].stock).toBe(2);
  });

  it('rejects a stale mock user without a token', async () => {
    const payload = {
      items: [{ id: 'current-phone', quantity: 1 }],
      customer: {
        fullName: 'Guest Customer',
        email: 'guest@example.com',
        phone: '0911111111',
        address: 'Test address',
      },
    };

    storage.set(STORAGE_KEYS.currentUser, { id: 'stale-user-1' });
    await expect(mockDb.createOrder(payload, 'stale-session-key')).rejects.toThrow();
    expect(storage.get(STORAGE_KEYS.mockProducts)[0].stock).toBe(2);
  });

  it('rejects direct card checkout before inventory changes', async () => {
    await expect(mockDb.createOrder({
      paymentMethod: 'card',
      items: [{ id: 'current-phone', quantity: 1 }],
      customer: { phone: '0911111111' },
    }, 'direct-card')).rejects.toThrow();

    expect(storage.get(STORAGE_KEYS.mockProducts)[0].stock).toBe(2);
  });

  it('allows an active session to create a VNPay checkout', async () => {
    const checkout = await mockDb.createVnpayCheckout({
      items: [{ id: 'current-phone', quantity: 1 }],
      customer: { phone: '0911111111' },
    }, 'vnpay-active');

    expect(checkout.order.userId).toBe('user-customer');
    expect(checkout.order.paymentMethod).toBe('card');
  });

  it('rejects an inactive catalog item without decrementing stock', async () => {
    storage.set(STORAGE_KEYS.mockProducts, [
      {
        ...storage.get(STORAGE_KEYS.mockProducts)[0],
        status: 'inactive',
      },
    ]);

    await expect(mockDb.createOrder({
      items: [{ id: 'current-phone', quantity: 1 }],
      customer: {
        email: 'guest@example.com',
        phone: '0911111111',
      },
    }, 'inactive-key')).rejects.toThrow('Sản phẩm hiện không khả dụng');

    expect(storage.get(STORAGE_KEYS.mockProducts)[0].stock).toBe(2);
  });

  it('rejects insufficient current stock without decrementing inventory', async () => {
    await expect(mockDb.createOrder({
      items: [{ id: 'current-phone', quantity: 3 }],
      customer: {
        email: 'guest@example.com',
        phone: '0911111111',
      },
    }, 'stock-key')).rejects.toThrow('không đủ số lượng tồn kho');

    expect(storage.get(STORAGE_KEYS.mockProducts)[0].stock).toBe(2);
  });

  it('enforces limited voucher usage across distinct mock orders', async () => {
    const payload = {
      items: [{ id: 'current-phone', quantity: 1 }],
      customer: {
        fullName: 'Voucher Guest',
        email: 'voucher@example.com',
        phone: '0911111111',
        address: 'Test address',
      },
      voucherCode: 'SHIP',
    };

    await mockDb.createOrder(payload, 'limited-voucher-1');
    await expect(mockDb.createOrder(
      {
        ...payload,
        customer: { ...payload.customer, email: 'other@example.com', phone: '0922222222' },
      },
      'limited-voucher-2',
    )).rejects.toThrow();

    expect(storage.get(STORAGE_KEYS.mockVouchers)[0].used).toBe(1);
    expect(storage.get(STORAGE_KEYS.mockProducts)[0].stock).toBe(1);
  });

  it('restores mock inventory and voucher usage exactly once on cancellation', async () => {
    const order = await mockDb.createOrder({
      items: [{ id: 'current-phone', quantity: 1 }],
      customer: {
        fullName: 'Voucher Guest',
        email: 'cancel@example.com',
        phone: '0933333333',
        address: 'Test address',
      },
      voucherCode: 'SHIP',
    }, 'mock-cancel');

    await mockDb.updateOrderStatus(order.id, 'cancelled');
    await mockDb.updateOrderStatus(order.id, 'cancelled');

    expect(storage.get(STORAGE_KEYS.mockProducts)[0]).toEqual(
      expect.objectContaining({ stock: 2, sold: 0 }),
    );
    expect(storage.get(STORAGE_KEYS.mockVouchers)[0].used).toBe(0);
  });

  it('rejects mock cancellation for paid, shipping, and completed orders', async () => {
    storage.set(STORAGE_KEYS.mockOrders, [
      {
        id: 'paid-order',
        status: 'confirmed',
        paymentStatus: 'paid',
        items: [{ id: 'current-phone', productId: 'current-phone', type: 'product', quantity: 1 }],
      },
      {
        id: 'shipping-order',
        status: 'shipping',
        paymentStatus: 'pending',
        items: [{ id: 'current-phone', productId: 'current-phone', type: 'product', quantity: 1 }],
      },
      {
        id: 'completed-order',
        status: 'completed',
        paymentStatus: 'paid',
        items: [{ id: 'current-phone', productId: 'current-phone', type: 'product', quantity: 1 }],
      },
    ]);

    await expect(mockDb.updateOrderStatus('paid-order', 'cancelled')).rejects.toThrow();
    await expect(mockDb.updateOrderStatus('shipping-order', 'cancelled')).rejects.toThrow();
    await expect(mockDb.updateOrderStatus('completed-order', 'cancelled')).rejects.toThrow();

    expect(storage.get(STORAGE_KEYS.mockProducts)[0]).toEqual(
      expect.objectContaining({ stock: 2, sold: 0 }),
    );
    expect(storage.get(STORAGE_KEYS.mockOrders)).toEqual([
      expect.objectContaining({ id: 'paid-order', status: 'confirmed' }),
      expect.objectContaining({ id: 'shipping-order', status: 'shipping' }),
      expect.objectContaining({ id: 'completed-order', status: 'completed' }),
    ]);
  });
});

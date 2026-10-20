import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../utils/constants';
import { storage } from '../utils/storage';
import { mockDb } from './mockDb';

const manualOrder = {
  id: 'manual-order',
  orderNumber: 'TP260805MOCK',
  status: 'pending',
  paymentMethod: 'bank',
  paymentStatus: 'pending',
  paymentReference: '',
};

const setSession = (user) => {
  storage.set(STORAGE_KEYS.currentUser, user);
  storage.set(STORAGE_KEYS.token, `token-${user.id}`);
};

describe('mock manual payment reconciliation contract', () => {
  beforeEach(() => {
    mockDb.reset();
    storage.set(STORAGE_KEYS.mockOrders, [manualOrder]);
    setSession({ id: 'user-admin', role: 'admin', status: 'active' });
  });

  afterEach(() => {
    mockDb.reset();
    storage.remove(STORAGE_KEYS.currentUser);
    storage.remove(STORAGE_KEYS.token);
  });

  it('rejects reconciliation by a non-admin without mutating the order', async () => {
    setSession({ id: 'user-customer', role: 'customer', status: 'active' });

    await expect(mockDb.reconcileManualPayment('manual-order', {
      status: 'paid',
      reference: 'BANK-01',
      note: '',
    })).rejects.toMatchObject({ response: { status: 403 } });

    expect(storage.get(STORAGE_KEYS.mockOrders)[0]).toEqual(manualOrder);
  });

  it('rejects reconciliation by an inactive admin without mutating the order', async () => {
    setSession({ id: 'user-admin', role: 'admin', status: 'inactive' });

    await expect(mockDb.reconcileManualPayment('manual-order', {
      status: 'paid',
      reference: 'BANK-01',
      note: '',
    })).rejects.toMatchObject({ response: { status: 403 } });

    expect(storage.get(STORAGE_KEYS.mockOrders)[0]).toEqual(manualOrder);
  });

  it.each([
    ['an invalid status', { status: 'refunded', reference: 'BANK-01', note: '' }],
    ['confirmedBy', { status: 'paid', reference: 'BANK-01', note: '', confirmedBy: 'attacker' }],
    ['confirmedAt', { status: 'paid', reference: 'BANK-01', note: '', confirmedAt: '2000-01-01' }],
    ['an unknown field', { status: 'paid', reference: 'BANK-01', note: '', unknown: true }],
    ['a 151-character reference', { status: 'paid', reference: 'R'.repeat(151), note: '' }],
    ['a 1001-character note', { status: 'failed', reference: '', note: 'N'.repeat(1001) }],
    ['a blank paid reference', { status: 'paid', reference: '   ', note: '' }],
  ])('rejects %s using the same bounded DTO as the backend', async (_label, payload) => {
    await expect(mockDb.reconcileManualPayment('manual-order', payload))
      .rejects.toMatchObject({ response: { status: 422 } });

    expect(storage.get(STORAGE_KEYS.mockOrders)[0]).toEqual(manualOrder);
  });

  it('reconciles for an admin while deriving actor and timestamp internally', async () => {
    const before = Date.now();

    const result = await mockDb.reconcileManualPayment('manual-order', {
      status: 'paid',
      reference: ' BANK-20260805-01 ',
      note: ' Matched statement ',
    });

    expect(result).toMatchObject({
      id: 'manual-order',
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentReference: 'BANK-20260805-01',
      paymentAudit: {
        confirmedBy: 'user-admin',
        note: 'Matched statement',
      },
    });
    expect(new Date(result.paymentAudit.confirmedAt).getTime()).toBeGreaterThanOrEqual(before);
  });
});

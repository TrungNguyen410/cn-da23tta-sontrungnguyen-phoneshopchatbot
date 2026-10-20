import { USE_MOCK } from '../utils/constants';
import { mockDb } from '../mock/mockDb';
import axiosClient from './axiosClient';

export const paymentApi = {
  getConfig: () =>
    USE_MOCK
      ? Promise.resolve({
          providers: {
            cod: { enabled: true },
            bank: {
              enabled: true,
              display: {
                bankName: 'TechPhone Demo Bank',
                bankBin: '970436',
                accountNumber: '0000000000',
                accountName: 'TECHPHONE STORE DEMO',
              },
            },
            momo: {
              enabled: true,
              display: { phone: '0900000000', accountName: 'TECHPHONE STORE DEMO' },
            },
            vnpay: { enabled: true, mode: 'sandbox' },
          },
        })
      : axiosClient.get('/payments/config'),
  createVnpayCheckout: (payload, idempotencyKey) =>
    USE_MOCK
      ? mockDb.createVnpayCheckout(payload, idempotencyKey)
      : axiosClient.post('/payments/vnpay/checkout', payload, {
          headers: { 'Idempotency-Key': idempotencyKey },
        }),
  verifyVnpayResult: (proof) =>
    USE_MOCK
      ? Promise.reject(new Error('Mock payment results are verified locally'))
      : axiosClient.post('/payments/vnpay/result', { proof }),
  reconcileManualPayment: (orderId, payload) =>
    USE_MOCK
      ? mockDb.reconcileManualPayment(orderId, payload)
      : axiosClient.put(`/admin/orders/${orderId}/payment`, payload),
};

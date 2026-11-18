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
                bankName: 'PhoneShopAI Demo Bank',
                bankBin: '970436',
                accountNumber: '0000000000',
                accountName: 'PHONESHOPAI DEMO',
              },
            },
          },
        })
      : axiosClient.get('/payments/config'),
  reconcileManualPayment: (orderId, payload) =>
    USE_MOCK
      ? mockDb.reconcileManualPayment(orderId, payload)
      : axiosClient.put(`/admin/orders/${orderId}/payment`, payload),
};

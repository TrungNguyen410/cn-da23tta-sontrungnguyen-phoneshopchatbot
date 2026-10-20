import { USE_MOCK } from '../utils/constants';
import { mockDb } from '../mock/mockDb';
import axiosClient from './axiosClient';

export const voucherApi = {
  check: (code, subtotal) =>
    USE_MOCK ? mockDb.checkVoucher(code, subtotal) : axiosClient.post('/vouchers/check', { code, subtotal }),
  getAll: () => (USE_MOCK ? mockDb.list('vouchers') : axiosClient.get('/admin/vouchers')),
  create: (payload) => (USE_MOCK ? mockDb.save('vouchers', payload) : axiosClient.post('/admin/vouchers', payload)),
  update: (id, payload) =>
    USE_MOCK ? mockDb.save('vouchers', { ...payload, id }) : axiosClient.put(`/admin/vouchers/${id}`, payload),
  remove: (id) => (USE_MOCK ? mockDb.remove('vouchers', id) : axiosClient.delete(`/admin/vouchers/${id}`)),
};

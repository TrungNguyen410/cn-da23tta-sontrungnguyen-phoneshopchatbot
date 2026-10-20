import { USE_MOCK } from '../utils/constants';
import { mockDb } from '../mock/mockDb';
import axiosClient from './axiosClient';
import { adminApi } from './adminApi';

export const orderApi = {
  create: (payload, idempotencyKey) =>
    USE_MOCK
      ? mockDb.createOrder(payload, idempotencyKey)
      : axiosClient.post('/orders', payload, {
          headers: { 'Idempotency-Key': idempotencyKey },
        }),
  getMyOrders: (userId) =>
    USE_MOCK ? mockDb.ordersForUser(userId) : axiosClient.get('/orders/my-orders'),
  getById: (id) => (USE_MOCK ? mockDb.get('orders', id) : axiosClient.get(`/orders/${id}`)),
  cancel: (id) =>
    USE_MOCK ? mockDb.updateOrderStatus(id, 'cancelled') : axiosClient.put(`/orders/${id}/cancel`),
  lookup: (orderNumber, phone) =>
    USE_MOCK
      ? mockDb.findOrder(orderNumber, phone)
      : axiosClient.get('/orders/lookup', { params: { orderNumber, phone } }),
  getAllAdmin: (params) => adminApi.getOrders(params),
  updateStatus: (id, status) =>
    USE_MOCK
      ? mockDb.updateOrderStatus(id, status)
      : axiosClient.put(`/admin/orders/${id}/status`, { status }),
  updateShipping: (id, payload) =>
    USE_MOCK
      ? mockDb.updateOrderShipping(id, payload)
      : axiosClient.put(`/admin/orders/${id}`, payload),
};

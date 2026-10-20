import { USE_MOCK } from '../utils/constants';
import { mockDb } from '../mock/mockDb';
import axiosClient from './axiosClient';

const DEFAULT_PAGE_SIZE = 20;

const normalizePage = (response, { page, limit }) => {
  if (response && Array.isArray(response.items) && response.pagination) return response;
  const allItems = Array.isArray(response) ? response : [];
  const start = (page - 1) * limit;
  return {
    items: allItems.slice(start, start + limit),
    pagination: {
      page,
      limit,
      total: allItems.length,
      totalPages: Math.ceil(allItems.length / limit),
    },
  };
};

const resourceApi = (name, endpoint) => ({
  getAll: () => (USE_MOCK ? mockDb.list(name) : axiosClient.get(`/admin/${endpoint}`)),
  create: (payload) =>
    USE_MOCK ? mockDb.save(name, payload) : axiosClient.post(`/admin/${endpoint}`, payload),
  update: (id, payload) =>
    USE_MOCK ? mockDb.save(name, { ...payload, id }) : axiosClient.put(`/admin/${endpoint}/${id}`, payload),
  remove: (id) =>
    USE_MOCK ? mockDb.remove(name, id) : axiosClient.delete(`/admin/${endpoint}/${id}`),
});

export const adminApi = {
  getDashboard: () => (USE_MOCK ? mockDb.dashboard() : axiosClient.get('/admin/dashboard')),
  getCustomers: async ({ page = 1, limit = DEFAULT_PAGE_SIZE, search = '' } = {}) => {
    if (!USE_MOCK) {
      const response = await axiosClient.get('/admin/customers', { params: { page, limit, search } });
      return normalizePage(response, { page, limit });
    }
    const users = await mockDb.list('users');
    const orders = await mockDb.list('orders');
    const customers = users
      .filter((user) => user.role === 'customer')
      .map(({ password: _password, ...user }) => {
        const userOrders = orders.filter((order) => order.userId === user.id);
        return {
          ...user,
          orderCount: userOrders.length,
          totalSpent: userOrders
            .filter((order) => ['completed', 'delivered'].includes(order.status))
            .reduce((sum, order) => sum + order.total, 0),
        };
      })
      .filter((user) => !search || `${user.fullName || ''} ${user.email || ''} ${user.phone || ''}`
        .toLowerCase().includes(search.toLowerCase()));
    return normalizePage(customers, { page, limit });
  },
  getOrders: async ({ page = 1, limit = DEFAULT_PAGE_SIZE, search = '', status = '' } = {}) => {
    const response = USE_MOCK
      ? (await mockDb.list('orders')).filter((order) => (
          (!status || order.status === status)
          && (!search || `${order.orderNumber || ''} ${order.customer?.fullName || ''} ${order.customer?.email || ''} ${order.customer?.phone || ''}`
            .toLowerCase().includes(search.toLowerCase()))
        ))
      : await axiosClient.get('/admin/orders', { params: { page, limit, search, status } });
    return normalizePage(response, { page, limit });
  },
  updateCustomer: (id, payload) =>
    USE_MOCK ? mockDb.updateUser(id, payload) : axiosClient.put(`/admin/customers/${id}`, payload),
  categories: resourceApi('categories', 'categories'),
  brands: resourceApi('brands', 'brands'),
};

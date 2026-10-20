import { USE_MOCK } from '../utils/constants';
import { mockDb } from '../mock/mockDb';
import axiosClient from './axiosClient';

export const reviewApi = {
  getAll: async () => {
    if (!USE_MOCK) return axiosClient.get('/reviews');
    return (await mockDb.list('reviews')).filter((review) => review.status === 'approved');
  },
  getByProduct: async (productId) => {
    if (!USE_MOCK) return axiosClient.get(`/reviews/product/${productId}`);
    const reviews = await mockDb.list('reviews');
    return reviews.filter((review) => review.productId === productId && review.status === 'approved');
  },
  getByAccessory: async (accessoryId) => {
    if (!USE_MOCK) return axiosClient.get(`/reviews/accessory/${accessoryId}`);
    const reviews = await mockDb.list('reviews');
    return reviews.filter((review) => review.accessoryId === accessoryId && review.status === 'approved');
  },
  create: (payload) => (USE_MOCK ? mockDb.save('reviews', payload) : axiosClient.post('/reviews', payload)),
  getAllAdmin: () => (USE_MOCK ? mockDb.list('reviews') : axiosClient.get('/admin/reviews')),
  approve: (id) =>
    USE_MOCK ? mockDb.save('reviews', { id, status: 'approved' }) : axiosClient.put(`/admin/reviews/${id}/approve`),
  reject: (id) =>
    USE_MOCK ? mockDb.save('reviews', { id, status: 'rejected' }) : axiosClient.put(`/admin/reviews/${id}/reject`),
  remove: (id) => (USE_MOCK ? mockDb.remove('reviews', id) : axiosClient.delete(`/admin/reviews/${id}`)),
};

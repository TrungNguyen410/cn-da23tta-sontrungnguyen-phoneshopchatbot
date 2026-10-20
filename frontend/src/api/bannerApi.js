import { USE_MOCK } from '../utils/constants';
import { mockDb } from '../mock/mockDb';
import axiosClient from './axiosClient';

export const bannerApi = {
  getAll: () => (USE_MOCK ? mockDb.list('banners') : axiosClient.get('/banners')),
  create: (payload) => (USE_MOCK ? mockDb.save('banners', payload) : axiosClient.post('/admin/banners', payload)),
  update: (id, payload) =>
    USE_MOCK ? mockDb.save('banners', { ...payload, id }) : axiosClient.put(`/admin/banners/${id}`, payload),
  remove: (id) => (USE_MOCK ? mockDb.remove('banners', id) : axiosClient.delete(`/admin/banners/${id}`)),
};

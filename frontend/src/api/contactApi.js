import { USE_MOCK } from '../utils/constants';
import { mockDb } from '../mock/mockDb';
import axiosClient from './axiosClient';

export const contactApi = {
  create: (payload) =>
    USE_MOCK ? mockDb.save('contacts', { ...payload, status: 'new', adminNote: '' }) : axiosClient.post('/contacts', payload),
  getAllAdmin: () => (USE_MOCK ? mockDb.list('contacts') : axiosClient.get('/contacts')),
  update: (id, payload) =>
    USE_MOCK ? mockDb.save('contacts', { ...payload, id }) : axiosClient.put(`/contacts/${id}`, payload),
  remove: (id) =>
    USE_MOCK ? mockDb.remove('contacts', id) : axiosClient.delete(`/contacts/${id}`),
};

import { USE_MOCK } from '../utils/constants';
import { mockDb } from '../mock/mockDb';
import axiosClient from './axiosClient';

const skipAuthRefresh = { skipAuthRefresh: true };

export const authApi = {
  login: (payload) =>
    USE_MOCK
      ? mockDb.login(payload.identifier, payload.password)
      : axiosClient.post('/auth/login', payload, skipAuthRefresh),
  refresh: (refreshToken) =>
    axiosClient.post('/auth/refresh', { refreshToken }, skipAuthRefresh),
  logout: (refreshToken) =>
    USE_MOCK ? Promise.resolve() : axiosClient.post('/auth/logout', { refreshToken }, skipAuthRefresh),
  register: ({ fullName, phone, password }) =>
    USE_MOCK
      ? mockDb.register({ fullName, phone, password })
      : axiosClient.post('/auth/register', { fullName, phone, password }, skipAuthRefresh),
  // Google/Facebook (real backend only): trade the Firebase ID token for our own session.
  loginWithSocial: (idToken) =>
    axiosClient.post('/auth/social', { idToken }, skipAuthRefresh),
  requestPasswordReset: ({ identifier }) =>
    USE_MOCK
      ? mockDb.requestPasswordReset(identifier)
      : axiosClient.post('/auth/forgot-password/request-otp', { identifier }, skipAuthRefresh),
  resetPassword: ({ identifier, otp, newPassword }) =>
    USE_MOCK
      ? mockDb.resetPassword(identifier, otp, newPassword)
      : axiosClient.post(
          '/auth/forgot-password/reset',
          { identifier, otp, newPassword },
          skipAuthRefresh,
        ),
  me: (user) => (USE_MOCK ? Promise.resolve(user) : axiosClient.get('/auth/me')),
  updateProfile: (userId, payload) =>
    USE_MOCK ? mockDb.updateProfile(userId, payload) : axiosClient.put('/auth/profile', payload),
  changePassword: (userId, payload) =>
    USE_MOCK
      ? mockDb.changePassword(userId, payload.currentPassword, payload.newPassword)
      : axiosClient.put('/auth/change-password', payload),
  getWishlist: (userId) => (USE_MOCK ? mockDb.getWishlist(userId) : axiosClient.get('/auth/wishlist')),
  updateWishlist: (userId, items) =>
    (USE_MOCK ? mockDb.updateWishlist(userId, items) : axiosClient.put('/auth/wishlist', { items })),
};

import axios from 'axios';
import { API_URL, STORAGE_KEYS } from '../utils/constants';
import {
  clearAuthSession,
  getAuthSessionRevision,
  persistAuthSession,
} from '../utils/authSession';
import { storage } from '../utils/storage';
import { authApi } from './authApi';

const axiosClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise = null;

const refreshCancelled = () => Object.assign(
  new Error('Phiên đăng nhập đã được thay đổi'),
  { code: 'AUTH_REFRESH_CANCELLED' },
);

const isRefreshRequest = (config) => {
  try {
    return new URL(config?.url || '', API_URL).pathname.endsWith('/auth/refresh');
  } catch {
    return false;
  }
};

const redirectToLogin = () => {
  const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
  if (currentPath === '/login') return;
  const intended = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.assign(`/login?redirect=${encodeURIComponent(intended)}`);
};

const refreshSessionOnce = (refreshToken) => {
  if (!refreshPromise) {
    const sessionRevision = getAuthSessionRevision();
    refreshPromise = authApi.refresh(refreshToken)
      .then((session) => {
        const persistedSession = persistAuthSession(session, sessionRevision);
        if (!persistedSession) throw refreshCancelled();
        return persistedSession;
      })
      .catch((error) => {
        if (error.code === 'AUTH_REFRESH_CANCELLED') throw error;
        if (getAuthSessionRevision() !== sessionRevision) throw refreshCancelled();
        clearAuthSession();
        redirectToLogin();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

const rejectFriendly = (error) => {
  const serverMessage = error.response?.data?.message;
  const status = error.response?.status;
  let message = typeof serverMessage === 'string' && serverMessage.trim()
    ? serverMessage
    : '';

  if (!message && error.code === 'AUTH_REFRESH_CANCELLED') {
    message = error.message;
  } else if (!message && error.code === 'ECONNABORTED') {
    message = 'Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại.';
  } else if (!message && !error.response) {
    message = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.';
  } else if (!message) {
    const statusMessages = {
      400: 'Yêu cầu không hợp lệ.',
      401: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
      403: 'Bạn không có quyền thực hiện thao tác này.',
      404: 'Không tìm thấy dữ liệu yêu cầu.',
      409: 'Dữ liệu đã thay đổi hoặc bị trùng lặp.',
      422: 'Dữ liệu gửi lên không hợp lệ.',
      429: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
    };
    message = statusMessages[status]
      || (status >= 500 ? 'Đã xảy ra lỗi máy chủ. Vui lòng thử lại sau.' : '')
      || 'Có lỗi xảy ra. Vui lòng thử lại sau.';
  }
  error.message = message;
  return Promise.reject(Object.assign(error, { friendlyMessage: message }));
};

axiosClient.interceptors.request.use((config) => {
  const token = storage.get(STORAGE_KEYS.token);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosClient.interceptors.response.use(
  (response) => {
    const payload = response.data;
    if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
      return payload.data;
    }
    return payload;
  },
  async (error) => {
    const originalRequest = error.config || {};
    const refreshToken = storage.get(STORAGE_KEYS.refreshToken);
    const status = error.response?.status;
    const isAuthRefreshRequest = isRefreshRequest(originalRequest);

    if (
      status === 401
      && !originalRequest._retry
      && !originalRequest.skipAuthRefresh
      && refreshToken
      && !isAuthRefreshRequest
    ) {
      originalRequest._retry = true;
      try {
        const session = await refreshSessionOnce(refreshToken);
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${session.token}`;
        return axiosClient(originalRequest);
      } catch (refreshError) {
        return rejectFriendly(refreshError);
      }
    }

    if (
      status === 401
      && !originalRequest._retry
      && !originalRequest.skipAuthRefresh
      && !refreshToken
      && !isAuthRefreshRequest
    ) {
      clearAuthSession();
      redirectToLogin();
    }
    return rejectFriendly(error);
  },
);

export default axiosClient;

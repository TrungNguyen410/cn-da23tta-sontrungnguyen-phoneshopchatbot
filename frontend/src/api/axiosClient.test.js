import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from './authApi';
import axiosClient from './axiosClient';
import { clearAuthSession, persistAuthSession } from '../utils/authSession';
import { STORAGE_KEYS } from '../utils/constants';
import { storage } from '../utils/storage';

const originalAdapter = axiosClient.defaults.adapter;

const responseFor = (config, data) => ({
  config,
  data: { success: true, data },
  headers: {},
  status: 200,
  statusText: 'OK',
});

const rejectUnauthorized = (config) => Promise.reject(Object.assign(new Error('expired'), {
  config,
  response: {
    config,
    data: { message: 'expired' },
    headers: {},
    status: 401,
    statusText: 'Unauthorized',
  },
}));

describe('axiosClient session refresh', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    axiosClient.defaults.adapter = originalAdapter;
    vi.unstubAllGlobals();
  });

  it('shares one refresh across simultaneous 401 responses and retries both requests', async () => {
    persistAuthSession({
      token: 'expired-access',
      refreshToken: 'old-refresh',
      user: { id: 'u1' },
    });
    let refreshRequests = 0;
    let releaseRefresh;
    const refreshGate = new Promise((resolve) => {
      releaseRefresh = resolve;
    });

    axiosClient.defaults.adapter = async (config) => {
      if (config.url === '/auth/refresh') {
        refreshRequests += 1;
        await refreshGate;
        return responseFor(config, {
          token: 'new-access',
          refreshToken: 'new-refresh',
          user: { id: 'u1' },
        });
      }
      if (config.headers.Authorization !== 'Bearer new-access') return rejectUnauthorized(config);
      return responseFor(config, { url: config.url });
    };

    const requests = [
      axiosClient.get('/orders'),
      axiosClient.get('/wishlist'),
    ];
    await vi.waitFor(() => expect(refreshRequests).toBe(1));
    releaseRefresh();

    await expect(Promise.all(requests)).resolves.toEqual([
      { url: '/orders' },
      { url: '/wishlist' },
    ]);
    expect(refreshRequests).toBe(1);
    expect(storage.get(STORAGE_KEYS.token)).toBe('new-access');
    expect(storage.get(STORAGE_KEYS.refreshToken)).toBe('new-refresh');
  });

  it('retries an unauthorized request only once', async () => {
    persistAuthSession({
      token: 'expired-access',
      refreshToken: 'refresh',
      user: { id: 'u1' },
    });
    let protectedRequests = 0;
    let refreshRequests = 0;

    axiosClient.defaults.adapter = (config) => {
      if (config.url === '/auth/refresh') {
        refreshRequests += 1;
        return Promise.resolve(responseFor(config, {
          token: 'new-access',
          refreshToken: 'new-refresh',
          user: { id: 'u1' },
        }));
      }
      protectedRequests += 1;
      return rejectUnauthorized(config);
    };

    await expect(axiosClient.get('/always-unauthorized')).rejects.toMatchObject({
      friendlyMessage: 'expired',
    });
    expect(protectedRequests).toBe(2);
    expect(refreshRequests).toBe(1);
  });

  it('clears the session and safely redirects with the complete intended URL when refresh fails', async () => {
    persistAuthSession({
      token: 'expired-access',
      refreshToken: 'invalid-refresh',
      user: { id: 'u1' },
    });
    const assign = vi.fn();
    vi.stubGlobal('window', {
      location: {
        assign,
        hash: '#confirm',
        pathname: '/checkout',
        search: '?step=payment',
      },
    });

    axiosClient.defaults.adapter = (config) => rejectUnauthorized(config);

    await expect(axiosClient.get('/orders')).rejects.toMatchObject({
      friendlyMessage: 'expired',
    });
    expect(storage.get(STORAGE_KEYS.token)).toBeNull();
    expect(storage.get(STORAGE_KEYS.refreshToken)).toBeNull();
    expect(storage.get(STORAGE_KEYS.currentUser)).toBeNull();
    expect(assign).toHaveBeenCalledWith(
      '/login?redirect=%2Fcheckout%3Fstep%3Dpayment%23confirm',
    );
  });

  it('redirects from paths that merely contain the login route name', async () => {
    persistAuthSession({
      token: 'expired-access',
      refreshToken: 'invalid-refresh',
      user: { id: 'u1' },
    });
    const assign = vi.fn();
    vi.stubGlobal('window', {
      location: {
        assign,
        hash: '',
        pathname: '/products/login-help',
        search: '?topic=session',
      },
    });
    axiosClient.defaults.adapter = (config) => rejectUnauthorized(config);

    await expect(axiosClient.get('/orders')).rejects.toMatchObject({
      friendlyMessage: 'expired',
    });

    expect(assign).toHaveBeenCalledWith(
      '/login?redirect=%2Fproducts%2Flogin-help%3Ftopic%3Dsession',
    );
  });

  it('does not try to refresh a rejected refresh request again', async () => {
    persistAuthSession({
      token: 'expired-access',
      refreshToken: 'invalid-refresh',
      user: { id: 'u1' },
    });
    let refreshRequests = 0;
    axiosClient.defaults.adapter = (config) => {
      refreshRequests += 1;
      return rejectUnauthorized(config);
    };

    await expect(authApi.refresh('invalid-refresh')).rejects.toMatchObject({
      friendlyMessage: 'expired',
    });
    expect(refreshRequests).toBe(1);
  });

  it('does not refresh or overwrite a stale session after a public login 401', async () => {
    persistAuthSession({
      token: 'stale-access',
      refreshToken: 'stale-refresh',
      user: { id: 'old-user' },
    });
    let refreshRequests = 0;

    axiosClient.defaults.adapter = (config) => {
      if (config.url === '/auth/refresh') {
        refreshRequests += 1;
        return Promise.resolve(responseFor(config, {
          token: 'rotated-access',
          refreshToken: 'rotated-refresh',
          user: { id: 'old-user' },
        }));
      }
      return rejectUnauthorized(config);
    };

    await expect(authApi.login({
      identifier: 'new-user@test.com',
      password: 'wrong-password',
    })).rejects.toMatchObject({ friendlyMessage: 'expired' });

    expect(refreshRequests).toBe(0);
    expect(storage.get(STORAGE_KEYS.token)).toBe('stale-access');
    expect(storage.get(STORAGE_KEYS.refreshToken)).toBe('stale-refresh');
    expect(storage.get(STORAGE_KEYS.currentUser)).toEqual({ id: 'old-user' });
  });

  it('opts every public auth request out of automatic refresh', async () => {
    const requests = [];
    axiosClient.defaults.adapter = (config) => {
      requests.push({ skipAuthRefresh: config.skipAuthRefresh, url: config.url });
      return Promise.resolve(responseFor(config, {
        token: 'access',
        refreshToken: 'refresh',
        user: { id: 'u1' },
      }));
    };

    await authApi.login({ identifier: '0912345678', password: '123456' });
    await authApi.requestRegistrationOtp({
      fullName: 'Test User',
      password: '123456',
      phone: '0912345678',
    });
    await authApi.verifyRegistrationOtp({ phone: '0912345678', otp: '123456' });
    await authApi.requestPasswordReset({ identifier: '0912345678' });
    await authApi.resetPassword({
      identifier: '0912345678',
      newPassword: 'new-password',
      otp: '123456',
    });
    await authApi.refresh('refresh');
    await authApi.logout('refresh');

    expect(requests).toEqual([
      { skipAuthRefresh: true, url: '/auth/login' },
      { skipAuthRefresh: true, url: '/auth/register/request-otp' },
      { skipAuthRefresh: true, url: '/auth/register/verify-otp' },
      { skipAuthRefresh: true, url: '/auth/forgot-password/request-otp' },
      { skipAuthRefresh: true, url: '/auth/forgot-password/reset' },
      { skipAuthRefresh: true, url: '/auth/refresh' },
      { skipAuthRefresh: true, url: '/auth/logout' },
    ]);
  });

  it('still refreshes protected auth requests', async () => {
    persistAuthSession({
      token: 'expired-access',
      refreshToken: 'refresh',
      user: { id: 'u1' },
    });
    let refreshRequests = 0;

    axiosClient.defaults.adapter = (config) => {
      if (config.url === '/auth/refresh') {
        refreshRequests += 1;
        return Promise.resolve(responseFor(config, {
          token: 'new-access',
          refreshToken: 'new-refresh',
          user: { id: 'u1' },
        }));
      }
      if (config.headers.Authorization !== 'Bearer new-access') return rejectUnauthorized(config);
      return Promise.resolve(responseFor(config, { id: 'u1' }));
    };

    await expect(authApi.me({ id: 'u1' })).resolves.toEqual({ id: 'u1' });
    expect(refreshRequests).toBe(1);
  });

  it('does not restore or redirect a session cleared while refresh is pending', async () => {
    persistAuthSession({
      token: 'expired-access',
      refreshToken: 'refresh',
      user: { id: 'u1' },
    });
    const assign = vi.fn();
    vi.stubGlobal('window', {
      location: {
        assign,
        hash: '',
        pathname: '/account',
        search: '',
      },
    });
    let refreshRequests = 0;
    let releaseRefresh;
    const refreshGate = new Promise((resolve) => {
      releaseRefresh = resolve;
    });

    axiosClient.defaults.adapter = async (config) => {
      if (config.url === '/auth/refresh') {
        refreshRequests += 1;
        await refreshGate;
        return responseFor(config, {
          token: 'new-access',
          refreshToken: 'new-refresh',
          user: { id: 'u1' },
        });
      }
      if (config.headers.Authorization !== 'Bearer new-access') return rejectUnauthorized(config);
      return responseFor(config, { ok: true });
    };

    const pendingRequest = axiosClient.get('/orders');
    await vi.waitFor(() => expect(refreshRequests).toBe(1));
    clearAuthSession();
    releaseRefresh();

    await expect(pendingRequest).rejects.toMatchObject({
      code: 'AUTH_REFRESH_CANCELLED',
    });
    expect(storage.get(STORAGE_KEYS.token)).toBeNull();
    expect(storage.get(STORAGE_KEYS.refreshToken)).toBeNull();
    expect(storage.get(STORAGE_KEYS.currentUser)).toBeNull();
    expect(assign).not.toHaveBeenCalled();
  });

  it('does not redirect when a pending refresh fails after the session was cleared', async () => {
    persistAuthSession({
      token: 'expired-access',
      refreshToken: 'refresh',
      user: { id: 'u1' },
    });
    const assign = vi.fn();
    vi.stubGlobal('window', {
      location: {
        assign,
        hash: '',
        pathname: '/account',
        search: '',
      },
    });
    let refreshRequests = 0;
    let releaseRefresh;
    const refreshGate = new Promise((resolve) => {
      releaseRefresh = resolve;
    });

    axiosClient.defaults.adapter = async (config) => {
      if (config.url === '/auth/refresh') {
        refreshRequests += 1;
        await refreshGate;
      }
      return rejectUnauthorized(config);
    };

    const pendingRequest = axiosClient.get('/orders');
    await vi.waitFor(() => expect(refreshRequests).toBe(1));
    clearAuthSession();
    releaseRefresh();

    await expect(pendingRequest).rejects.toMatchObject({
      code: 'AUTH_REFRESH_CANCELLED',
    });
    expect(storage.get(STORAGE_KEYS.token)).toBeNull();
    expect(storage.get(STORAGE_KEYS.refreshToken)).toBeNull();
    expect(storage.get(STORAGE_KEYS.currentUser)).toBeNull();
    expect(assign).not.toHaveBeenCalled();
  });

  it('sends the refresh token when revoking the backend session', async () => {
    let request;
    axiosClient.defaults.adapter = (config) => {
      request = config;
      return Promise.resolve(responseFor(config, { message: 'Logged out successfully' }));
    };

    await authApi.logout('refresh-to-revoke');

    expect(request.url).toBe('/auth/logout');
    expect(JSON.parse(request.data)).toEqual({ refreshToken: 'refresh-to-revoke' });
  });

  it('shows a Vietnamese message when the server cannot be reached', async () => {
    axiosClient.defaults.adapter = (config) => Promise.reject(Object.assign(
      new Error('Network Error'),
      { config },
    ));

    await expect(axiosClient.get('/products')).rejects.toMatchObject({
      friendlyMessage: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.',
    });
  });

  it('shows a Vietnamese message when a request times out', async () => {
    axiosClient.defaults.adapter = (config) => Promise.reject(Object.assign(
      new Error('timeout of 10000ms exceeded'),
      { code: 'ECONNABORTED', config },
    ));

    await expect(axiosClient.get('/products')).rejects.toMatchObject({
      friendlyMessage: 'Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại.',
    });
  });
});

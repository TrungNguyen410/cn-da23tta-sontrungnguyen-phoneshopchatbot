import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useContext } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, AuthProvider } from './AuthContext';
import { STORAGE_KEYS } from '../utils/constants';
import { storage } from '../utils/storage';

const { authApiMock } = vi.hoisted(() => ({
  authApiMock: {
    login: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
    updateWishlist: vi.fn(),
  },
}));

vi.mock('../api/authApi', () => ({ authApi: authApiMock }));

function AuthHarness() {
  const auth = useContext(AuthContext);
  return (
    <>
      <span>{auth.user ? auth.user.email : 'guest'}</span>
      {auth.user?.phone && <span>{auth.user.phone}</span>}
      <button type="button" onClick={() => auth.login({ identifier: 'user@test.com', password: '123456' })}>
        Log in
      </button>
      <button type="button" onClick={auth.logout}>Log out</button>
    </>
  );
}

describe('AuthProvider session lifecycle', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    authApiMock.me.mockImplementation((user) => Promise.resolve(user));
  });

  afterEach(() => {
    cleanup();
  });

  it('persists the refresh token returned by login', async () => {
    authApiMock.login.mockResolvedValue({
      token: 'access',
      refreshToken: 'refresh',
      user: { id: 'u1', email: 'user@test.com', wishlist: [] },
    });
    const user = userEvent.setup();
    render(<AuthProvider><AuthHarness /></AuthProvider>);

    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('user@test.com')).toBeInTheDocument();
    expect(storage.get(STORAGE_KEYS.refreshToken)).toBe('refresh');
  });

  it('keeps a successful login when remote wishlist sync fails', async () => {
    const session = {
      token: 'access',
      refreshToken: 'refresh',
      user: { id: 'u1', email: 'user@test.com', phone: '0911111111', wishlist: [] },
    };
    authApiMock.login.mockResolvedValue(session);
    authApiMock.updateWishlist.mockRejectedValue(new Error('offline'));
    storage.set(STORAGE_KEYS.wishlist, ['product-1']);
    const user = userEvent.setup();
    render(<AuthProvider><AuthHarness /></AuthProvider>);

    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText(session.user.phone)).toBeInTheDocument();
    expect(storage.get(STORAGE_KEYS.token)).toBe(session.token);
  });

  it('clears local state immediately and revokes the refresh token best-effort', async () => {
    storage.set(STORAGE_KEYS.token, 'access');
    storage.set(STORAGE_KEYS.refreshToken, 'refresh-to-revoke');
    storage.set(STORAGE_KEYS.currentUser, {
      id: 'u1',
      email: 'user@test.com',
      wishlist: [],
    });
    authApiMock.logout.mockRejectedValue(new Error('offline'));
    const user = userEvent.setup();
    render(<AuthProvider><AuthHarness /></AuthProvider>);

    await screen.findByText('user@test.com');
    await user.click(screen.getByRole('button', { name: 'Log out' }));

    expect(screen.getByText('guest')).toBeInTheDocument();
    expect(storage.get(STORAGE_KEYS.token)).toBeNull();
    expect(storage.get(STORAGE_KEYS.refreshToken)).toBeNull();
    expect(storage.get(STORAGE_KEYS.currentUser)).toBeNull();
    expect(authApiMock.logout).toHaveBeenCalledWith('refresh-to-revoke');
  });
});

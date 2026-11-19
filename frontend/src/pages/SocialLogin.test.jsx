import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Login from './Login';
import Register from './Register';

const auth = vi.hoisted(() => ({
  login: vi.fn(),
  loginWithSocial: vi.fn(),
  register: vi.fn(),
  isAuthenticated: false,
  isAdmin: false,
}));
const firebaseAuth = vi.hoisted(() => ({
  ACCOUNT_EXISTS_CODE: 'auth/account-exists-with-different-credential',
  loadFirebase: vi.fn(() => Promise.resolve()),
  signInWithProvider: vi.fn(),
}));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock('../hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('../api/firebaseAuthApi', () => firebaseAuth);
vi.mock('react-toastify', () => ({ toast }));
vi.mock('../utils/runtimeConfig', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, runtimeConfig: { ...actual.runtimeConfig, socialLogin: true } };
});

const renderAt = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<p>Trang chủ</p>} />
      <Route path="/cart" element={<p>Giỏ hàng</p>} />
    </Routes>
  </MemoryRouter>,
);

const customerSession = { token: 't', user: { id: 'u1', fullName: 'Phạm Quốc Huy', role: 'customer' } };

describe('Google/Facebook buttons', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('signs in with Google from the login page and returns to the requested page', async () => {
    firebaseAuth.signInWithProvider.mockResolvedValue('google-id-token');
    auth.loginWithSocial.mockResolvedValue(customerSession);
    renderAt('/login?redirect=/cart');

    expect(firebaseAuth.loadFirebase).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục với Google' }));

    expect(await screen.findByText('Giỏ hàng')).toBeInTheDocument();
    expect(firebaseAuth.signInWithProvider).toHaveBeenCalledWith('google', { link: null });
    expect(auth.loginWithSocial).toHaveBeenCalledWith('google-id-token');
    expect(toast.success).toHaveBeenCalledWith('Chào mừng Phạm Quốc Huy');
  });

  it('signs up with Facebook from the registration page', async () => {
    firebaseAuth.signInWithProvider.mockResolvedValue('facebook-id-token');
    auth.loginWithSocial.mockResolvedValue(customerSession);
    renderAt('/register');

    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục với Facebook' }));

    expect(await screen.findByText('Trang chủ')).toBeInTheDocument();
    expect(firebaseAuth.signInWithProvider).toHaveBeenCalledWith('facebook', { link: null });
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('stays quiet when the popup is closed and reports real errors', async () => {
    firebaseAuth.signInWithProvider.mockRejectedValueOnce(Object.assign(new Error('closed'), { cancelled: true }));
    renderAt('/login');

    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục với Google' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tiếp tục với Google' })).toBeEnabled());
    expect(toast.error).not.toHaveBeenCalled();
    expect(auth.loginWithSocial).not.toHaveBeenCalled();

    firebaseAuth.signInWithProvider.mockResolvedValueOnce('google-id-token');
    auth.loginWithSocial.mockRejectedValueOnce(Object.assign(new Error('409'), {
      friendlyMessage: 'Email này đã gắn với một tài khoản khác.',
    }));
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục với Google' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Email này đã gắn với một tài khoản khác.'));
    expect(screen.getByRole('heading', { name: 'Đăng nhập tài khoản' })).toBeInTheDocument();
  });

  it('asks to continue with Google when the Facebook email already uses Google, then links both', async () => {
    const accountExists = Object.assign(new Error('exists'), {
      code: 'auth/account-exists-with-different-credential',
      cancelled: false,
      pendingCredential: { providerId: 'facebook.com' },
      pendingProvider: 'facebook',
      existingProvider: 'google',
      email: 'khach@gmail.com',
      friendlyMessage: 'Email khach@gmail.com đã được dùng để đăng nhập bằng Google.',
    });
    firebaseAuth.signInWithProvider.mockRejectedValueOnce(accountExists);
    renderAt('/login');

    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục với Facebook' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('khach@gmail.com đã được dùng để đăng nhập bằng Google');
    expect(toast.error).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Tiếp tục với Google' })).toHaveClass('is-suggested');

    firebaseAuth.signInWithProvider.mockResolvedValueOnce('google-id-token');
    auth.loginWithSocial.mockResolvedValue(customerSession);
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục với Google' }));

    expect(await screen.findByText('Trang chủ')).toBeInTheDocument();
    expect(firebaseAuth.signInWithProvider).toHaveBeenLastCalledWith('google', { link: accountExists });
    expect(toast.success).toHaveBeenCalledWith('Đã gộp Facebook vào tài khoản của bạn');
  });
});

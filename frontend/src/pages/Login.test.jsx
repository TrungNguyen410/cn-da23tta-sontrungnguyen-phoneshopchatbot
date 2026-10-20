import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Login from './Login';

const { authState, loginMock } = vi.hoisted(() => ({
  authState: {
    isAdmin: false,
    isAuthenticated: false,
  },
  loginMock: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    login: loginMock,
    ...authState,
  }),
}));
vi.mock('../utils/constants', () => ({ USE_MOCK: false }));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe('Login', () => {
  beforeEach(() => {
    authState.isAdmin = false;
    authState.isAuthenticated = false;
    loginMock.mockReset().mockResolvedValue({
      token: 'access',
      refreshToken: 'refresh',
      user: { fullName: 'Customer', role: 'customer' },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('does not expose demo admin credentials when mock mode is disabled', () => {
    render(<MemoryRouter><Login /></MemoryRouter>);

    expect(screen.queryByText(/admin@gmail\.com/i)).not.toBeInTheDocument();
    expect(screen.queryByText('123456')).not.toBeInTheDocument();
  });

  it('returns to a safe internal redirect from the query string after login', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/login?redirect=%2Fcheckout%3Fstep%3Dpayment']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/checkout" element={<div>Checkout destination</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.type(screen.getByPlaceholderText('0912 345 678'), '0911111111');
    await user.type(screen.getByPlaceholderText('Nhập mật khẩu'), '123456');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByText('Checkout destination')).toBeInTheDocument();
  });

  it('falls back to the home page for an external redirect', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/login?redirect=https%3A%2F%2Fevil.example']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<div>Home destination</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.type(screen.getByPlaceholderText('0912 345 678'), '0911111111');
    await user.type(screen.getByPlaceholderText('Nhập mật khẩu'), '123456');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByText('Home destination')).toBeInTheDocument();
  });
});

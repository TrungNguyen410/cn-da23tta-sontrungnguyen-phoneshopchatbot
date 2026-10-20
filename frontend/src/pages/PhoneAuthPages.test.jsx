import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ForgotPassword from './ForgotPassword';
import Register from './Register';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    logout: vi.fn(),
    requestRegistrationOtp: vi.fn(),
    verifyRegistrationOtp: vi.fn(),
  }),
}));
vi.mock('../api/authApi', () => ({
  authApi: {
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
  },
}));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe('phone-only authentication pages', () => {
  afterEach(cleanup);

  it('registers with a phone and explains SMS verification without email', () => {
    render(<MemoryRouter><Register /></MemoryRouter>);
    expect(screen.getByText(/gửi qua SMS/i)).toBeInTheDocument();
    expect(screen.getByText('Số điện thoại')).toBeInTheDocument();
    expect(screen.queryByText(/^Email$/i)).not.toBeInTheDocument();
  });

  it('recovers a password through SMS without channel selection', () => {
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
    expect(screen.getByText(/nhận mã OTP qua SMS/i)).toBeInTheDocument();
    expect(screen.getByText('Số điện thoại tài khoản')).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });
});

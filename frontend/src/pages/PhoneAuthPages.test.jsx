import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ForgotPassword from './ForgotPassword';
import Register from './Register';

const auth = vi.hoisted(() => ({
  register: vi.fn(),
  loginWithSocial: vi.fn(),
}));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock('../hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('../api/authApi', () => ({
  authApi: {
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
  },
}));
vi.mock('react-toastify', () => ({ toast }));

const renderRegister = () => render(
  <MemoryRouter initialEntries={['/register']}>
    <Routes>
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<p>Trang đăng nhập</p>} />
    </Routes>
  </MemoryRouter>,
);

const fillRegistration = ({ confirmPassword = '123456' } = {}) => {
  fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Trần Thu Hà' } });
  fireEvent.change(screen.getByLabelText('Số điện thoại'), { target: { value: '0912345678' } });
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: '123456' } });
  fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu'), { target: { value: confirmPassword } });
  fireEvent.click(screen.getByRole('button', { name: 'Đăng ký' }));
};

describe('phone authentication pages', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('creates the account straight away, without an SMS code, then opens the login page', async () => {
    auth.register.mockResolvedValue({ user: { id: 'u1' } });
    renderRegister();

    fillRegistration();

    expect(await screen.findByText('Trang đăng nhập')).toBeInTheDocument();
    expect(auth.register).toHaveBeenCalledWith({ fullName: 'Trần Thu Hà', phone: '0912345678', password: '123456' });
    expect(toast.success).toHaveBeenCalledWith('Đăng ký thành công. Vui lòng đăng nhập!');
  });

  it('keeps the form and shows the server error when the number is taken', async () => {
    auth.register.mockRejectedValue(Object.assign(new Error('409'), { friendlyMessage: 'Số điện thoại này đã được đăng ký' }));
    renderRegister();

    fillRegistration();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Số điện thoại này đã được đăng ký'));
    expect(screen.getByRole('heading', { name: 'Đăng ký thành viên' })).toBeInTheDocument();
  });

  it('checks the form before calling the server', () => {
    renderRegister();

    fillRegistration({ confirmPassword: '654321' });

    expect(screen.getByText('Mật khẩu xác nhận không khớp')).toBeInTheDocument();
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('has no OTP step, no email field and no Google/Facebook buttons without Firebase', () => {
    renderRegister();
    expect(screen.queryByLabelText('Mã OTP')).not.toBeInTheDocument();
    expect(screen.queryByText(/^Email$/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Google/ })).not.toBeInTheDocument();
  });

  it('recovers a password through SMS without channel selection', () => {
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
    expect(screen.getByText(/nhận mã OTP qua SMS/i)).toBeInTheDocument();
    expect(screen.getByText('Số điện thoại tài khoản')).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });
});

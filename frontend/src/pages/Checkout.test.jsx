import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { orderApi } from '../api/orderApi';
import { paymentApi } from '../api/paymentApi';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import Checkout from './Checkout';

vi.mock('../api/orderApi', () => ({ orderApi: { create: vi.fn() } }));
vi.mock('../api/paymentApi', () => ({
  paymentApi: {
    getConfig: vi.fn(),
  },
}));
vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../hooks/useCart', () => ({ useCart: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), info: vi.fn() } }));

describe('Checkout payment methods', () => {
  let cart;

  const completeCurrentAddress = () => {
    fireEvent.change(screen.getByRole('combobox', { name: /Tỉnh\/thành phố/i }), {
      target: { value: 'TP. Hồ Chí Minh' },
    });
    fireEvent.change(screen.getByLabelText(/Phường\/xã\/đặc khu/i), {
      target: { value: 'Phường Sài Gòn' },
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    window.requestAnimationFrame = (callback) => callback();
    Element.prototype.scrollIntoView = vi.fn();
    useAuth.mockReturnValue({
      user: {
        id: 'user-1',
        fullName: 'Test User',
        email: 'test@example.com',
        phone: '0911111111',
        address: 'Test address',
      },
    });
    cart = {
      cartItems: [{ id: 'phone-1', name: 'Phone', image: 'phone.png', price: 1000000, quantity: 1 }],
      cartCount: 1,
      subtotal: 1000000,
      shippingFee: 30000,
      discount: 0,
      total: 1030000,
      voucher: null,
      clearCart: vi.fn(),
    };
    useCart.mockReturnValue(cart);
    orderApi.create.mockResolvedValue({ id: 'order-1' });
    paymentApi.getConfig.mockResolvedValue({
      providers: {
        cod: { enabled: true },
        bank: {
          enabled: true,
          display: {
            bankName: 'Test Bank',
            bankBin: '970436',
            accountNumber: '123456789',
            accountName: 'PHONESHOPAI TEST',
          },
        },
      },
    });
  });
  afterEach(cleanup);

  it('offers only COD and bank transfer, even if the server lists other providers', async () => {
    paymentApi.getConfig.mockResolvedValue({
      providers: {
        cod: { enabled: true },
        bank: { enabled: true },
        momo: { enabled: true },
        vnpay: { enabled: true },
      },
    });
    render(<MemoryRouter><Checkout /></MemoryRouter>);

    expect(await screen.findByRole('radio', { name: /Chuyển khoản ngân hàng/i })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.queryByRole('radio', { name: /MoMo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /VNPay/i })).not.toBeInTheDocument();
  });

  it('sends cart items in the checkout request', async () => {
    cart.cartItems = [{
      id: 'case-1',
      productId: 'case-1',
      name: 'Case',
      image: 'case.png',
      price: 300000,
      stock: 10,
      type: 'accessory',
      quantity: 2,
    }];
    render(<MemoryRouter><Checkout /></MemoryRouter>);
    completeCurrentAddress();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đặt hàng' }));

    await waitFor(() => expect(orderApi.create).toHaveBeenCalledTimes(1));
    expect(orderApi.create.mock.calls[0][0].paymentMethod).toBe('cod');
    expect(orderApi.create.mock.calls[0][0].items).toEqual([
      { id: 'case-1', accessoryId: 'case-1', type: 'accessory', quantity: 2 },
    ]);
  });

  it('keeps pricing fields out of the checkout request', async () => {
    cart.discount = 30000;
    cart.voucher = { code: 'SHIP', type: 'shipping', value: 30000 };
    render(<MemoryRouter><Checkout /></MemoryRouter>);
    completeCurrentAddress();

    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đặt hàng' }));

    await waitFor(() => expect(orderApi.create).toHaveBeenCalledTimes(1));
    const payload = orderApi.create.mock.calls[0][0];
    expect(payload.voucherCode).toBe('SHIP');
    expect(payload).not.toHaveProperty('userId');
    expect(payload).not.toHaveProperty('paymentReference');
    expect(payload).not.toHaveProperty('subtotal');
    expect(payload).not.toHaveProperty('shippingFee');
    expect(payload).not.toHaveProperty('discount');
    expect(payload).not.toHaveProperty('total');
  });

  it('uses one stable idempotency key and synchronously blocks duplicate submits', async () => {
    let resolveOrder;
    orderApi.create.mockReturnValue(new Promise((resolve) => { resolveOrder = resolve; }));
    const { container } = render(<MemoryRouter><Checkout /></MemoryRouter>);
    completeCurrentAddress();
    const form = container.querySelector('form');

    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(orderApi.create).toHaveBeenCalledTimes(1);
    expect(orderApi.create.mock.calls[0][1]).toMatch(/^checkout-/);
    resolveOrder({ id: 'order-1' });
  });

  it('hides unconfigured payment methods in API mode', async () => {
    paymentApi.getConfig.mockResolvedValue({
      providers: {
        cod: { enabled: true },
        bank: { enabled: false },
      },
    });

    render(<MemoryRouter><Checkout /></MemoryRouter>);

    await waitFor(() => expect(paymentApi.getConfig).toHaveBeenCalled());
    expect(screen.queryByRole('radio', { name: /Chuyển khoản ngân hàng/i })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /COD/i })).toBeInTheDocument();
  });

  it('creates bank-transfer orders immediately so the QR can use the order number', async () => {
    render(<MemoryRouter><Checkout /></MemoryRouter>);
    completeCurrentAddress();
    fireEvent.click(await screen.findByRole('radio', { name: /Chuyển khoản ngân hàng/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đặt hàng' }));

    await waitFor(() => expect(orderApi.create).toHaveBeenCalledTimes(1));
    expect(orderApi.create.mock.calls[0][0].paymentMethod).toBe('bank');
    expect(orderApi.create.mock.calls[0][0].note).not.toMatch(/Ma chuyen khoan/);
  });

  it('connects inline validation errors to invalid fields', async () => {
    render(<MemoryRouter><Checkout /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Xác nhận đặt hàng' }));

    const province = screen.getByRole('combobox', { name: /Tỉnh\/thành phố/i });
    const ward = screen.getByLabelText(/Phường\/xã\/đặc khu/i);
    expect(province).toHaveAttribute('aria-invalid', 'true');
    expect(province).toHaveAttribute('aria-describedby');
    expect(ward).toHaveAttribute('aria-invalid', 'true');
    expect(ward).toHaveAttribute('aria-describedby');
  });

  describe('saved shipping address', () => {
    const savedAddress = {
      fullName: 'Nguyễn Minh Anh',
      email: 'user@gmail.com',
      phone: '0911111111',
      address: '45 Lê Lợi',
      province: 'TP. Hồ Chí Minh',
      ward: 'Phường Sài Gòn',
    };
    let updateLocalUser;

    beforeEach(() => {
      updateLocalUser = vi.fn();
      useAuth.mockReturnValue({
        user: { id: 'user-1', fullName: 'Nguyễn Minh Anh', email: 'user@gmail.com', phone: '0911111111', shippingAddress: savedAddress },
        updateLocalUser,
      });
    });

    it('ships to the saved address without showing the form', async () => {
      render(<MemoryRouter><Checkout /></MemoryRouter>);

      expect(screen.getByText('45 Lê Lợi, Phường Sài Gòn, TP. Hồ Chí Minh')).toBeInTheDocument();
      expect(screen.queryByLabelText(/Phường\/xã\/đặc khu/i)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đặt hàng' }));

      await waitFor(() => expect(orderApi.create).toHaveBeenCalledTimes(1));
      const payload = orderApi.create.mock.calls[0][0];
      expect(payload.customer).toEqual(savedAddress);
      expect(payload.saveAddress).toBe(false);
      expect(payload.customer).not.toHaveProperty('district');
      expect(updateLocalUser).not.toHaveBeenCalled();
    });

    it('opens the form for another address and saves it only when ticked', async () => {
      render(<MemoryRouter><Checkout /></MemoryRouter>);
      fireEvent.click(screen.getByRole('button', { name: /Giao đến địa chỉ khác/i }));

      expect(screen.getByLabelText(/Tỉnh\/thành phố/i)).toHaveValue('');
      fireEvent.change(screen.getByLabelText(/Tỉnh\/thành phố/i), { target: { value: 'Hà Nội' } });
      fireEvent.change(screen.getByLabelText(/Phường\/xã\/đặc khu/i), { target: { value: 'Phường Ba Đình' } });
      fireEvent.change(screen.getByLabelText(/Số nhà, tên đường/i), { target: { value: '8 Phan Đình Phùng' } });
      fireEvent.click(screen.getByRole('checkbox', { name: /Lưu làm địa chỉ mặc định/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đặt hàng' }));

      await waitFor(() => expect(orderApi.create).toHaveBeenCalledTimes(1));
      const payload = orderApi.create.mock.calls[0][0];
      expect(payload.customer).toMatchObject({ address: '8 Phan Đình Phùng', province: 'Hà Nội', ward: 'Phường Ba Đình' });
      expect(payload.saveAddress).toBe(true);
      expect(updateLocalUser).toHaveBeenCalledWith({ shippingAddress: payload.customer });
    });

    it('can switch back to the saved address', () => {
      render(<MemoryRouter><Checkout /></MemoryRouter>);
      fireEvent.click(screen.getByRole('button', { name: /Giao đến địa chỉ khác/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Dùng địa chỉ đã lưu' }));

      expect(screen.getByText('45 Lê Lợi, Phường Sài Gòn, TP. Hồ Chí Minh')).toBeInTheDocument();
    });

    it('saves the address of a first order and resolves a loosely typed ward', async () => {
      useAuth.mockReturnValue({
        user: { id: 'user-2', fullName: 'Khách mới', email: 'new@example.com', phone: '0922222222' },
        updateLocalUser,
      });
      render(<MemoryRouter><Checkout /></MemoryRouter>);
      expect(screen.getByText(/sẽ được lưu vào tài khoản/)).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText(/Tỉnh\/thành phố/i), { target: { value: 'TP. Hồ Chí Minh' } });
      const ward = screen.getByLabelText(/Phường\/xã\/đặc khu/i);
      await waitFor(() => expect(ward).toHaveAttribute('list'));
      fireEvent.change(ward, { target: { value: 'sai gon' } });
      fireEvent.change(screen.getByLabelText(/Số nhà, tên đường/i), { target: { value: '1 Nguyễn Huệ' } });
      fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đặt hàng' }));

      await waitFor(() => expect(orderApi.create).toHaveBeenCalledTimes(1));
      const payload = orderApi.create.mock.calls[0][0];
      expect(payload.customer.ward).toBe('Phường Sài Gòn');
      expect(payload.saveAddress).toBe(true);
    });

    it('rejects a ward that does not belong to the chosen province', async () => {
      useAuth.mockReturnValue({
        user: { id: 'user-2', fullName: 'Khách mới', email: 'new@example.com', phone: '0922222222', address: '1 Nguyễn Huệ' },
        updateLocalUser,
      });
      render(<MemoryRouter><Checkout /></MemoryRouter>);
      fireEvent.change(screen.getByLabelText(/Tỉnh\/thành phố/i), { target: { value: 'TP. Hồ Chí Minh' } });
      const ward = screen.getByLabelText(/Phường\/xã\/đặc khu/i);
      await waitFor(() => expect(ward).toHaveAttribute('list'));
      fireEvent.change(ward, { target: { value: 'Phường Ba Đình' } });
      fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đặt hàng' }));

      expect(await screen.findByText(/có trong danh sách của tỉnh\/thành đã chọn/)).toBeInTheDocument();
      expect(orderApi.create).not.toHaveBeenCalled();
    });
  });
});

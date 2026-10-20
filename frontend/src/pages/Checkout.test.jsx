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
    createVnpayCheckout: vi.fn(),
    getConfig: vi.fn(),
  },
}));
vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../hooks/useCart', () => ({ useCart: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), info: vi.fn() } }));

describe('Checkout payment confirmations', () => {
  let cart;

  const completeCurrentAddress = () => {
    fireEvent.change(screen.getByRole('combobox', { name: /Tỉnh\/thành phố/i }), {
      target: { value: 'TP. Hồ Chí Minh' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /Phường\/xã\/đặc khu/i }), {
      target: { value: 'Bến Nghé' },
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
            accountName: 'TECHPHONE TEST',
          },
        },
        momo: {
          enabled: true,
          display: { phone: '0901234567', accountName: 'TECHPHONE MOMO' },
        },
        vnpay: { enabled: true, mode: 'sandbox' },
      },
    });
    paymentApi.createVnpayCheckout.mockResolvedValue({
      order: {
        id: 'order-vnpay',
        orderNumber: 'TP26072801',
        customer: { phone: '0911111111' },
      },
      transaction: { reference: 'TP26072801REF' },
      resultProof: 'mock-result-proof',
      paymentUrl: '/payment-result?code=00&mock=true&proof=mock-result-proof',
    });
  });
  afterEach(cleanup);

  it('confirms MoMo before creating the order', async () => {
    render(<MemoryRouter><Checkout /></MemoryRouter>);
    completeCurrentAddress();
    fireEvent.click(await screen.findByRole('radio', { name: /Ví điện tử MoMo/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục thanh toán' }));
    expect(await screen.findByRole('heading', { name: 'Thanh toán qua MoMo' })).toBeInTheDocument();
    expect(orderApi.create).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Tôi đã thanh toán' }));
    await waitFor(() => expect(orderApi.create).toHaveBeenCalledTimes(1));
    expect(orderApi.create.mock.calls[0][0].paymentMethod).toBe('momo');
    expect(orderApi.create.mock.calls[0][0].note).toMatch(/Ma giao dich MoMo:/);
    expect(orderApi.create.mock.calls[0][0].items).toEqual([
      { id: 'phone-1', productId: 'phone-1', type: 'product', quantity: 1 },
    ]);
  });

  it('redirects card payments to VNPay without rendering card inputs', async () => {
    cart.cartItems = [{
      id: 'case-1',
      productId: 'case-1',
      name: 'Case',
      image: 'case.png',
      price: 300000,
      oldPrice: 350000,
      stock: 10,
      type: 'accessory',
      quantity: 2,
    }];
    render(<MemoryRouter><Checkout /></MemoryRouter>);
    completeCurrentAddress();
    fireEvent.click(await screen.findByRole('radio', { name: /VNPay/i }));
    expect(screen.queryByLabelText(/Số thẻ/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thanh toán qua VNPay' }));

    await waitFor(() => expect(paymentApi.createVnpayCheckout).toHaveBeenCalledTimes(1));
    expect(paymentApi.createVnpayCheckout.mock.calls[0][0].paymentMethod).toBe('card');
    expect(paymentApi.createVnpayCheckout.mock.calls[0][0].items).toEqual([
      { id: 'case-1', accessoryId: 'case-1', type: 'accessory', quantity: 2 },
    ]);
    expect(paymentApi.createVnpayCheckout.mock.calls[0][1]).toMatch(/^checkout-/);
    expect(cart.clearCart).not.toHaveBeenCalled();
    expect(JSON.parse(sessionStorage.getItem('techphone_pending_payment'))).toEqual(
      expect.objectContaining({
        orderId: 'order-vnpay',
        orderNumber: 'TP26072801',
        checkoutKey: expect.stringMatching(/^checkout-/),
        paymentMethod: 'card',
        resultProof: 'mock-result-proof',
      }),
    );
    expect(orderApi.create).not.toHaveBeenCalled();
  });

  it('restores and locks VNPay when following the browser-visible retry route', async () => {
    sessionStorage.setItem('techphone_pending_payment', JSON.stringify({
      orderId: 'existing-order',
      orderNumber: 'TP26072800',
      reference: 'FAILED-REFERENCE',
      checkoutKey: 'checkout-existing-attempt',
      paymentMethod: 'card',
      createdAt: Date.now(),
    }));
    render(<MemoryRouter initialEntries={['/checkout']}><Checkout /></MemoryRouter>);
    completeCurrentAddress();
    const vnpay = await screen.findByRole('radio', { name: /VNPay/i });
    expect(vnpay).toBeChecked();
    expect(screen.getByRole('radio', { name: /COD/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /VNPay/i }));

    await waitFor(() => expect(paymentApi.createVnpayCheckout).toHaveBeenCalledTimes(1));
    expect(paymentApi.createVnpayCheckout.mock.calls[0][1]).toBe('checkout-existing-attempt');
    expect(orderApi.create).not.toHaveBeenCalled();
    expect(JSON.parse(sessionStorage.getItem('techphone_pending_payment')).checkoutKey)
      .toBe('checkout-existing-attempt');
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
        momo: { enabled: false },
        vnpay: { enabled: false },
      },
    });

    render(<MemoryRouter><Checkout /></MemoryRouter>);

    await waitFor(() => expect(paymentApi.getConfig).toHaveBeenCalled());
    expect(screen.queryByRole('radio', { name: /Chuyển khoản ngân hàng/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /MoMo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /VNPay/i })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /COD/i })).toBeInTheDocument();
  });

  it('renders configured public bank display data', async () => {
    render(<MemoryRouter><Checkout /></MemoryRouter>);
    completeCurrentAddress();
    fireEvent.click(await screen.findByRole('radio', { name: /Chuyển khoản ngân hàng/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục thanh toán' }));

    expect(await screen.findByText('Test Bank')).toBeInTheDocument();
    expect(screen.getByText('123456789')).toBeInTheDocument();
    expect(screen.getByText('TECHPHONE TEST')).toBeInTheDocument();
  });

  it('connects inline validation errors to invalid fields', async () => {
    render(<MemoryRouter><Checkout /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Xác nhận đặt hàng' }));

    const province = screen.getByRole('combobox', { name: /Tỉnh\/thành phố/i });
    const ward = screen.getByRole('textbox', { name: /Phường\/xã\/đặc khu/i });
    expect(province).toHaveAttribute('aria-invalid', 'true');
    expect(province).toHaveAttribute('aria-describedby');
    expect(ward).toHaveAttribute('aria-invalid', 'true');
    expect(ward).toHaveAttribute('aria-describedby');
  });
});

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'react-toastify';
import Account from './Account';

const { accessoryApiMock, authMock, cartMock, orderApiMock, productApiMock } = vi.hoisted(() => ({
  accessoryApiMock: { getById: vi.fn() },
  authMock: {
    changePassword: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn(),
    user: {
      address: '1 Main Street',
      email: 'user@test.com',
      fullName: 'Test User',
      id: 'u1',
      phone: '0912345678',
    },
  },
  orderApiMock: {
    cancel: vi.fn(),
    getMyOrders: vi.fn(),
  },
  productApiMock: { getById: vi.fn() },
  cartMock: { addToCart: vi.fn() },
}));

vi.mock('../hooks/useAuth', () => ({ useAuth: () => authMock }));
vi.mock('../hooks/useCart', () => ({ useCart: () => cartMock }));
vi.mock('../api/orderApi', () => ({ orderApi: orderApiMock }));
vi.mock('../api/productApi', () => ({ productApi: productApiMock }));
vi.mock('../api/accessoryApi', () => ({ accessoryApi: accessoryApiMock }));
vi.mock('../components/order/OrderLookupPanel', () => ({ default: () => null }));
vi.mock('../components/common/ConfirmModal', () => ({
  default: ({ open, onConfirm }) => open && <button type="button" onClick={onConfirm}>Confirm cancellation</button>,
}));
vi.mock('../components/common/EmptyState', () => ({ default: () => null }));
vi.mock('../components/common/Loading', () => ({ default: () => null }));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe('Account profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.updateProfile.mockResolvedValue(authMock.user);
    orderApiMock.getMyOrders.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it('keeps the verified phone read-only and omits account identifiers from profile updates', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Account /></MemoryRouter>);

    expect(screen.getByDisplayValue('0912345678')).toHaveAttribute('readonly');
    expect(screen.queryByLabelText('Email *')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    expect(authMock.updateProfile).toHaveBeenCalledWith({
      address: '1 Main Street',
      fullName: 'Test User',
    });
  });

  it('reorders from current catalog data and reports unavailable historical lines once', async () => {
    const user = userEvent.setup();
    orderApiMock.getMyOrders.mockResolvedValue([{
      id: 'order-1',
      orderNumber: 'TP1',
      createdAt: '2026-01-01',
      status: 'completed',
      total: 100,
      items: [
        { id: 'phone-1', productId: 'phone-1', name: 'Old Phone', quantity: 2, type: 'product' },
        { id: 'acc-1', accessoryId: 'acc-1', name: 'Old Case', quantity: 1, type: 'accessory' },
      ],
    }]);
    productApiMock.getById.mockResolvedValue({
      id: 'phone-1',
      name: 'Current Phone',
      price: 200,
      stock: 1,
      status: 'active',
    });
    accessoryApiMock.getById.mockResolvedValue({
      id: 'acc-1',
      name: 'Current Case',
      stock: 0,
      status: 'active',
    });
    render(<MemoryRouter initialEntries={['/account?tab=orders']}><Account /></MemoryRouter>);

    await user.click(await screen.findByRole('button', { name: /đặt lại/i }));
    expect(productApiMock.getById).toHaveBeenCalledWith('phone-1');
    expect(accessoryApiMock.getById).toHaveBeenCalledWith('acc-1');
    expect(cartMock.addToCart).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Current Phone', price: 200, stock: 1 }),
      1,
      'product',
    );
    expect(cartMock.addToCart).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('Không thể thêm: Old Case');
  });

  it('shows a retryable order error instead of an empty order history', async () => {
    orderApiMock.getMyOrders.mockRejectedValue(new Error('Orders offline'));
    render(<MemoryRouter initialEntries={['/account?tab=orders']}><Account /></MemoryRouter>);

    expect(await screen.findByText('Orders offline')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /thử lại/i })).toBeInTheDocument();
  });

  it('shows shipping tracking directly in account order history', async () => {
    orderApiMock.getMyOrders.mockResolvedValue([{
      id: 'order-tracking',
      orderNumber: 'TPTRACKING',
      createdAt: '2026-07-29T08:00:00.000Z',
      estimatedDelivery: '2026-08-01T08:00:00.000Z',
      shippingProvider: 'TechPhone Express',
      trackingNumber: 'TPX123456',
      status: 'shipping',
      total: 12000000,
      items: [{
        id: 'phone-1',
        image: '/phone.png',
        name: 'Điện thoại đang giao',
        price: 12000000,
        quantity: 1,
        type: 'product',
      }],
    }]);

    render(<MemoryRouter initialEntries={['/account?tab=orders']}><Account /></MemoryRouter>);

    expect(await screen.findByText('TPX123456')).toBeInTheDocument();
    expect(screen.getByText('TechPhone Express')).toBeInTheDocument();
    expect(screen.getByText(/Dự kiến giao:/)).toBeInTheDocument();
  });
  it('does not offer self-cancel for a paid confirmed order', async () => {
    orderApiMock.getMyOrders.mockResolvedValue([{
      id: 'order-paid',
      orderNumber: 'TPPAID',
      createdAt: '2026-08-01T08:00:00.000Z',
      paymentStatus: 'paid',
      status: 'confirmed',
      total: 12000000,
      items: [{
        id: 'phone-1',
        image: '/phone.png',
        name: 'Paid phone',
        price: 12000000,
        quantity: 1,
        type: 'product',
      }],
    }]);

    render(<MemoryRouter initialEntries={['/account?tab=orders']}><Account /></MemoryRouter>);

    expect(await screen.findByText('TPPAID')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Hủy đơn/i })).not.toBeInTheDocument();
  });

  it('shows the friendly cancellation error from the server', async () => {
    const user = userEvent.setup();
    orderApiMock.getMyOrders.mockResolvedValue([{
      id: 'order-pending',
      orderNumber: 'TPPENDING',
      createdAt: '2026-08-01T08:00:00.000Z',
      paymentStatus: 'pending',
      status: 'pending',
      total: 12000000,
      items: [{ id: 'phone-1', image: '/phone.png', name: 'Phone', price: 12000000, quantity: 1, type: 'product' }],
    }]);
    orderApiMock.cancel.mockRejectedValue({ friendlyMessage: 'Đơn hàng không còn có thể hủy' });
    render(<MemoryRouter initialEntries={['/account?tab=orders']}><Account /></MemoryRouter>);

    await user.click(await screen.findByRole('button', { name: /Hủy đơn/i }));
    await user.click(screen.getByRole('button', { name: 'Confirm cancellation' }));

    expect(toast.error).toHaveBeenCalledWith('Đơn hàng không còn có thể hủy');
  });
});

import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Cart from './Cart';

const { authMock, cartMock } = vi.hoisted(() => ({
  authMock: { isAuthenticated: true },
  cartMock: {},
}));

vi.mock('../hooks/useAuth', () => ({ useAuth: () => authMock }));
vi.mock('../hooks/useCart', () => ({ useCart: () => cartMock }));
vi.mock('../components/cart/CartItem', () => ({ default: () => null }));
vi.mock('../components/cart/VoucherBox', () => ({ default: () => null }));
vi.mock('../components/common/ConfirmModal', () => ({ default: () => null }));

describe('Cart pricing presentation', () => {
  beforeEach(() => {
    Object.assign(cartMock, {
      cartItems: [{ id: 'phone-1', name: 'Phone', price: 1000000, quantity: 1 }],
      clearCart: vi.fn(),
      decreaseQuantity: vi.fn(),
      discount: 0,
      increaseQuantity: vi.fn(),
      removeFromCart: vi.fn(),
      subtotal: 1000000,
      voucher: null,
    });
  });

  afterEach(cleanup);

  it('keeps a shipping voucher pending until checkout instead of showing a fixed savings', () => {
    cartMock.discount = 30000;
    cartMock.voucher = { code: 'FREESHIP', type: 'shipping', value: 30000 };

    render(<MemoryRouter><Cart /></MemoryRouter>);

    expect(screen.getByText(/Ưu đãi vận chuyển/i)).toBeInTheDocument();
    expect(screen.getByText(/Áp dụng khi thanh toán/i)).toBeInTheDocument();
    expect(screen.queryByText((content) => content.includes('30.000'))).not.toBeInTheDocument();
    expect(screen.getByText(/Tạm tính sau giảm giá/i).parentElement).toHaveTextContent('1.000.000');
  });

  it('shows a fixed voucher discount in the pre-shipping estimate', () => {
    cartMock.discount = 100000;
    cartMock.voucher = { code: 'GIAM100K', type: 'fixed', value: 100000 };

    render(<MemoryRouter><Cart /></MemoryRouter>);

    expect(screen.getByText((content) => content.includes('-100.000'))).toBeInTheDocument();
    expect(screen.getByText(/900\.000/)).toBeInTheDocument();
    expect(screen.queryByText(/Ưu đãi vận chuyển/i)).not.toBeInTheDocument();
  });
});

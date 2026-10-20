import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CartSummary from './CartSummary';

vi.mock('./VoucherBox', () => ({ default: () => null }));

describe('CartSummary', () => {
  it('labels shipping as a checkout estimate and excludes it from the cart total', () => {
    render(
      <CartSummary
        subtotal={1000000}
        shippingFee={30000}
        discount={100000}
        total={930000}
        onCheckout={vi.fn()}
      />,
    );

    expect(screen.getByText(/Tính theo tỉnh\/thành ở bước thanh toán/i)).toBeInTheDocument();
    expect(screen.getByText(/900\.000/)).toBeInTheDocument();
    expect(screen.queryByText((content) => content.includes('930.000'))).not.toBeInTheDocument();
  });
});

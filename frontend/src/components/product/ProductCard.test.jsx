import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProductCard from './ProductCard';

vi.mock('../../hooks/useCart', () => ({ useCart: () => ({ addToCart: vi.fn() }) }));
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: null, toggleWishlist: vi.fn().mockResolvedValue([]) }),
}));
vi.mock('react-toastify', () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

describe('ProductCard semantics', () => {
  afterEach(cleanup);

  it('keeps action buttons outside the product detail link', () => {
    render(
      <MemoryRouter>
        <ProductCard product={{
          id: 'phone-1',
          name: 'Phone',
          brand: 'Brand',
          image: 'phone.png',
          price: 100,
          oldPrice: 120,
          stock: 2,
          status: 'active',
          rating: 5,
          sold: 1,
          ram: '8GB',
          storage: '128GB',
        }} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /phone/i })).toBeInTheDocument();
    screen.getAllByRole('button').forEach((button) => {
      expect(button.closest('a')).toBeNull();
    });
  });
});

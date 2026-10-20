import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { productApi } from '../api/productApi';
import Products from './Products';

vi.mock('../api/productApi', () => ({ productApi: { getAll: vi.fn() } }));
vi.mock('../components/product/ProductGrid', () => ({ default: () => null }));

describe('Products URL state', () => {
  afterEach(cleanup);
  beforeEach(() => vi.clearAllMocks());

  it('updates the search input when URL navigation changes without remounting', async () => {
    productApi.getAll.mockResolvedValue([]);
    const router = createMemoryRouter(
      [{ path: '/products', element: <Products /> }],
      { initialEntries: ['/products?q=iphone'] },
    );
    render(<RouterProvider router={router} />);

    const search = await screen.findByPlaceholderText(/tìm theo tên/i);
    expect(search).toHaveValue('iphone');
    await router.navigate('/products?q=samsung');
    await waitFor(() => expect(search).toHaveValue('samsung'));
  });

  it('shows a retry action when the catalog request fails', async () => {
    productApi.getAll.mockRejectedValue(new Error('Products offline'));
    const router = createMemoryRouter(
      [{ path: '/products', element: <Products /> }],
      { initialEntries: ['/products'] },
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByText('Products offline')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /thử lại/i })).toBeInTheDocument();
  });
});

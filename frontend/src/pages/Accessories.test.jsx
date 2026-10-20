import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { accessoryApi } from '../api/accessoryApi';
import Accessories from './Accessories';

vi.mock('../api/accessoryApi', () => ({ accessoryApi: { getAll: vi.fn() } }));
vi.mock('../components/product/ProductGrid', () => ({ default: () => null }));

describe('Accessories URL state', () => {
  afterEach(cleanup);
  beforeEach(() => vi.clearAllMocks());

  it('updates brand and category filters after browser navigation', async () => {
    accessoryApi.getAll.mockResolvedValue([
      { id: 'a1', name: 'AirPods', brand: 'Apple', category: 'Tai nghe', status: 'active' },
      { id: 'a2', name: 'Charger', brand: 'Anker', category: 'Sạc', status: 'active' },
    ]);
    const router = createMemoryRouter(
      [{ path: '/accessories', element: <Accessories /> }],
      { initialEntries: ['/accessories?brand=Apple&category=Tai+nghe'] },
    );
    render(<RouterProvider router={router} />);

    const brand = await screen.findByRole('combobox', { name: /thương hiệu phụ kiện/i });
    const category = screen.getByRole('combobox', { name: /loại phụ kiện/i });
    expect(brand).toHaveValue('Apple');
    expect(category).toHaveValue('Tai nghe');

    await router.navigate('/accessories?brand=Anker&category=S%E1%BA%A1c');
    await waitFor(() => expect(brand).toHaveValue('Anker'));
    expect(category).toHaveValue('Sạc');
  });

  it('shows a retry action when accessory loading fails', async () => {
    accessoryApi.getAll.mockRejectedValue(new Error('Accessories offline'));
    const router = createMemoryRouter(
      [{ path: '/accessories', element: <Accessories /> }],
      { initialEntries: ['/accessories'] },
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByText('Accessories offline')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /thử lại/i })).toBeInTheDocument();
  });
});

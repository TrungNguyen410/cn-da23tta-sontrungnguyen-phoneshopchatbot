import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { accessoryApi } from '../api/accessoryApi';
import { productApi } from '../api/productApi';
import { STORAGE_KEYS } from '../utils/constants';
import { storage } from '../utils/storage';
import Favorites from './Favorites';

vi.mock('../api/productApi', () => ({ productApi: { getAll: vi.fn() } }));
vi.mock('../api/accessoryApi', () => ({ accessoryApi: { getAll: vi.fn() } }));
vi.mock('../components/product/ProductGrid', () => ({
  default: ({ products }) => <div>{products.map((item) => <span key={item.id}>{item.name}</span>)}</div>,
}));

describe('Favorites page', () => {
  afterEach(() => {
    cleanup();
    storage.remove(STORAGE_KEYS.wishlist);
  });

  it('shows saved products and accessories in one place', async () => {
    storage.set(STORAGE_KEYS.wishlist, ['phone-1', 'accessory-1']);
    productApi.getAll.mockResolvedValue([{ id: 'phone-1', name: 'Saved Phone' }]);
    accessoryApi.getAll.mockResolvedValue([{ id: 'accessory-1', name: 'Saved Earbuds' }]);

    render(<MemoryRouter><Favorites /></MemoryRouter>);
    expect(await screen.findByText('Saved Phone')).toBeInTheDocument();
    expect(screen.getByText('Saved Earbuds')).toBeInTheDocument();
  });

  it('shows a retryable error instead of an empty wishlist when catalog loading fails', async () => {
    productApi.getAll.mockRejectedValue(new Error('Catalog offline'));
    accessoryApi.getAll.mockResolvedValue([]);

    render(<MemoryRouter><Favorites /></MemoryRouter>);
    expect(await screen.findByText('Catalog offline')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /thử lại/i })).toBeInTheDocument();
    expect(screen.queryByText('Chưa có sản phẩm yêu thích')).not.toBeInTheDocument();
  });
});

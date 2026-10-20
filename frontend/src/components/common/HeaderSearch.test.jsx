import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { productApi } from '../../api/productApi';
import { accessoryApi } from '../../api/accessoryApi';
import Header from './Header';

vi.mock('../../api/productApi', () => ({ productApi: { getAll: vi.fn() } }));
vi.mock('../../api/accessoryApi', () => ({ accessoryApi: { getAll: vi.fn() } }));
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, logout: vi.fn() }),
}));
vi.mock('../../hooks/useCart', () => ({ useCart: () => ({ cartCount: 0 }) }));
vi.mock('../../hooks/useStoreSettings', () => ({
  useStoreSettings: () => ({ hotline: '0900000000', storeName: 'TechPhone' }),
}));

describe('Header search suggestions', () => {
  afterEach(cleanup);

  it('suggests matching products while typing', async () => {
    productApi.getAll.mockResolvedValue([
      { id: 'phone-1', name: 'iPhone 16 Pro', brand: 'Apple', category: 'Điện thoại', price: 100, image: 'phone.png' },
    ]);
    accessoryApi.getAll.mockResolvedValue([]);
    render(<MemoryRouter><Header /></MemoryRouter>);

    const search = screen.getByPlaceholderText(/điện thoại nào/i);
    expect(search).toHaveAttribute('role', 'combobox');
    expect(search).toHaveAttribute('aria-expanded', 'false');
    fireEvent.focus(search);
    fireEvent.change(search, { target: { value: 'iphone' } });
    expect(await screen.findByText('iPhone 16 Pro', {}, { timeout: 2500 })).toBeInTheDocument();
    expect(search).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    expect(screen.getByRole('option')).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(search, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

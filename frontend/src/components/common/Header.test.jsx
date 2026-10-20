import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Header from './Header';

vi.mock('../../api/productApi', () => ({ productApi: { getAll: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../api/accessoryApi', () => ({ accessoryApi: { getAll: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, logout: vi.fn() }),
}));
vi.mock('../../hooks/useCart', () => ({ useCart: () => ({ cartCount: 0 }) }));
vi.mock('../../hooks/useStoreSettings', () => ({
  useStoreSettings: () => ({ hotline: '0900000000', storeName: 'TechPhone' }),
}));

describe('Header mobile menu', () => {
  afterEach(cleanup);

  it('mounts the drawer only while open and closes it with Escape', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Header /></MemoryRouter>);
    const trigger = screen.getByRole('button', { name: /mở menu/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog', { name: /menu/i })).not.toBeInTheDocument();

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: /menu/i })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: /menu/i })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});

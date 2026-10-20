import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CatalogManagement from './CatalogManagement';

vi.mock('./ProductFormModal', () => ({ default: () => null }));
vi.mock('../common/ConfirmModal', () => ({ default: () => null }));
vi.mock('../common/Loading', () => ({ default: () => <div>Loading</div> }));
vi.mock('./DataTable', () => ({
  default: ({ rows }) => <div>{rows.map((item) => <span key={item.id}>{item.name}</span>)}</div>,
}));

describe('CatalogManagement adapter boundary', () => {
  it('loads the explicit admin catalog surface, including inactive items', async () => {
    const api = {
      getAll: vi.fn(),
      getAllAdmin: vi.fn().mockResolvedValue([
        { id: 'active-product', name: 'Active product', brand: 'Brand', status: 'active', stock: 1 },
        { id: 'inactive-product', name: 'Inactive product', brand: 'Brand', status: 'inactive', stock: 1 },
      ]),
      create: vi.fn(), update: vi.fn(), remove: vi.fn(),
    };

    render(<CatalogManagement api={api} />);

    expect(await screen.findByText('Inactive product')).toBeInTheDocument();
    expect(api.getAllAdmin).toHaveBeenCalledTimes(1);
    expect(api.getAll).not.toHaveBeenCalled();
  });
});

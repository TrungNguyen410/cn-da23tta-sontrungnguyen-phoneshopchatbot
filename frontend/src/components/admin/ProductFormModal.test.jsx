import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { adminApi } from '../../api/adminApi';
import ProductFormModal from './ProductFormModal';

vi.mock('../../api/adminApi', () => ({ adminApi: {
  brands: { getAll: vi.fn() },
  categories: { getAll: vi.fn() },
} }));

describe('ProductFormModal', () => {
  it('submits selected taxonomy ids', async () => {
    adminApi.brands.getAll.mockResolvedValue([{ id: 'brand-1', name: 'Apple', active: true }]);
    adminApi.categories.getAll.mockResolvedValue([{ id: 'category-1', name: 'Điện thoại', active: true }]);
    const onSubmit = vi.fn();
    render(<ProductFormModal open kind="product" onClose={vi.fn()} onSubmit={onSubmit} />);
    await waitFor(() => expect(screen.getByRole('option', { name: 'Apple' })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/tên sản phẩm/i), { target: { value: 'iPhone Test' } });
    fireEvent.change(screen.getByLabelText(/thương hiệu/i), { target: { value: 'brand-1' } });
    fireEvent.change(screen.getByLabelText(/danh mục/i), { target: { value: 'category-1' } });
    fireEvent.change(screen.getByLabelText(/giá bán/i), { target: { value: '1000000' } });
    fireEvent.change(screen.getByLabelText(/mô tả/i), { target: { value: 'Test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm mới' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ brandId: 'brand-1', categoryId: 'category-1' }));
  });
});

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TaxonomyManagement from './TaxonomyManagement';

vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
const api = () => ({
  getAll: vi.fn().mockResolvedValue([]),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
});

describe('TaxonomyManagement', () => {
  afterEach(cleanup);

  it('shows logo and description fields for brands', async () => {
    render(<TaxonomyManagement api={api()} type="brand" />);
    fireEvent.click(await screen.findByRole('button', { name: /thêm thương hiệu/i }));
    expect(screen.getByText('Logo thương hiệu')).toBeInTheDocument();
    expect(screen.getByText('Mô tả')).toBeInTheDocument();
  });

  it('omits logo for categories', async () => {
    render(<TaxonomyManagement api={api()} type="category" />);
    fireEvent.click(await screen.findByRole('button', { name: /thêm danh mục/i }));
    expect(screen.queryByText('Logo thương hiệu')).not.toBeInTheDocument();
    expect(screen.getByText('Mô tả')).toBeInTheDocument();
  });

  it('keeps the form open and blocks duplicate saves when the API rejects', async () => {
    let rejectCreate;
    const pendingCreate = new Promise((_, reject) => { rejectCreate = reject; });
    const categoryApi = api();
    categoryApi.create.mockReturnValue(pendingCreate);
    render(<TaxonomyManagement api={categoryApi} type="category" />);

    fireEvent.click(await screen.findByRole('button', { name: /thêm danh mục/i }));
    fireEvent.change(screen.getByLabelText(/tên danh mục/i), {
      target: { value: 'Điện thoại' },
    });
    const saveButton = screen.getByRole('button', { name: /lưu dữ liệu/i });
    fireEvent.click(saveButton);
    fireEvent.click(saveButton);

    expect(categoryApi.create).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /đang lưu/i })).toBeDisabled();
    rejectCreate(Object.assign(new Error('Tên đã tồn tại'), {
      friendlyMessage: 'Tên đã tồn tại',
    }));
    await waitFor(() => expect(screen.getByDisplayValue('Điện thoại')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /lưu dữ liệu/i })).not.toBeDisabled();
  });
});

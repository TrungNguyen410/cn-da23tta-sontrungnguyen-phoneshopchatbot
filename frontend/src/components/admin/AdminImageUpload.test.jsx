import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadApi } from '../../api/uploadApi';
import AdminImageUpload from './AdminImageUpload';

vi.mock('../../api/uploadApi', () => ({
  uploadApi: { adminImage: vi.fn(), supportsDeviceUpload: true },
}));
vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('AdminImageUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadApi.supportsDeviceUpload = true;
  });
  afterEach(cleanup);

  it('uploads a selected local image and returns its URL', async () => {
    uploadApi.adminImage.mockResolvedValue({ url: 'http://localhost/uploads/admin/image.png' });
    const onChange = vi.fn();
    render(<AdminImageUpload label="Ảnh sản phẩm" onChange={onChange} />);

    const file = new File(['image'], 'phone.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Ảnh sản phẩm'), { target: { files: [file] } });

    await waitFor(() => expect(uploadApi.adminImage).toHaveBeenCalledWith(file));
    expect(onChange).toHaveBeenCalledWith('http://localhost/uploads/admin/image.png');
  });

  it('keeps selected image order and stops at five images', async () => {
    const existing = ['one.png', 'two.png', 'three.png', 'four.png'];
    uploadApi.adminImage.mockImplementation((file) =>
      Promise.resolve({ url: `http://localhost/uploads/admin/${file.name}` }));
    const onChange = vi.fn();
    render(
      <AdminImageUpload
        label="Ảnh sản phẩm"
        value={existing}
        onChange={onChange}
        multiple
        maxImages={5}
      />,
    );

    const firstSelected = new File(['five'], 'five.png', { type: 'image/png' });
    const overLimit = new File(['six'], 'six.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Ảnh sản phẩm'), {
      target: { files: [firstSelected, overLimit] },
    });

    await waitFor(() => expect(uploadApi.adminImage).toHaveBeenCalledTimes(1));
    expect(onChange).toHaveBeenCalledWith([
      ...existing,
      'http://localhost/uploads/admin/five.png',
    ]);
  });

  it('accepts only a durable HTTPS URL when device upload is not configured', async () => {
    uploadApi.supportsDeviceUpload = false;
    const onChange = vi.fn();
    render(<AdminImageUpload label="Ảnh sản phẩm" onChange={onChange} />);

    expect(screen.queryByLabelText('Ảnh sản phẩm')).not.toBeInTheDocument();
    const urlInput = screen.getByRole('textbox', { name: 'URL HTTPS cho Ảnh sản phẩm' });

    fireEvent.change(urlInput, { target: { value: 'http://example.com/phone.png' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dùng URL ảnh' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('https://');

    fireEvent.change(urlInput, { target: { value: 'https://cdn.example.com/phone.png' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dùng URL ảnh' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(
      'https://cdn.example.com/phone.png',
    ));
    expect(uploadApi.adminImage).not.toHaveBeenCalled();
  });
});

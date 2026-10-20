import { describe, expect, it, vi } from 'vitest';
import { createUploadApi } from './uploadApi';

describe('uploadApi', () => {
  it('uploads directly to a configured unsigned Cloudinary endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ secure_url: 'https://cdn.example.com/phone.png' }),
    });
    const api = createUploadApi({
      useMock: false,
      cloudName: 'techphone-demo',
      uploadPreset: 'unsigned-demo',
      fetcher,
    });
    const file = new File(['image'], 'phone.png', { type: 'image/png' });

    await expect(api.adminImage(file)).resolves.toMatchObject({
      field: 'adminImage',
      url: 'https://cdn.example.com/phone.png',
    });
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.cloudinary.com/v1_1/techphone-demo/image/upload',
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
    );
  });

  it('disables device upload instead of writing to ephemeral server storage', async () => {
    const fetcher = vi.fn();
    const api = createUploadApi({
      useMock: false,
      cloudName: '',
      uploadPreset: '',
      fetcher,
    });

    expect(api.supportsDeviceUpload).toBe(false);
    await expect(api.adminImage(new File(['x'], 'x.png'))).rejects.toThrow('Cloudinary');
    expect(fetcher).not.toHaveBeenCalled();
  });
});

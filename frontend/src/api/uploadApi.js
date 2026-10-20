import { USE_MOCK } from '../utils/constants';
import { runtimeConfig } from '../utils/runtimeConfig';

const readMockImage = (fieldName, file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      filename: file.name,
      field: fieldName,
      url: reader.result,
    });
    reader.onerror = () => reject(new Error('Không thể đọc file ảnh'));
    reader.readAsDataURL(file);
  });

export const createUploadApi = ({
  useMock = USE_MOCK,
  cloudName = runtimeConfig.cloudinary.cloudName,
  uploadPreset = runtimeConfig.cloudinary.uploadPreset,
  fetcher = (...args) => globalThis.fetch(...args),
} = {}) => {
  const hasCloudinary = Boolean(cloudName && uploadPreset);

  const uploadImage = async (fieldName, file) => {
    if (useMock) {
      return readMockImage(fieldName, file);
    }
    if (!hasCloudinary) {
      throw new Error('Chưa cấu hình Cloudinary; hãy dùng URL ảnh HTTPS');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    const response = await fetcher(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
      { method: 'POST', body: formData },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.secure_url) {
      throw new Error(payload.error?.message || 'Cloudinary không trả về URL ảnh hợp lệ');
    }

    return {
      filename: file.name,
      field: fieldName,
      url: payload.secure_url,
    };
  };

  return {
    supportsDeviceUpload: useMock || hasCloudinary,
    adminImage: (file) => uploadImage('adminImage', file),
    reviewImage: (file) => uploadImage('reviewImage', file),
  };
};

export const uploadApi = createUploadApi();

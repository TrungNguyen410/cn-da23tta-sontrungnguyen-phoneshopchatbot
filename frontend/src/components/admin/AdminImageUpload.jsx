import { useId, useState } from 'react';
import { FiCheck, FiImage, FiTrash2, FiUploadCloud } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { uploadApi } from '../../api/uploadApi';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function AdminImageUpload({
  label = 'Hình ảnh',
  value = '',
  onChange,
  required = false,
  multiple = false,
  maxImages = 5,
}) {
  const inputId = useId();
  const urlInputId = useId();
  const [uploading, setUploading] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [urlError, setUrlError] = useState('');
  const images = multiple
    ? [...new Set((Array.isArray(value) ? value : [value]).filter(Boolean))].slice(0, maxImages)
    : [];

  const selectImage = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = '';
    if (!selectedFiles.length) return;

    const remainingSlots = multiple ? maxImages - images.length : 1;
    if (remainingSlots <= 0) {
      toast.error(`Chỉ được chọn tối đa ${maxImages} ảnh`);
      return;
    }
    const supportedFiles = selectedFiles.filter((file) => ALLOWED_TYPES.includes(file.type));
    if (supportedFiles.length !== selectedFiles.length) {
      toast.error('Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF');
    }
    const sizeValidFiles = supportedFiles.filter((file) => file.size <= MAX_IMAGE_SIZE);
    if (sizeValidFiles.length !== supportedFiles.length) {
      toast.error('Ảnh không được vượt quá 5MB');
    }
    const validFiles = sizeValidFiles.slice(0, remainingSlots);
    if (supportedFiles.length > remainingSlots) {
      toast.error(`Chỉ thêm được ${remainingSlots} ảnh để không vượt quá ${maxImages} ảnh`);
    }
    if (!validFiles.length) {
      return;
    }

    setUploading(true);
    try {
      const uploaded = await Promise.all(validFiles.map((file) => uploadApi.adminImage(file)));
      const uploadedUrls = uploaded.map((item) => item.url);
      onChange(multiple ? [...images, ...uploadedUrls].slice(0, maxImages) : uploadedUrls[0]);
      toast.success(`Đã tải ${uploadedUrls.length} ảnh lên`);
    } catch (error) {
      toast.error(error.friendlyMessage || error.message || 'Không thể tải ảnh lên');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    if (multiple) onChange(images.filter((_, imageIndex) => imageIndex !== index));
    else onChange('');
  };

  const makePrimary = (index) => {
    const selected = images[index];
    onChange([selected, ...images.filter((_, imageIndex) => imageIndex !== index)]);
  };

  const hasValue = multiple ? images.length > 0 : Boolean(value);
  const useExternalUrl = !uploadApi.supportsDeviceUpload;

  const applyExternalUrl = () => {
    const candidate = urlDraft.trim();
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol !== 'https:') throw new Error();
    } catch {
      setUrlError('URL ảnh phải hợp lệ và bắt đầu bằng https://');
      return;
    }

    if (multiple && images.length >= maxImages) {
      setUrlError(`Chỉ được chọn tối đa ${maxImages} ảnh`);
      return;
    }
    onChange(multiple ? [...images, candidate].slice(0, maxImages) : candidate);
    setUrlDraft('');
    setUrlError('');
  };

  return (
    <div className="form-field full admin-image-field" data-uploading={uploading}>
      <span>{label}{required ? ' *' : ''}</span>
      <div className={`admin-image-upload ${hasValue ? 'has-image' : ''} ${multiple ? 'multiple' : ''}`}>
        {multiple ? (
          <div className="admin-image-grid">
            {images.length ? images.map((image, index) => (
              <article className={index === 0 ? 'primary' : ''} key={image}>
                <img src={image} alt={`${label} ${index + 1}`} />
                {index === 0 && <span><FiCheck /> Ảnh đại diện</span>}
                <div>
                  {index > 0 && (
                    <button type="button" onClick={() => makePrimary(index)}>
                      <FiImage /> Đặt làm ảnh chính
                    </button>
                  )}
                  <button type="button" className="danger" onClick={() => removeImage(index)}>
                    <FiTrash2 /> Xóa
                  </button>
                </div>
              </article>
            )) : <div className="admin-image-empty"><FiImage /><small>Chưa chọn ảnh</small></div>}
          </div>
        ) : (
          <div className="admin-image-preview">
            {value
              ? <img src={value} alt={`Xem trước ${label.toLowerCase()}`} />
              : <div><FiImage /><small>Chưa chọn ảnh</small></div>}
          </div>
        )}
        <div className="admin-image-actions">
          {useExternalUrl ? (
            <div className="admin-image-url-input">
              <label htmlFor={urlInputId}>URL HTTPS cho {label}</label>
              <div>
                <input
                  id={urlInputId}
                  type="url"
                  inputMode="url"
                  placeholder="https://cdn.example.com/image.jpg"
                  value={urlDraft}
                  required={required && !hasValue}
                  aria-invalid={Boolean(urlError)}
                  aria-describedby={urlError ? `${urlInputId}-error` : undefined}
                  onChange={(event) => {
                    setUrlDraft(event.target.value);
                    setUrlError('');
                  }}
                />
                <button type="button" className="btn btn-light" onClick={applyExternalUrl}>
                  Dùng URL ảnh
                </button>
              </div>
              {urlError && <small id={`${urlInputId}-error`} role="alert">{urlError}</small>}
              <small>Chưa cấu hình Cloudinary nên ảnh phải dùng một URL HTTPS công khai, lâu dài.</small>
            </div>
          ) : (
            <>
              <label htmlFor={inputId} className="btn btn-light">
                <FiUploadCloud />
                {uploading
                  ? 'Đang tải ảnh...'
                  : multiple
                    ? `Thêm ảnh (${images.length}/${maxImages})`
                    : value ? 'Chọn ảnh khác' : 'Chọn ảnh từ máy'}
              </label>
              <input
                id={inputId}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
                aria-label={label}
                multiple={multiple}
                disabled={uploading || (multiple && images.length >= maxImages)}
                onChange={selectImage}
              />
            </>
          )}
          {!multiple && value && (
            <button
              type="button"
              className="admin-image-remove"
              onClick={() => removeImage(0)}
              disabled={uploading}
            >
              <FiTrash2 /> Xóa ảnh
            </button>
          )}
          {!useExternalUrl && (
            <small>
              {multiple
                ? `Tối đa ${maxImages} ảnh · ảnh đầu tiên là ảnh đại diện · mỗi ảnh tối đa 5MB`
                : 'JPG, PNG, WEBP hoặc GIF · tối đa 5MB'}
            </small>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { makeAccessoryImage, makeProductImage } from '../../mock/imageFactory';
import { adminApi } from '../../api/adminApi';
import AdminImageUpload from './AdminImageUpload';
import AccessibleDialog from '../common/AccessibleDialog';

const emptyProduct = {
  name: '',
  brandId: '',
  categoryId: '',
  price: '',
  oldPrice: '',
  ram: '8GB',
  storage: '256GB',
  screen: '6.7 inch OLED, 120Hz',
  battery: '5000 mAh',
  camera: '50MP',
  chip: 'Chip 8 nhân hiệu năng cao',
  stock: 10,
  status: 'active',
  description: '',
  image: '',
  images: [],
};

export default function ProductFormModal({
  open,
  item,
  kind = 'product',
  onClose,
  onSubmit,
  saving = false,
}) {
  const [form, setForm] = useState(emptyProduct);
  const [taxonomies, setTaxonomies] = useState({ brands: [], categories: [] });

  useEffect(() => {
    if (!open) return;
    if (!item) {
      setForm({ ...emptyProduct, images: [] });
      return;
    }
    const images = [...new Set([item.image, ...(item.images || [])].filter(Boolean))].slice(0, 5);
    setForm({ ...emptyProduct, ...item, image: images[0] || '', images });
  }, [item, kind, open]);

  useEffect(() => {
    if (!open) return;
    Promise.all([adminApi.brands.getAll(), adminApi.categories.getAll()]).then(([brands, categories]) => {
      setTaxonomies({ brands: brands.filter((brand) => brand.active), categories: categories.filter((category) => category.active) });
    });
  }, [open]);

  if (!open) return null;
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event) => {
    event.preventDefault();
    if (saving) return;
    if (event.currentTarget.querySelector('[data-uploading="true"]')) {
      toast.error('Vui lòng chờ ảnh tải lên hoàn tất');
      return;
    }
    const price = Number(form.price);
    const oldPrice = Number(form.oldPrice || form.price);
    const selectedImages = [...new Set((form.images || []).filter(Boolean))].slice(0, 5);
    const image =
      selectedImages[0] ||
      form.image ||
      (kind === 'accessory'
        ? makeAccessoryImage(form.name || 'Phụ kiện')
        : makeProductImage(form.name || 'Điện thoại'));
    const brand = taxonomies.brands.find((entry) => entry.id === form.brandId) || taxonomies.brands.find((entry) => entry.name === form.brand);
    const category = taxonomies.categories.find((entry) => entry.id === form.categoryId) || taxonomies.categories.find((entry) => entry.name === form.category);
    const catalogPayload = { ...form };
    delete catalogPayload.brand;
    delete catalogPayload.category;
    onSubmit({
      ...catalogPayload,
      brandId: brand?.id || form.brandId,
      categoryId: category?.id || form.categoryId,
      price,
      oldPrice,
      stock: Number(form.stock),
      image,
      images: selectedImages.length ? selectedImages : [image],
      discountPercent: oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0,
      rating: form.rating || 5,
      sold: form.sold || 0,
      specifications:
        kind === 'accessory'
          ? { 'Thương hiệu': brand?.name || '', 'Loại phụ kiện': category?.name || '', 'Bảo hành': '12 tháng' }
          : {
              'Màn hình': form.screen,
              RAM: form.ram,
              'Bộ nhớ trong': form.storage,
              Pin: form.battery,
              Camera: form.camera,
              Chip: form.chip,
            },
    });
  };

  return (
    <AccessibleDialog
      open={open}
      title={item ? `Chỉnh sửa ${item.name}` : kind === 'product' ? 'Thêm sản phẩm' : 'Thêm phụ kiện'}
      className="admin-form-dialog"
      onClose={() => {
        if (!saving) onClose();
      }}
    >
      <form className="admin-form-modal" onSubmit={submit}>
        <div className="admin-modal-head">
          <div><span>{item ? 'Chỉnh sửa dữ liệu' : 'Tạo dữ liệu mới'}</span><h2>{item ? item.name : kind === 'product' ? 'Thêm sản phẩm' : 'Thêm phụ kiện'}</h2></div>
          <button type="button" disabled={saving} onClick={onClose}><FiX /></button>
        </div>
        <div className="form-grid">
          <label className="form-field full"><span>Tên {kind === 'product' ? 'sản phẩm' : 'phụ kiện'} *</span><input required value={form.name} onChange={(event) => update('name', event.target.value)} /></label>
          <label className="form-field"><span>Thương hiệu *</span><select required value={form.brandId || taxonomies.brands.find((entry) => entry.name === form.brand)?.id || ''} onChange={(event) => update('brandId', event.target.value)}><option value="">Chọn thương hiệu</option>{taxonomies.brands.map((entry) => <option value={entry.id} key={entry.id}>{entry.name}</option>)}</select></label>
          <label className="form-field"><span>Danh mục *</span><select required value={form.categoryId || taxonomies.categories.find((entry) => entry.name === form.category)?.id || ''} onChange={(event) => update('categoryId', event.target.value)}><option value="">Chọn danh mục</option>{taxonomies.categories.map((entry) => <option value={entry.id} key={entry.id}>{entry.name}</option>)}</select></label>
          <label className="form-field"><span>Giá bán *</span><input required min="0" type="number" value={form.price} onChange={(event) => update('price', event.target.value)} /></label>
          <label className="form-field"><span>Giá cũ</span><input min="0" type="number" value={form.oldPrice} onChange={(event) => update('oldPrice', event.target.value)} /></label>
          <label className="form-field"><span>Tồn kho *</span><input required min="0" type="number" value={form.stock} onChange={(event) => update('stock', event.target.value)} /></label>
          <label className="form-field"><span>Trạng thái</span><select value={form.status} onChange={(event) => update('status', event.target.value)}><option value="active">Đang bán</option><option value="inactive">Ngừng bán</option></select></label>
          {kind === 'product' && <>
            <label className="form-field"><span>RAM</span><input value={form.ram} onChange={(event) => update('ram', event.target.value)} /></label>
            <label className="form-field"><span>Bộ nhớ</span><input value={form.storage} onChange={(event) => update('storage', event.target.value)} /></label>
            <label className="form-field"><span>Màn hình</span><input value={form.screen} onChange={(event) => update('screen', event.target.value)} /></label>
            <label className="form-field"><span>Pin</span><input value={form.battery} onChange={(event) => update('battery', event.target.value)} /></label>
            <label className="form-field"><span>Camera</span><input value={form.camera} onChange={(event) => update('camera', event.target.value)} /></label>
            <label className="form-field"><span>Chip</span><input value={form.chip} onChange={(event) => update('chip', event.target.value)} /></label>
          </>}
          <AdminImageUpload
            label={`Ảnh ${kind === 'product' ? 'sản phẩm' : 'phụ kiện'}`}
            value={form.images}
            multiple
            maxImages={5}
            onChange={(images) => setForm((current) => ({
              ...current,
              image: images[0] || '',
              images,
            }))}
          />
          <label className="form-field full"><span>Mô tả *</span><textarea required rows="4" value={form.description} onChange={(event) => update('description', event.target.value)} /></label>
        </div>
        <div className="admin-modal-actions">
          <button type="button" className="btn btn-light" disabled={saving} onClick={onClose}>Hủy</button>
          <button className="btn btn-primary" disabled={saving}>
            {saving ? 'Đang lưu…' : item ? 'Lưu thay đổi' : 'Thêm mới'}
          </button>
        </div>
      </form>
    </AccessibleDialog>
  );
}

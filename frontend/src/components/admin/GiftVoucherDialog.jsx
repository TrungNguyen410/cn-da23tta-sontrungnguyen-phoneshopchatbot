import { useState } from 'react';
import { FiCheckCircle, FiCopy, FiGift } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { adminApi } from '../../api/adminApi';
import AccessibleDialog from '../common/AccessibleDialog';
import { formatCurrency } from '../../utils/formatCurrency';
import { describeVoucher } from '../../utils/voucherText';

const inDays = (days) => {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const initialForm = () => ({
  type: 'percent',
  value: '10',
  maxDiscount: '500000',
  minOrder: '0',
  endDate: inDays(30),
  note: '',
});

// Creates a one-use voucher that only this customer can see (Tài khoản → Voucher của tôi) and redeem.
export default function GiftVoucherDialog({ customer, onClose }) {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);
  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  };

  const validate = () => {
    const next = {};
    const value = Number(form.value);
    if (!(value > 0)) next.value = 'Giá trị giảm phải lớn hơn 0';
    else if (form.type === 'percent' && value > 100) next.value = 'Giảm theo phần trăm tối đa 100%';
    if (Number(form.minOrder) < 0) next.minOrder = 'Không được âm';
    if (form.type === 'percent' && Number(form.maxDiscount) < 0) next.maxDiscount = 'Không được âm';
    if (!form.endDate || form.endDate < inDays(0)) next.endDate = 'Hạn dùng phải từ hôm nay trở đi';
    setErrors(next);
    return !Object.keys(next).length;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving || !validate()) return;
    setSaving(true);
    try {
      const payload = {
        type: form.type,
        value: Number(form.value),
        minOrder: Number(form.minOrder || 0),
        endDate: form.endDate,
        ...(form.type === 'percent' ? { maxDiscount: Number(form.maxDiscount || 0) } : {}),
        ...(form.note.trim() ? { note: form.note.trim() } : {}),
      };
      const voucher = await adminApi.giftVoucher(customer.id, payload);
      setCreated(voucher);
      toast.success(`Đã tặng mã ${voucher.code} cho ${customer.fullName}`);
    } catch (error) {
      toast.error(error.friendlyMessage || error.message);
    } finally {
      setSaving(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(created.code);
      toast.success('Đã sao chép mã voucher');
    } catch {
      toast.error('Không sao chép được, hãy chọn và sao chép mã thủ công');
    }
  };

  const errorProps = (key) => ({
    'aria-invalid': Boolean(errors[key]),
    'aria-describedby': errors[key] ? `gift-${key}-error` : undefined,
  });
  const errorText = (key) => errors[key] && <small id={`gift-${key}-error`}>{errors[key]}</small>;
  const valueSuffix = form.type === 'percent' ? '%' : 'đ';

  return (
    <AccessibleDialog open title={`Tặng voucher cho ${customer.fullName}`} className="order-detail-modal gift-voucher-modal" onClose={onClose}>
      <button type="button" className="icon-button modal-close" aria-label="Đóng" onClick={onClose}>×</button>
      <h2><FiGift aria-hidden="true" /> Tặng voucher</h2>
      <p className="gift-voucher-customer">
        <strong>{customer.fullName}</strong> · {customer.phone} · đã chi {formatCurrency(customer.totalSpent)} qua {customer.orderCount} đơn
      </p>
      {created ? (
        <div className="gift-voucher-done">
          <FiCheckCircle aria-hidden="true" />
          <span>Mã đã được thêm vào mục <b>Voucher của tôi</b> trong tài khoản khách. Mỗi mã dùng 1 lần.</span>
          <div className="gift-voucher-code"><strong>{created.code}</strong><button type="button" className="btn btn-outline" onClick={copyCode}><FiCopy /> Sao chép</button></div>
          <small>{describeVoucher(created)} · hạn đến {new Date(`${String(created.endDate).slice(0, 10)}T00:00:00`).toLocaleDateString('vi-VN')}</small>
          <button type="button" className="btn btn-primary" onClick={onClose}>Xong</button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <div className="form-grid">
            <label className="form-field">
              <span>Loại ưu đãi</span>
              <select value={form.type} onChange={(event) => update('type', event.target.value)}>
                <option value="percent">Giảm theo %</option>
                <option value="fixed">Giảm số tiền</option>
                <option value="shipping">Giảm phí vận chuyển</option>
              </select>
            </label>
            <label className="form-field">
              <span>Giá trị giảm ({valueSuffix}) *</span>
              <input {...errorProps('value')} type="number" min="0" step={form.type === 'percent' ? 1 : 1000} value={form.value} onChange={(event) => update('value', event.target.value)} />
              {errorText('value')}
            </label>
            {form.type === 'percent' && (
              <label className="form-field">
                <span>Giảm tối đa (đ, 0 = không giới hạn)</span>
                <input {...errorProps('maxDiscount')} type="number" min="0" step="1000" value={form.maxDiscount} onChange={(event) => update('maxDiscount', event.target.value)} />
                {errorText('maxDiscount')}
              </label>
            )}
            <label className="form-field">
              <span>Đơn tối thiểu (đ)</span>
              <input {...errorProps('minOrder')} type="number" min="0" step="1000" value={form.minOrder} onChange={(event) => update('minOrder', event.target.value)} />
              {errorText('minOrder')}
            </label>
            <label className="form-field">
              <span>Hạn dùng *</span>
              <input {...errorProps('endDate')} type="date" min={inDays(0)} value={form.endDate} onChange={(event) => update('endDate', event.target.value)} />
              {errorText('endDate')}
            </label>
            <label className="form-field full">
              <span>Lời nhắn cho khách</span>
              <input maxLength={120} value={form.note} placeholder={`Tri ân khách hàng ${customer.fullName}`} onChange={(event) => update('note', event.target.value)} />
            </label>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang tạo…' : 'Tạo và tặng voucher'}</button>
          </div>
        </form>
      )}
    </AccessibleDialog>
  );
}

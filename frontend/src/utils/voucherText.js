import { formatCurrency } from './formatCurrency';

// Plain-language summary of what a voucher gives, shared by the admin gift dialog and "Voucher của tôi".
export const describeVoucher = (voucher = {}) => {
  const value = Number(voucher.value) || 0;
  let benefit;
  if (voucher.type === 'percent') {
    benefit = `Giảm ${value}%`;
    if (Number(voucher.maxDiscount) > 0) benefit += `, tối đa ${formatCurrency(voucher.maxDiscount)}`;
  } else if (voucher.type === 'shipping') {
    benefit = `Giảm phí vận chuyển đến ${formatCurrency(value)}`;
  } else {
    benefit = `Giảm ${formatCurrency(value)}`;
  }
  const minimum = Number(voucher.minOrder) > 0 ? ` cho đơn từ ${formatCurrency(voucher.minOrder)}` : '';
  return `${benefit}${minimum}`;
};

export const VOUCHER_STATUS = {
  available: { label: 'Dùng được', className: 'status-completed' },
  upcoming: { label: 'Chưa đến hạn', className: 'status-pending' },
  used: { label: 'Đã dùng', className: 'status-shipping' },
  expired: { label: 'Hết hạn', className: 'status-cancelled' },
  inactive: { label: 'Tạm dừng', className: 'status-cancelled' },
};

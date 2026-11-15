import { isValidEmail, isValidVietnamesePhone, validateRequired } from './validators';
import { matchWard } from './wards';

// Receiver details kept on the account (same fields as the backend `User.shippingAddress`).
export const SHIPPING_ADDRESS_FIELDS = ['fullName', 'email', 'phone', 'address', 'province', 'ward'];

export const pickShippingAddress = (source = {}) => Object.fromEntries(
  SHIPPING_ADDRESS_FIELDS.map((field) => [field, String(source?.[field] ?? '').trim()]),
);

// Checkout needs every field, email included, before a saved address can skip the form.
export const isUsableSavedAddress = (address) => (
  Boolean(address) && SHIPPING_ADDRESS_FIELDS.every((field) => String(address[field] || '').trim())
);

export const formatShippingAddress = (address = {}) => (
  [address.address, address.ward, address.province].filter(Boolean).join(', ')
);

export const emptyShippingAddress = (user = {}) => ({
  fullName: user.fullName || '',
  email: user.email || '',
  phone: user.phone || '',
  address: user.address || '',
  province: '',
  ward: '',
});

// `wards` is the province's list once loaded; before that the ward is only checked for presence.
export function validateShippingAddress(address, { wards = [], wardsReady = false } = {}) {
  const errors = validateRequired({
    fullName: address.fullName,
    email: address.email,
    phone: address.phone,
    address: address.address,
    province: address.province,
    ward: address.ward,
  });
  if (address.email && !isValidEmail(address.email)) errors.email = 'Email không đúng định dạng';
  if (address.phone && !isValidVietnamesePhone(address.phone)) errors.phone = 'Số điện thoại Việt Nam phải có 10 số';
  if (address.ward && wardsReady && wards.length && !matchWard(wards, address.ward)) {
    errors.ward = 'Chọn phường/xã/đặc khu có trong danh sách của tỉnh/thành đã chọn';
  }
  return errors;
}

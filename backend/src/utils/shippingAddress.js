const { normalizeVietnamesePhone } = require('./phone');

// The receiver details a customer can keep on their account for the next checkout.
// There is no district level: since 01/07/2025 addresses are province + ward/commune.
const SHIPPING_ADDRESS_FIELDS = ['fullName', 'email', 'phone', 'address', 'province', 'ward'];
const REQUIRED_FIELDS = ['fullName', 'phone', 'address', 'province', 'ward'];
const FIELD_LIMITS = {
  fullName: 120,
  email: 254,
  phone: 20,
  address: 255,
  province: 100,
  ward: 100,
};

const toShippingAddress = (source = {}) => {
  const address = Object.fromEntries(
    SHIPPING_ADDRESS_FIELDS.map((field) => [field, String(source?.[field] ?? '').trim()]),
  );
  address.email = address.email.toLowerCase();
  address.phone = normalizeVietnamesePhone(address.phone) || '';
  return address;
};

const isCompleteShippingAddress = (address) => (
  Boolean(address) && REQUIRED_FIELDS.every((field) => String(address[field] || '').trim())
);

module.exports = {
  FIELD_LIMITS,
  SHIPPING_ADDRESS_FIELDS,
  isCompleteShippingAddress,
  toShippingAddress,
};

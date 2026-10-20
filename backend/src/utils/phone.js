const VIETNAMESE_MOBILE_PATTERN = /^0(?:3|5|7|8|9)\d{8}$/;

const digitsOnly = (value) => String(value || '').trim().replace(/[\s().-]/g, '');

const normalizeVietnamesePhone = (value) => {
  let phone = digitsOnly(value);
  if (phone.startsWith('+84')) phone = `0${phone.slice(3)}`;
  else if (phone.startsWith('84') && phone.length === 11) phone = `0${phone.slice(2)}`;
  if (!VIETNAMESE_MOBILE_PATTERN.test(phone)) return null;
  return phone;
};

const maskPhone = (value) => {
  const phone = normalizeVietnamesePhone(value) || String(value || '');
  return phone.length >= 6 ? `${phone.slice(0, 3)}***${phone.slice(-3)}` : '***';
};

module.exports = {
  VIETNAMESE_MOBILE_PATTERN,
  maskPhone,
  normalizeVietnamesePhone,
};

export const isValidEmail = (value = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
export const normalizeVietnamesePhone = (value = '') => {
  let phone = String(value).trim().replace(/[\s().-]/g, '');
  if (phone.startsWith('+84')) phone = `0${phone.slice(3)}`;
  else if (phone.startsWith('84') && phone.length === 11) phone = `0${phone.slice(2)}`;
  return /^(03|05|07|08|09)\d{8}$/.test(phone) ? phone : null;
};
export const isValidVietnamesePhone = (value = '') => Boolean(normalizeVietnamesePhone(value));
export const isStrongEnoughPassword = (value = '') => value.length >= 6;

export const validateRequired = (fields) =>
  Object.entries(fields).reduce((errors, [key, value]) => {
    if (value === undefined || value === null || String(value).trim() === '') {
      errors[key] = 'Vui lòng nhập thông tin này';
    }
    return errors;
  }, {});

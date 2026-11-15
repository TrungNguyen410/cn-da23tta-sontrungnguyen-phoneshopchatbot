const { body } = require('express-validator');
const {
  FIELD_LIMITS,
  SHIPPING_ADDRESS_FIELDS,
  isCompleteShippingAddress,
  toShippingAddress,
} = require('../utils/shippingAddress');
const { normalizeVietnamesePhone } = require('../utils/phone');

const vietnamesePhone = (field, message = 'Số điện thoại Việt Nam không hợp lệ') =>
  body(field)
    .trim()
    .customSanitizer((value) => normalizeVietnamesePhone(value) || value)
    .custom((value) => Boolean(normalizeVietnamesePhone(value)))
    .withMessage(message);

const register = [
  body('fullName').trim().notEmpty().withMessage('Họ và tên là bắt buộc'),
  vietnamesePhone('phone'),
  body('password').isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
  body('role').not().exists().withMessage('Không được chỉ định vai trò khi đăng ký'),
  body('email').not().exists().withMessage('Đăng ký tài khoản không sử dụng email'),
  body('status').not().exists().withMessage('Không được chỉ định trạng thái khi đăng ký'),
  body('channel').not().exists().withMessage('Không được chỉ định kênh OTP khi đăng ký'),
  body('phoneVerified').not().exists().withMessage('Không được tự xác minh số điện thoại'),
];

const login = [
  body().custom((value) => {
    if (!value.identifier && !value.email && !value.phone) {
      throw new Error('Vui lòng nhập số điện thoại');
    }
    return true;
  }),
  body('password').notEmpty().withMessage('Mật khẩu là bắt buộc'),
];

const verifyRegistrationOtp = [
  vietnamesePhone('phone'),
  body('otp').trim().matches(/^\d{6}$/).withMessage('Mã OTP phải gồm 6 chữ số'),
  body('email').not().exists().withMessage('Xác minh đăng ký không sử dụng email'),
];

const requestPasswordReset = [
  vietnamesePhone('identifier', 'Số điện thoại tài khoản không hợp lệ'),
  body('channel').not().exists().withMessage('Kênh OTP được cố định là SMS'),
];

const resetPassword = [
  ...requestPasswordReset,
  body('otp').trim().matches(/^\d{6}$/).withMessage('Mã OTP phải gồm 6 chữ số'),
  body('newPassword').isLength({ min: 6 }).withMessage('Mật khẩu mới phải có ít nhất 6 ký tự'),
];

const shippingAddressDto = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Địa chỉ nhận hàng không hợp lệ');
  }
  if (Object.keys(value).some((field) => !SHIPPING_ADDRESS_FIELDS.includes(field))) {
    throw new Error('Địa chỉ nhận hàng chứa trường không được phép');
  }
  if (SHIPPING_ADDRESS_FIELDS.some((field) => (
    value[field] !== undefined && (typeof value[field] !== 'string' || value[field].length > FIELD_LIMITS[field])
  ))) {
    throw new Error('Địa chỉ nhận hàng có trường không hợp lệ');
  }
  const address = toShippingAddress(value);
  if (!isCompleteShippingAddress(address)) {
    throw new Error('Vui lòng nhập đủ họ tên, số điện thoại, địa chỉ, tỉnh/thành và phường/xã');
  }
  if (address.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email)) {
    throw new Error('Email nhận hàng không hợp lệ');
  }
  return true;
};

const updateProfile = [
  body('fullName').optional().trim().notEmpty().withMessage('Họ và tên không được để trống'),
  body('phone').not().exists().withMessage('Đổi số điện thoại cần một luồng xác minh OTP riêng'),
  body('address').optional().trim(),
  body('avatar').optional().trim(),
  body('shippingAddress').optional().custom(shippingAddressDto),
];

const changePassword = [
  body('currentPassword').notEmpty().withMessage('Mật khẩu hiện tại là bắt buộc'),
  body('newPassword').isLength({ min: 6 }).withMessage('Mật khẩu mới phải có ít nhất 6 ký tự'),
];

const refresh = [body('refreshToken').notEmpty().withMessage('Mã làm mới phiên đăng nhập là bắt buộc')];
const logout = [body('refreshToken').optional().isString()];

module.exports = {
  register,
  verifyRegistrationOtp,
  requestPasswordReset,
  resetPassword,
  login,
  updateProfile,
  changePassword,
  refresh,
  logout,
};

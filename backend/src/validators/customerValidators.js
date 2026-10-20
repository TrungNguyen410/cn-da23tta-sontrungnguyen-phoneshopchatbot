const { body } = require('express-validator');
const { normalizeVietnamesePhone } = require('../utils/phone');

const update = [
  body('fullName').optional().trim().notEmpty().withMessage('Họ và tên không được để trống'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Email không hợp lệ'),
  body('phone').optional().trim()
    .customSanitizer((value) => normalizeVietnamesePhone(value) || value)
    .custom((value) => Boolean(normalizeVietnamesePhone(value)))
    .withMessage('Số điện thoại Việt Nam không hợp lệ'),
  body('address').optional().trim(),
  body('role').optional().isIn(['customer', 'admin']).withMessage('Vai trò người dùng không hợp lệ'),
  body('status').optional().isIn(['active', 'locked', 'inactive']).withMessage('Trạng thái khách hàng không hợp lệ'),
];

module.exports = { update };

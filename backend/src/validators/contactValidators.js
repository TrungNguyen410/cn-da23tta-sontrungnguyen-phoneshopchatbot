const { body } = require('express-validator');

const create = [
  body('fullName').trim().notEmpty().withMessage('Họ và tên là bắt buộc'),
  body('email').isEmail().normalizeEmail().withMessage('Email không hợp lệ'),
  body('phone').trim().isLength({ min: 9, max: 15 }).withMessage('Số điện thoại phải có từ 9 đến 15 ký tự'),
  body('subject').trim().notEmpty().withMessage('Chủ đề là bắt buộc'),
  body('message').trim().isLength({ min: 10 }).withMessage('Nội dung phải có ít nhất 10 ký tự'),
];

const update = [
  body('status').optional().isIn(['new', 'read', 'resolved']).withMessage('Trạng thái liên hệ không hợp lệ'),
  body('adminNote').optional().trim(),
];

module.exports = { create, update };

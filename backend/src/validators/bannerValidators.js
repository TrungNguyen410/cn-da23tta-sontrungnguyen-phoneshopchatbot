const { body } = require('express-validator');

const create = [
  body('title').trim().notEmpty().withMessage('Tiêu đề là bắt buộc'),
  body('description').optional().trim(),
  body('image').trim().notEmpty().withMessage('Ảnh là bắt buộc'),
  body('link').optional().trim(),
  body('position').optional().isInt({ min: 0 }).withMessage('Vị trí phải là số nguyên không âm'),
  body('active').optional().isBoolean().withMessage('Trạng thái kích hoạt phải là kiểu boolean'),
];

const update = [
  body('title').optional().trim().notEmpty().withMessage('Tiêu đề không được để trống'),
  body('description').optional().trim(),
  body('image').optional().trim().notEmpty().withMessage('Ảnh không được để trống'),
  body('link').optional().trim(),
  body('position').optional().isInt({ min: 0 }).withMessage('Vị trí phải là số nguyên không âm'),
  body('active').optional().isBoolean().withMessage('Trạng thái kích hoạt phải là kiểu boolean'),
];

module.exports = { create, update };

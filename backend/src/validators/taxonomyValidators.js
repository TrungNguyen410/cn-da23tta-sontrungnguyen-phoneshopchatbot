const { body } = require('express-validator');

const create = [
  body('name').trim().notEmpty().withMessage('Tên là bắt buộc'),
  body('slug').optional().trim(),
  body('description').optional().trim(),
  body('active').optional().isBoolean().withMessage('Trạng thái kích hoạt phải là kiểu boolean'),
];

const update = [
  body('name').optional().trim().notEmpty().withMessage('Tên không được để trống'),
  body('slug').optional().trim(),
  body('description').optional().trim(),
  body('active').optional().isBoolean().withMessage('Trạng thái kích hoạt phải là kiểu boolean'),
];

module.exports = { create, update };

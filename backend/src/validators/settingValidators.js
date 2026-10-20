const { body } = require('express-validator');

const create = [
  body('key').trim().notEmpty().withMessage('Khóa cài đặt là bắt buộc'),
  body('value').exists().withMessage('Giá trị cài đặt là bắt buộc'),
  body('group').optional().trim(),
  body('label').optional().trim(),
];

const update = [
  body('value').optional().exists().withMessage('Giá trị cài đặt là bắt buộc'),
  body('group').optional().trim(),
  body('label').optional().trim(),
];

module.exports = { create, update };

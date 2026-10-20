const { body } = require('express-validator');

const create = [
  body('code').trim().notEmpty().withMessage('Mã giảm giá là bắt buộc'),
  body('type').isIn(['percent', 'fixed', 'shipping']).withMessage('Loại mã giảm giá không hợp lệ'),
  body('value').isFloat({ min: 0 }).withMessage('Giá trị giảm phải là số không âm'),
  body('minOrder').optional().isFloat({ min: 0 }).withMessage('Giá trị đơn hàng tối thiểu phải là số không âm'),
  body('maxDiscount').optional().isFloat({ min: 0 }).withMessage('Mức giảm tối đa phải là số không âm'),
  body('quantity').optional().isInt({ min: 0 }).withMessage('Số lượng phải là số nguyên không âm'),
  body('startDate').isISO8601().withMessage('Ngày bắt đầu không hợp lệ'),
  body('endDate').isISO8601().withMessage('Ngày kết thúc không hợp lệ'),
  body('active').optional().isBoolean().withMessage('Trạng thái kích hoạt phải là kiểu boolean'),
];

const update = [
  body('code').optional().trim().notEmpty().withMessage('Mã giảm giá không được để trống'),
  body('type').optional().isIn(['percent', 'fixed', 'shipping']).withMessage('Loại mã giảm giá không hợp lệ'),
  body('value').optional().isFloat({ min: 0 }).withMessage('Giá trị giảm phải là số không âm'),
  body('minOrder').optional().isFloat({ min: 0 }).withMessage('Giá trị đơn hàng tối thiểu phải là số không âm'),
  body('maxDiscount').optional().isFloat({ min: 0 }).withMessage('Mức giảm tối đa phải là số không âm'),
  body('quantity').optional().isInt({ min: 0 }).withMessage('Số lượng phải là số nguyên không âm'),
  body('startDate').optional().isISO8601().withMessage('Ngày bắt đầu không hợp lệ'),
  body('endDate').optional().isISO8601().withMessage('Ngày kết thúc không hợp lệ'),
  body('active').optional().isBoolean().withMessage('Trạng thái kích hoạt phải là kiểu boolean'),
];

const check = [
  body('code').trim().notEmpty().withMessage('Mã giảm giá là bắt buộc'),
  body('subtotal').isFloat({ min: 0 }).withMessage('Tạm tính phải là số không âm'),
];

module.exports = { create, update, check };

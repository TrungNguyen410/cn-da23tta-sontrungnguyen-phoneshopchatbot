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

const gift = [
  body().custom((payload) => {
    const allowed = ['type', 'value', 'minOrder', 'maxDiscount', 'endDate', 'note'];
    if (!payload || typeof payload !== 'object' || Object.keys(payload).some((key) => !allowed.includes(key))) {
      throw new Error('Dữ liệu voucher tặng khách chứa trường không được phép');
    }
    return true;
  }),
  body('type').isIn(['percent', 'fixed', 'shipping']).withMessage('Loại mã giảm giá không hợp lệ'),
  body('value').isFloat({ gt: 0 }).withMessage('Giá trị giảm phải lớn hơn 0'),
  body('value').custom((value, { req }) => {
    if (req.body.type === 'percent' && Number(value) > 100) throw new Error('Giảm theo phần trăm tối đa 100%');
    return true;
  }),
  body('minOrder').optional().isFloat({ min: 0 }).withMessage('Giá trị đơn hàng tối thiểu phải là số không âm'),
  body('maxDiscount').optional().isFloat({ min: 0 }).withMessage('Mức giảm tối đa phải là số không âm'),
  body('endDate').isISO8601().withMessage('Ngày hết hạn không hợp lệ'),
  body('note').optional().isString().trim().isLength({ max: 120 }).withMessage('Lời nhắn tối đa 120 ký tự'),
];

module.exports = { create, update, check, gift };

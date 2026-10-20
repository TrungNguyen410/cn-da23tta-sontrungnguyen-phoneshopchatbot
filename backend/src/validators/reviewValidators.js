const { body, param } = require('express-validator');

const create = [
  body().custom((payload) => {
    if (Boolean(payload.productId) === Boolean(payload.accessoryId)) {
      throw new Error('Đánh giá phải thuộc đúng một sản phẩm hoặc phụ kiện');
    }
    return true;
  }),
  body('productId').optional().trim().notEmpty().withMessage('Mã sản phẩm không được để trống'),
  body('accessoryId').optional({ nullable: true }).trim().notEmpty().withMessage('Mã phụ kiện không được để trống'),
  body('userName').optional().trim().notEmpty().withMessage('Tên người đánh giá không được để trống'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Số sao phải là số nguyên từ 1 đến 5'),
  body('comment').trim().isLength({ min: 10 }).withMessage('Nội dung đánh giá phải có ít nhất 10 ký tự'),
  body('images').optional().isArray({ max: 5 }).withMessage('Danh sách ảnh đánh giá chỉ được có tối đa 5 ảnh'),
  body('images.*').optional().isURL({ require_tld: false }).withMessage('URL ảnh đánh giá không hợp lệ'),
];

const update = [
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Số sao phải là số nguyên từ 1 đến 5'),
  body('comment').optional().trim().isLength({ min: 10 }).withMessage('Nội dung đánh giá phải có ít nhất 10 ký tự'),
  body('images').optional().isArray({ max: 5 }).withMessage('Danh sách ảnh đánh giá chỉ được có tối đa 5 ảnh'),
  body('images.*').optional().isURL({ require_tld: false }).withMessage('URL ảnh đánh giá không hợp lệ'),
  body('status').optional().isIn(['pending', 'approved', 'rejected']).withMessage('Trạng thái đánh giá không hợp lệ'),
];

const productId = [param('productId').trim().notEmpty().withMessage('Mã sản phẩm là bắt buộc')];
const accessoryId = [param('accessoryId').trim().notEmpty().withMessage('Mã phụ kiện là bắt buộc')];

module.exports = { create, update, productId, accessoryId };

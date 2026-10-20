const { body, query } = require('express-validator');
const { paginationQuery } = require('./commonValidators');
const brandRepository = require('../repositories/brandRepository');
const categoryRepository = require('../repositories/categoryRepository');

const list = [
  ...paginationQuery,
  query('q').optional().trim(),
  query('search').optional().trim(),
  query('category').optional().trim(),
  query('brand').optional().trim(),
  query('status').optional().isIn(['active', 'inactive']).withMessage('Trạng thái không hợp lệ'),
  query('sort').optional().isIn(['newest', 'price-asc', 'price-desc', 'best-selling', 'rating']).withMessage('Kiểu sắp xếp không hợp lệ'),
];
const activeExists = (repository, label) => async (value) => {
  const item = await repository.findById(value);
  if (!item || !item.active) throw new Error(`${label} không hợp lệ hoặc đã ngừng hoạt động`);
  return true;
};
const brandExists = activeExists(brandRepository, 'Thương hiệu');
const categoryExists = activeExists(categoryRepository, 'Danh mục');
const catalogFields = ({ priceOptional = false } = {}) => [
  priceOptional
    ? body('price').optional().isFloat({ min: 0 }).withMessage('Giá phải là số không âm')
    : body('price').isFloat({ min: 0 }).withMessage('Giá phải là số không âm'),
  body('oldPrice').optional().isFloat({ min: 0 }).withMessage('Giá cũ phải là số không âm'),
  body('discountPercent').optional().isFloat({ min: 0 }).withMessage('Phần trăm giảm giá phải là số không âm'),
  body('image').optional().isString(),
  body('images').optional().isArray({ max: 5 }).withMessage('Danh sách ảnh chỉ được có tối đa 5 ảnh'),
  body('images.*').optional().isString().notEmpty().withMessage('Mỗi ảnh phải là một chuỗi không rỗng'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Tồn kho phải là số nguyên không âm'),
  body('sold').optional().isInt({ min: 0 }).withMessage('Số lượng đã bán phải là số nguyên không âm'),
  body('rating').optional().isFloat({ min: 0, max: 5 }).withMessage('Điểm đánh giá phải từ 0 đến 5'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Trạng thái không hợp lệ'),
];
const create = [
  body('name').trim().notEmpty().withMessage('Tên là bắt buộc'),
  body('brandId').trim().notEmpty().withMessage('Thương hiệu là bắt buộc').bail().custom(brandExists),
  body('categoryId').trim().notEmpty().withMessage('Danh mục là bắt buộc').bail().custom(categoryExists),
  ...catalogFields(),
];
const update = [
  body('name').optional().trim().notEmpty().withMessage('Tên không được để trống'),
  body('brandId').optional().trim().notEmpty().withMessage('Thương hiệu không được để trống').bail().custom(brandExists),
  body('categoryId').optional().trim().notEmpty().withMessage('Danh mục không được để trống').bail().custom(categoryExists),
  ...catalogFields({ priceOptional: true }),
];

module.exports = { list, create, update };

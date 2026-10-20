const { param, query } = require('express-validator');

const idParam = [param('id').notEmpty().withMessage('Mã định danh là bắt buộc')];

const paginationQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Số trang phải là số nguyên dương'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Số bản ghi mỗi trang phải từ 1 đến 100'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Kích thước trang phải từ 1 đến 100'),
];

module.exports = { idParam, paginationQuery };

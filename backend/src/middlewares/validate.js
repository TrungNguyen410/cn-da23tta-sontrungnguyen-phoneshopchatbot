const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

const validate = (req, _res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  return next(new AppError('Dữ liệu gửi lên không hợp lệ', 422, result.array()));
};

module.exports = validate;

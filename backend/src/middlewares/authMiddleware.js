const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const [, token] = header.startsWith('Bearer ') ? header.split(' ') : [];
  if (!token) throw new AppError('Vui lòng đăng nhập để tiếp tục', 401);

  const payload = jwt.verify(token, env.jwtAccessSecret);
  const user = await User.findOne({ _id: payload.sub, isDeleted: false });
  if (!user || user.status !== 'active') throw new AppError('Tài khoản không có quyền truy cập', 401);

  req.user = user.toJSON();
  return next();
});

// Allows public flows (such as guest checkout) to retain the customer identity
// when a valid bearer token is present, without making authentication mandatory.
const optionalProtect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const [, token] = header.startsWith('Bearer ') ? header.split(' ') : [];
  if (!token) return next();

  try {
    const payload = jwt.verify(token, env.jwtAccessSecret);
    const user = await User.findOne({ _id: payload.sub, isDeleted: false });
    if (!user || user.status !== 'active') throw new AppError('Tài khoản không có quyền truy cập', 401);
    req.user = user.toJSON();
  } catch {
    throw new AppError('Phiên đăng nhập không hợp lệ hoặc đã hết hạn', 401);
  }
  return next();
});

const authorize = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError('Bạn không có đủ quyền để thực hiện thao tác này', 403));
  }
  return next();
};

module.exports = { protect, optionalProtect, authorize };

const AppError = require('../utils/AppError');
const { errorResponse } = require('../utils/apiResponse');

const notFound = (req, _res, next) => {
  next(new AppError(`Không tìm thấy đường dẫn: ${req.originalUrl}`, 404));
};

const errorHandler = (error, _req, res, _next) => {
  const isUploadLimit = error.code === 'LIMIT_FILE_SIZE';
  const isUnexpectedUploadField = error.code === 'LIMIT_UNEXPECTED_FILE';
  const isJwtError = ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name);
  const isDatabaseValidation = error.name === 'ValidationError' && !(error instanceof AppError);
  const isInvalidDatabaseId = error.name === 'CastError';
  const isDuplicateValue = error.code === 11000;
  const isInvalidJson = error instanceof SyntaxError && error.status === 400 && 'body' in error;
  const statusCode =
    error.statusCode
    || (isJwtError ? 401
      : isInvalidJson || isInvalidDatabaseId ? 400
        : isDuplicateValue ? 409
          : isDatabaseValidation || isUploadLimit || isUnexpectedUploadField ? 422
            : error.status || 500);
  const hideUnexpectedError = statusCode >= 500 && !(error instanceof AppError);
  const message = hideUnexpectedError
    ? 'Đã xảy ra lỗi máy chủ'
    : isJwtError
      ? 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn'
      : isUploadLimit
        ? 'Ảnh không được vượt quá 5MB'
        : isUnexpectedUploadField
          ? 'Trường tải ảnh không hợp lệ'
          : isInvalidJson
            ? 'Dữ liệu JSON không hợp lệ'
            : isInvalidDatabaseId
              ? 'Mã định danh không hợp lệ'
              : isDuplicateValue
                ? 'Dữ liệu đã tồn tại'
                : isDatabaseValidation
                  ? 'Dữ liệu không hợp lệ'
                  : error.message || 'Đã xảy ra lỗi máy chủ';
  const errors =
    isDatabaseValidation
      ? Object.values(error.errors || {}).map((item) => `Trường ${item.path || 'dữ liệu'} không hợp lệ`)
      : error.errors && typeof error.errors === 'object'
        ? Object.values(error.errors).map((item) => item.message || item)
      : error.errors;

  if (process.env.NODE_ENV !== 'test' && statusCode >= 500) {
    console.error(error);
  }

  errorResponse(res, message, statusCode, errors);
};

module.exports = { notFound, errorHandler };

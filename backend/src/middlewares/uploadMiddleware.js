const multer = require('multer');
const AppError = require('../utils/AppError');

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const hasPrefix = (buffer, bytes) =>
  buffer.length >= bytes.length && bytes.every((byte, index) => buffer[index] === byte);
const detectImageType = (buffer) => {
  if (hasPrefix(buffer, [0xff, 0xd8, 0xff])) return { ext: 'jpg', mime: 'image/jpeg' };
  if (hasPrefix(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { ext: 'png', mime: 'image/png' };
  }
  const header = buffer.subarray(0, 12).toString('ascii');
  if (header.startsWith('GIF87a') || header.startsWith('GIF89a')) {
    return { ext: 'gif', mime: 'image/gif' };
  }
  if (header.startsWith('RIFF') && header.slice(8, 12) === 'WEBP') {
    return { ext: 'webp', mime: 'image/webp' };
  }
  return null;
};

const fileFilter = (_req, file, cb) => {
  if (!allowedImageTypes.has(file.mimetype)) {
    return cb(new AppError('Chỉ chấp nhận ảnh định dạng JPG, PNG, WEBP hoặc GIF', 422));
  }
  return cb(null, true);
};

const validateImageContent = (req, _res, next) => {
  if (!req.file) return next();

  const detectedType = detectImageType(req.file.buffer);
  if (!detectedType || !allowedImageTypes.has(detectedType.mime)) {
    return next(new AppError('Nội dung tệp tải lên không phải là ảnh được hỗ trợ', 422));
  }
  req.file.detectedType = detectedType;
  return next();
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = { upload, validateImageContent };

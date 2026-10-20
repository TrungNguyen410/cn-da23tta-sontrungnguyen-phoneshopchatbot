const crypto = require('crypto');

const pad = (value) => String(value).padStart(2, '0');
const formatVnpayDate = (date) =>
  [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');

const sortParams = (params) =>
  Object.fromEntries(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .sort(([left], [right]) => left.localeCompare(right)),
  );

const serializeParams = (params) => new URLSearchParams(sortParams(params)).toString();

const signParams = (params, secret) =>
  crypto.createHmac('sha512', secret).update(Buffer.from(serializeParams(params), 'utf-8')).digest('hex');

const safeEqual = (left, right) => {
  const leftBuffer = Buffer.from(String(left || '').toLowerCase());
  const rightBuffer = Buffer.from(String(right || '').toLowerCase());
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const createPaymentUrl = ({
  amount,
  config,
  ipAddress,
  orderInfo,
  reference,
  now = new Date(),
}) => {
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
  const params = {
    vnp_Version: config.version,
    vnp_Command: 'pay',
    vnp_TmnCode: config.tmnCode,
    vnp_Amount: Math.round(amount * 100),
    vnp_CurrCode: 'VND',
    vnp_TxnRef: reference,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: 'other',
    vnp_Locale: 'vn',
    vnp_ReturnUrl: config.returnUrl,
    vnp_IpAddr: ipAddress || '127.0.0.1',
    vnp_CreateDate: formatVnpayDate(now),
    vnp_ExpireDate: formatVnpayDate(expiresAt),
  };
  const secureHash = signParams(params, config.hashSecret);
  return `${config.paymentUrl}?${serializeParams({ ...params, vnp_SecureHash: secureHash })}`;
};

const verifyCallback = (query, secret) => {
  const { vnp_SecureHash: receivedHash, vnp_SecureHashType: _hashType, ...params } = query;
  if (!receivedHash || !secret) return false;
  return safeEqual(signParams(params, secret), receivedHash);
};

module.exports = {
  createPaymentUrl,
  formatVnpayDate,
  serializeParams,
  signParams,
  sortParams,
  verifyCallback,
};

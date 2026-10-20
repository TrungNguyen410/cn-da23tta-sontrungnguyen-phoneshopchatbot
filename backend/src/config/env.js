const path = require('path');

require('dotenv').config({ quiet: true });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const port = Number(process.env.PORT || 5000);

const parseHttpUrl = (name, developmentFallback = '') => {
  const value = String(process.env[name] || (isProduction ? '' : developmentFallback)).trim();
  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute HTTP(S) URL`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`${name} must be an absolute HTTP(S) URL`);
  }

  return parsed;
};

const isLoopbackHostname = (hostname) => {
  const normalized = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.+$/u, '');
  return normalized === 'localhost'
    || normalized.endsWith('.localhost')
    || normalized === '::1'
    || /^::ffff:7f[0-9a-f]{2}:/u.test(normalized)
    || /^127\./.test(normalized);
};

const requiredOrigin = (name, developmentFallback = '', { rejectLoopback = false } = {}) => {
  const parsed = parseHttpUrl(name, developmentFallback);
  if (
    parsed.username
    || parsed.password
    || !/^\/+$/u.test(parsed.pathname)
    || parsed.search
    || parsed.hash
  ) {
    throw new Error(`${name} must be an HTTP(S) origin without credentials, path, query, or fragment`);
  }
  if (rejectLoopback && isLoopbackHostname(parsed.hostname)) {
    throw new Error(`${name} must not use a loopback host on Render`);
  }

  return parsed.origin;
};

const requiredUrl = (name, developmentFallback = '') => {
  const parsed = parseHttpUrl(name, developmentFallback);
  if (parsed.username || parsed.password) {
    throw new Error(`${name} must not contain credentials`);
  }

  return parsed.href.replace(/\/+$/, '');
};

const getJwtSecret = (name, developmentFallback) => {
  const value = process.env[name] || (isProduction ? '' : developmentFallback);
  const looksLikePlaceholder = /^(change|replace|dev|docker|example|test)[\s_-]/i.test(value);
  if (isProduction && (!value || value.length < 32 || looksLikePlaceholder)) {
    throw new Error(`${name} phải là giá trị mạnh, duy nhất và có ít nhất 32 ký tự trong môi trường production`);
  }

  return value;
};

const vnpayTmnCode = String(process.env.VNPAY_TMN_CODE || '').trim();
const vnpayHashSecret = String(process.env.VNPAY_HASH_SECRET || '').trim();
const vnpayEnabled = Boolean(vnpayTmnCode && vnpayHashSecret);
const detectedPlatformTarget = process.env.VERCEL
  ? 'vercel'
  : process.env.NETLIFY
    ? 'netlify'
    : process.env.AWS_LAMBDA_FUNCTION_NAME
      ? 'aws-lambda'
      : '';
const deploymentTarget = String(
  detectedPlatformTarget
    || process.env.DEPLOYMENT_TARGET
    || (isProduction ? 'render' : 'local'),
).trim().toLowerCase();
const deploymentTargets = new Set([
  'local',
  'docker',
  'render',
  'vercel',
  'netlify',
  'serverless',
  'aws-lambda',
]);
const serverlessTargets = new Set(['vercel', 'netlify', 'serverless', 'aws-lambda']);

if (isProduction) {
  if (!deploymentTargets.has(deploymentTarget)) {
    throw new Error(
      `DEPLOYMENT_TARGET "${deploymentTarget}" is not supported; use render or docker`,
    );
  }
  if (serverlessTargets.has(deploymentTarget)) {
    throw new Error(
      `Serverless production target "${deploymentTarget}" cannot use the local uploads routes; deploy on Render with a persistent disk`,
    );
  }
  if (deploymentTarget === 'local') {
    throw new Error('DEPLOYMENT_TARGET "local" is not supported in production; use docker for local containers');
  }
}

const configuredUploadDir = String(process.env.UPLOAD_DIR || '').trim();
if (isProduction && deploymentTarget === 'render') {
  if (!configuredUploadDir) {
    throw new Error('UPLOAD_DIR is required for Render production');
  }
  if (!path.posix.isAbsolute(configuredUploadDir)) {
    throw new Error('UPLOAD_DIR must be an absolute persistent mount on Render');
  }
  if (configuredUploadDir !== '/app/uploads') {
    throw new Error('UPLOAD_DIR must use the approved Render persistent mount /app/uploads');
  }
}

const rejectRenderLoopback = isProduction && deploymentTarget === 'render';
const trustProxy = deploymentTarget === 'render' ? 1 : false;

const env = {
  nodeEnv,
  port,
  deploymentTarget,
  trustProxy,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/techphone_store',
  jwtAccessSecret: getJwtSecret('JWT_ACCESS_SECRET', 'dev-access-secret'),
  jwtRefreshSecret: getJwtSecret('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  frontendUrl: requiredOrigin(
    'FRONTEND_URL',
    'http://localhost:5173',
    { rejectLoopback: rejectRenderLoopback },
  ),
  publicSiteUrl: requiredOrigin(
    'PUBLIC_SITE_URL',
    process.env.FRONTEND_URL || 'http://localhost:5173',
    { rejectLoopback: rejectRenderLoopback },
  ),
  apiPublicUrl: requiredOrigin(
    'API_PUBLIC_URL',
    `http://localhost:${port}`,
    { rejectLoopback: rejectRenderLoopback },
  ),
  uploadDir: configuredUploadDir || 'uploads',
  bank: {
    name: process.env.BANK_NAME || '',
    bin: process.env.BANK_BIN || '',
    accountNumber: process.env.BANK_ACCOUNT_NUMBER || '',
    accountName: process.env.BANK_ACCOUNT_NAME || '',
  },
  momo: {
    phone: process.env.MOMO_PHONE || '',
    accountName: process.env.MOMO_ACCOUNT_NAME || '',
  },
  sms: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    from: process.env.TWILIO_FROM || '',
  },
  vnpay: {
    tmnCode: vnpayTmnCode,
    hashSecret: vnpayHashSecret,
    paymentUrl: process.env.VNPAY_PAYMENT_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    returnUrl: vnpayEnabled
      ? requiredUrl(
        'VNPAY_RETURN_URL',
        `http://localhost:${port}/api/payments/vnpay/return`,
      )
      : String(
        process.env.VNPAY_RETURN_URL
          || (isProduction ? '' : `http://localhost:${port}/api/payments/vnpay/return`),
      ).trim().replace(/\/+$/, ''),
    version: process.env.VNPAY_VERSION || '2.1.0',
  },
};

module.exports = env;

const { consumeRateLimit } = require('../repositories/rateLimitRepository');

const rateLimit = ({ windowMs = 15 * 60 * 1000, max = 5, namespace = 'ip', keyGenerator } = {}) => async (req, res, next) => {
  const identity = keyGenerator ? keyGenerator(req) : req.ip;
  const key = `${namespace}:${identity}:${req.baseUrl}${req.path}`;

  try {
    const bucket = await consumeRateLimit({ key, windowMs, max });
    if (bucket.allowed) return next();

    res.set('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt.getTime() - Date.now()) / 1000))));
    return res.status(429).json({
      success: false,
      message: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = rateLimit;

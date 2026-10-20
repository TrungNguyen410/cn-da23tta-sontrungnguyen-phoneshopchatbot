const crypto = require('crypto');
const RateLimitBucket = require('../models/RateLimitBucket');

const hashKey = (key) => crypto
  .createHash('sha256')
  .update(String(key))
  .digest('hex');

const bucketUpdate = (now, resetAt) => [{
  $set: {
    count: {
      $cond: [
        { $lte: [{ $ifNull: ['$resetAt', new Date(0)] }, now] },
        1,
        { $add: [{ $ifNull: ['$count', 0] }, 1] },
      ],
    },
    resetAt: {
      $cond: [
        { $lte: [{ $ifNull: ['$resetAt', new Date(0)] }, now] },
        resetAt,
        '$resetAt',
      ],
    },
  },
}];

async function consumeRateLimit({ key, windowMs, max, now = new Date() }) {
  const id = hashKey(key);
  const resetAt = new Date(now.getTime() + windowMs);
  const filter = {
    _id: id,
    $or: [{ resetAt: { $lte: now } }, { count: { $lt: max } }],
  };
  const update = bucketUpdate(now, resetAt);
  let bucket;

  try {
    bucket = await RateLimitBucket.findOneAndUpdate(filter, update, {
      upsert: true,
      returnDocument: 'after',
      updatePipeline: true,
    });
  } catch (error) {
    if (error?.code !== 11000) throw error;

    bucket = await RateLimitBucket.findOneAndUpdate(filter, update, {
      returnDocument: 'after',
      updatePipeline: true,
    });
    if (!bucket) {
      const existing = await RateLimitBucket.findById(id);
      if (existing) return { allowed: false, resetAt: existing.resetAt };
    }
  }

  if (!bucket) return consumeRateLimit({ key, windowMs, max, now });
  return { allowed: true, resetAt: bucket.resetAt };
}

module.exports = { consumeRateLimit };

const mongoose = require('mongoose');

const rateLimitBucketSchema = new mongoose.Schema({
  _id: String,
  count: { type: Number, required: true },
  resetAt: { type: Date, required: true, index: { expires: 0 } },
}, { versionKey: false });

module.exports = mongoose.model('RateLimitBucket', rateLimitBucketSchema);

const mongoose = require('mongoose');
const { baseSchemaOptions, stringId } = require('./baseSchemaOptions');

const refreshTokenSchema = new mongoose.Schema(
  {
    _id: stringId,
    userId: { type: String, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    revokedAt: { type: Date, default: null },
  },
  baseSchemaOptions,
);

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);

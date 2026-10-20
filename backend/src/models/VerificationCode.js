const mongoose = require('mongoose');
const { baseSchemaOptions, stringId } = require('./baseSchemaOptions');

const verificationCodeSchema = new mongoose.Schema(
  {
    _id: stringId,
    target: { type: String, required: true, trim: true, index: true },
    channel: { type: String, enum: ['email', 'sms'], required: true },
    purpose: { type: String, enum: ['register', 'password-reset'], required: true, index: true },
    codeHash: { type: String, required: true, select: false },
    payload: { type: mongoose.Schema.Types.Mixed, default: null },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    consumedAt: { type: Date, default: null },
  },
  baseSchemaOptions,
);

verificationCodeSchema.index({ target: 1, purpose: 1, consumedAt: 1 });

module.exports = mongoose.model('VerificationCode', verificationCodeSchema);

const mongoose = require('mongoose');
const { baseSchemaOptions, stringId } = require('./baseSchemaOptions');
const softDeletePlugin = require('./plugins/softDeletePlugin');

const paymentTransactionSchema = new mongoose.Schema(
  {
    _id: stringId,
    orderId: { type: String, ref: 'Order', required: true, index: true },
    provider: { type: String, enum: ['vnpay'], required: true, index: true },
    method: { type: String, enum: ['card'], required: true },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'expired', 'refunded'],
      default: 'pending',
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'VND' },
    reference: { type: String, required: true, unique: true, index: true },
    providerTransactionId: { type: String, default: '' },
    idempotencyKey: { type: String, default: undefined, index: true },
    activeIdempotencyKey: { type: String, default: undefined, unique: true, sparse: true },
    bankCode: { type: String, default: '' },
    responseCode: { type: String, default: '' },
    rawResponse: { type: mongoose.Schema.Types.Mixed, default: {} },
    paidAt: { type: Date, default: null },
  },
  baseSchemaOptions,
);

paymentTransactionSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema);

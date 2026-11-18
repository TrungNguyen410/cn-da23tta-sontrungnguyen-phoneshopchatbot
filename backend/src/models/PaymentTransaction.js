const mongoose = require('mongoose');
const { baseSchemaOptions, stringId } = require('./baseSchemaOptions');
const softDeletePlugin = require('./plugins/softDeletePlugin');

const paymentTransactionSchema = new mongoose.Schema(
  {
    _id: stringId,
    orderId: { type: String, ref: 'Order', required: true, index: true },
    provider: { type: String, enum: ['sepay'], required: true, index: true },
    method: { type: String, enum: ['bank'], required: true },
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
    bankCode: { type: String, default: '' },
    responseCode: { type: String, default: '' },
    rawResponse: { type: mongoose.Schema.Types.Mixed, default: {} },
    paidAt: { type: Date, default: null },
  },
  baseSchemaOptions,
);

paymentTransactionSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema);

const mongoose = require('mongoose');
const softDeletePlugin = require('./plugins/softDeletePlugin');
const { baseSchemaOptions, stringId } = require('./baseSchemaOptions');

const voucherSchema = new mongoose.Schema(
  {
    _id: stringId,
    code: { type: String, required: true, uppercase: true, trim: true },
    type: { type: String, enum: ['percent', 'fixed', 'shipping'], required: true },
    value: { type: Number, required: true, min: 0 },
    minOrder: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, default: 0, min: 0 },
    quantity: { type: Number, default: 0, min: 0 },
    used: { type: Number, default: 0, min: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    active: { type: Boolean, default: true, index: true },
  },
  baseSchemaOptions,
);

voucherSchema.plugin(softDeletePlugin);
voucherSchema.index(
  { code: 1 },
  { name: 'voucher_code_active_unique', unique: true, partialFilterExpression: { isDeleted: false } },
);

module.exports = mongoose.model('Voucher', voucherSchema);

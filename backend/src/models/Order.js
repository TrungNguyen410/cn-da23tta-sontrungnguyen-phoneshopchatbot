const mongoose = require('mongoose');
const softDeletePlugin = require('./plugins/softDeletePlugin');
const { baseSchemaOptions, stringId } = require('./baseSchemaOptions');

const orderItemSnapshotSchema = new mongoose.Schema(
  {
    id: { type: String },
    productId: { type: String, default: null },
    accessoryId: { type: String, default: null },
    name: { type: String, required: true },
    image: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    type: { type: String, enum: ['product', 'accessory'], default: 'product' },
  },
  { _id: false },
);

const customerSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    province: { type: String, default: '' },
    district: { type: String, default: '' },
    ward: { type: String, default: '' },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    _id: stringId,
    orderNumber: { type: String, required: true, unique: true, index: true },
    idempotencyKey: { type: String, unique: true, sparse: true, index: true },
    requestFingerprint: { type: String, default: '' },
    userId: { type: String, ref: 'User', default: null, index: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'shipping', 'delivered', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    items: { type: [orderItemSnapshotSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ['cod', 'bank', 'momo', 'card'], default: 'cod' },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refund_required', 'refunded'],
      default: 'pending',
    },
    paymentReference: { type: String, default: '' },
    paymentAudit: {
      confirmedBy: { type: String, ref: 'User', default: null },
      confirmedAt: { type: Date, default: null },
      note: { type: String, default: '' },
    },
    shippingProvider: { type: String, default: 'TechPhone Express' },
    trackingNumber: { type: String, default: '' },
    estimatedDelivery: { type: Date, default: null },
    customer: { type: customerSchema, required: true },
    note: { type: String, default: '' },
    voucherCode: { type: String, default: null },
    voucherUsageReleased: { type: Boolean, default: false },
  },
  baseSchemaOptions,
);

orderSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('Order', orderSchema);

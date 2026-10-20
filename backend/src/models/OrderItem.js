const mongoose = require('mongoose');
const softDeletePlugin = require('./plugins/softDeletePlugin');
const { baseSchemaOptions, stringId } = require('./baseSchemaOptions');

const orderItemSchema = new mongoose.Schema(
  {
    _id: stringId,
    orderId: { type: String, ref: 'Order', required: true, index: true },
    productId: { type: String, ref: 'Product', default: null },
    accessoryId: { type: String, ref: 'Accessory', default: null },
    name: { type: String, required: true },
    image: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    type: { type: String, enum: ['product', 'accessory'], default: 'product' },
    total: { type: Number, required: true, min: 0 },
  },
  baseSchemaOptions,
);

orderItemSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('OrderItem', orderItemSchema);

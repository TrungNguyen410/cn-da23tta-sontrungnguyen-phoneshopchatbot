const mongoose = require('mongoose');
const softDeletePlugin = require('./plugins/softDeletePlugin');
const { baseSchemaOptions, stringId } = require('./baseSchemaOptions');

const reviewSchema = new mongoose.Schema(
  {
    _id: stringId,
    userId: { type: String, ref: 'User', default: null, index: true },
    userName: { type: String, required: true, trim: true },
    productId: { type: String, default: 'general', index: true },
    accessoryId: { type: String, default: null },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true },
    images: [{ type: String }],
    verifiedPurchase: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  },
  baseSchemaOptions,
);

reviewSchema.plugin(softDeletePlugin);
reviewSchema.index(
  { userId: 1, productId: 1, accessoryId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      userId: { $type: 'string' },
      isDeleted: false,
    },
  },
);

module.exports = mongoose.model('Review', reviewSchema);

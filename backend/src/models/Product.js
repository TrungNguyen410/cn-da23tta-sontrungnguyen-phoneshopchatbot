const mongoose = require('mongoose');
const softDeletePlugin = require('./plugins/softDeletePlugin');
const { baseSchemaOptions, stringId } = require('./baseSchemaOptions');

const productSchema = new mongoose.Schema(
  {
    _id: stringId,
    name: { type: String, required: true, trim: true, index: true },
    brandId: { type: String, ref: 'Brand', required: true, index: true },
    categoryId: { type: String, ref: 'Category', required: true, index: true },
    price: { type: Number, required: true, min: 0 },
    oldPrice: { type: Number, default: 0, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0 },
    image: { type: String, default: '' },
    images: [{ type: String }],
    ram: { type: String, default: '' },
    storage: { type: String, default: '' },
    screen: { type: String, default: '' },
    battery: { type: String, default: '' },
    camera: { type: String, default: '' },
    chip: { type: String, default: '' },
    description: { type: String, default: '' },
    specifications: { type: mongoose.Schema.Types.Mixed, default: {} },
    stock: { type: Number, default: 0, min: 0 },
    sold: { type: Number, default: 0, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  },
  baseSchemaOptions,
);

productSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('Product', productSchema);

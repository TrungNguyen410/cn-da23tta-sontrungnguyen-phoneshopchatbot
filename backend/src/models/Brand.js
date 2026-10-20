const mongoose = require('mongoose');
const softDeletePlugin = require('./plugins/softDeletePlugin');
const { baseSchemaOptions, stringId } = require('./baseSchemaOptions');

const brandSchema = new mongoose.Schema(
  {
    _id: stringId,
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    logo: { type: String, default: '' },
    description: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  baseSchemaOptions,
);

brandSchema.plugin(softDeletePlugin);
brandSchema.index(
  { name: 1 },
  { name: 'brand_name_active_unique', unique: true, partialFilterExpression: { isDeleted: false } },
);
brandSchema.index(
  { slug: 1 },
  { name: 'brand_slug_active_unique', unique: true, partialFilterExpression: { isDeleted: false } },
);

module.exports = mongoose.model('Brand', brandSchema);

const mongoose = require('mongoose');
const softDeletePlugin = require('./plugins/softDeletePlugin');
const { baseSchemaOptions, stringId } = require('./baseSchemaOptions');

const categorySchema = new mongoose.Schema(
  {
    _id: stringId,
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  baseSchemaOptions,
);

categorySchema.plugin(softDeletePlugin);
categorySchema.index(
  { name: 1 },
  { name: 'category_name_active_unique', unique: true, partialFilterExpression: { isDeleted: false } },
);
categorySchema.index(
  { slug: 1 },
  { name: 'category_slug_active_unique', unique: true, partialFilterExpression: { isDeleted: false } },
);

module.exports = mongoose.model('Category', categorySchema);

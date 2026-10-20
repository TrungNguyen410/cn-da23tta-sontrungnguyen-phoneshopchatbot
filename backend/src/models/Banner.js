const mongoose = require('mongoose');
const softDeletePlugin = require('./plugins/softDeletePlugin');
const { baseSchemaOptions, stringId } = require('./baseSchemaOptions');

const bannerSchema = new mongoose.Schema(
  {
    _id: stringId,
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    image: { type: String, required: true },
    link: { type: String, default: '/' },
    position: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
  },
  baseSchemaOptions,
);

bannerSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('Banner', bannerSchema);

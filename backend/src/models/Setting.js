const mongoose = require('mongoose');
const softDeletePlugin = require('./plugins/softDeletePlugin');
const { baseSchemaOptions, stringId } = require('./baseSchemaOptions');

const settingSchema = new mongoose.Schema(
  {
    _id: stringId,
    key: { type: String, required: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    group: { type: String, default: 'general', index: true },
    label: { type: String, default: '' },
  },
  baseSchemaOptions,
);

settingSchema.plugin(softDeletePlugin);
settingSchema.index(
  { key: 1 },
  { name: 'setting_key_active_unique', unique: true, partialFilterExpression: { isDeleted: false } },
);

module.exports = mongoose.model('Setting', settingSchema);

const mongoose = require('mongoose');
const softDeletePlugin = require('./plugins/softDeletePlugin');
const { baseSchemaOptions, stringId } = require('./baseSchemaOptions');

const contactSchema = new mongoose.Schema(
  {
    _id: stringId,
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: ['new', 'read', 'resolved'], default: 'new', index: true },
    adminNote: { type: String, default: '' },
  },
  baseSchemaOptions,
);

contactSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('Contact', contactSchema);

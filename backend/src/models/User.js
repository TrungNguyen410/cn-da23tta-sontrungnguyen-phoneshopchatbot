const mongoose = require('mongoose');
const softDeletePlugin = require('./plugins/softDeletePlugin');
const { baseSchemaOptions, stringId } = require('./baseSchemaOptions');

const userSchema = new mongoose.Schema(
  {
    _id: stringId,
    fullName: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer', index: true },
    status: { type: String, enum: ['active', 'locked', 'inactive'], default: 'active', index: true },
    address: { type: String, default: '' },
    avatar: { type: String, default: '' },
    wishlist: { type: [String], default: [] },
    emailVerified: { type: Boolean, default: true, index: true },
    emailVerifiedAt: { type: Date, default: null },
    phoneVerified: { type: Boolean, default: true, index: true },
    phoneVerifiedAt: { type: Date, default: null },
  },
  baseSchemaOptions,
);

userSchema.plugin(softDeletePlugin);
userSchema.index(
  { phone: 1 },
  { name: 'user_phone_active_unique', unique: true, partialFilterExpression: { isDeleted: false } },
);
userSchema.index(
  { email: 1 },
  {
    name: 'user_email_active_unique',
    unique: true,
    partialFilterExpression: { email: { $type: 'string' }, isDeleted: false },
  },
);

module.exports = mongoose.model('User', userSchema);

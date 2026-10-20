const mongoose = require('mongoose');
const softDeletePlugin = require('./plugins/softDeletePlugin');
const { baseSchemaOptions, stringId } = require('./baseSchemaOptions');

const chatSessionSchema = new mongoose.Schema(
  {
    _id: stringId,
    userId: { type: String, ref: 'User', default: null, index: true },
    visitorId: { type: String, default: '', index: true },
    title: { type: String, default: 'Cuộc trò chuyện mới', trim: true },
    messageCount: { type: Number, default: 0, min: 0 },
    lastMessageAt: { type: Date, default: Date.now, index: true },
  },
  baseSchemaOptions,
);

chatSessionSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('ChatSession', chatSessionSchema);

const mongoose = require('mongoose');
const softDeletePlugin = require('./plugins/softDeletePlugin');
const { baseSchemaOptions, stringId } = require('./baseSchemaOptions');

const productCardSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ['product', 'accessory'], default: 'product' },
    name: { type: String, required: true },
    price: { type: Number, default: 0 },
    oldPrice: { type: Number, default: 0 },
    image: { type: String, default: '' },
    url: { type: String, default: '' },
    stock: { type: Number, default: 0 },
  },
  { _id: false },
);

const toolCallSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    args: { type: mongoose.Schema.Types.Mixed, default: {} },
    ok: { type: Boolean, default: true },
  },
  { _id: false },
);

const chatMessageSchema = new mongoose.Schema(
  {
    _id: stringId,
    sessionId: { type: String, ref: 'ChatSession', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    products: { type: [productCardSchema], default: [] },
    toolCalls: { type: [toolCallSchema], default: [] },
    source: { type: String, enum: ['user', 'gemini', 'offline', 'fallback'], default: 'user' },
    feedback: { type: String, enum: ['up', 'down', null], default: null },
    latencyMs: { type: Number, default: 0, min: 0 },
  },
  baseSchemaOptions,
);

chatMessageSchema.plugin(softDeletePlugin);
chatMessageSchema.index({ sessionId: 1, createdAt: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);

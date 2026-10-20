const mongoose = require('mongoose');
const softDeletePlugin = require('./plugins/softDeletePlugin');
const { baseSchemaOptions, stringId } = require('./baseSchemaOptions');

const knowledgeArticleSchema = new mongoose.Schema(
  {
    _id: stringId,
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['warranty', 'return', 'shipping', 'payment', 'installment', 'store', 'faq'],
      default: 'faq',
      index: true,
    },
    content: { type: String, required: true },
    keywords: { type: [String], default: [] },
    active: { type: Boolean, default: true, index: true },
  },
  baseSchemaOptions,
);

knowledgeArticleSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('KnowledgeArticle', knowledgeArticleSchema);

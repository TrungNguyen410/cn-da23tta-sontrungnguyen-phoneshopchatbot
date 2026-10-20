const BaseCrudService = require('./baseCrudService');
const knowledgeArticleRepository = require('../repositories/knowledgeArticleRepository');

const normalizeKeywords = (keywords) => {
  const list = Array.isArray(keywords) ? keywords : String(keywords || '').split(',');
  return [...new Set(list.map((keyword) => String(keyword).trim()).filter(Boolean))].slice(0, 30);
};

class KnowledgeService extends BaseCrudService {
  async list() {
    return this.repository.findAll({}, { sort: { category: 1, updatedAt: -1 } });
  }

  async create(payload) {
    return super.create({ ...payload, keywords: normalizeKeywords(payload.keywords) });
  }

  async update(id, payload) {
    const next = { ...payload };
    if ('keywords' in next) next.keywords = normalizeKeywords(next.keywords);
    return super.update(id, next);
  }
}

module.exports = new KnowledgeService(knowledgeArticleRepository);

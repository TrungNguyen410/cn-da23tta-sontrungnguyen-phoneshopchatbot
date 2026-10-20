const BaseRepository = require('./baseRepository');
const KnowledgeArticle = require('../models/KnowledgeArticle');

const tokenize = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd')
  .split(/[^a-z0-9]+/)
  .filter((token) => token.length > 1);

class KnowledgeArticleRepository extends BaseRepository {
  constructor() {
    super(KnowledgeArticle);
  }

  async search(query, { limit = 3, category } = {}) {
    const filter = { active: true, ...(category ? { category } : {}) };
    const articles = await this.findAll(filter, { sort: { updatedAt: -1 } });
    const terms = new Set(tokenize(query));
    if (!terms.size) return articles.slice(0, limit);

    return articles
      .map((article) => {
        const keywordTokens = tokenize(article.keywords.join(' '));
        const titleTokens = tokenize(article.title);
        const bodyTokens = tokenize(article.content);
        let score = 0;
        for (const term of terms) {
          if (keywordTokens.includes(term)) score += 3;
          if (titleTokens.includes(term)) score += 2;
          if (bodyTokens.includes(term)) score += 1;
        }
        return { article, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ article }) => article);
  }
}

module.exports = new KnowledgeArticleRepository();
module.exports.tokenize = tokenize;

const AppError = require('../utils/AppError');
const { buildRegex, parsePagination } = require('../utils/query');

const sortMap = {
  newest: { createdAt: -1 },
  'price-asc': { price: 1 },
  'price-desc': { price: -1 },
  'best-selling': { sold: -1 },
  rating: { rating: -1 },
};

class CatalogService {
  constructor(repository, { brandRepository, categoryRepository } = {}) {
    this.repository = repository;
    this.brandRepository = brandRepository;
    this.categoryRepository = categoryRepository;
  }

  async taxonomyId(repository, name) {
    if (!repository || !name) return undefined;
    return (await repository.findAll({ name }))[0]?.id;
  }

  async taxonomyIdsMatching(repository, keyword) {
    if (!repository || !keyword) return [];
    return (await repository.findAll({ name: buildRegex(keyword) })).map((item) => item.id);
  }

  async buildFilter(query = {}) {
    const filter = {};
    const keyword = query.q || query.search || query.keyword;
    if (keyword) {
      const [brandIds, categoryIds] = await Promise.all([
        this.taxonomyIdsMatching(this.brandRepository, keyword),
        this.taxonomyIdsMatching(this.categoryRepository, keyword),
      ]);
      filter.$or = [
        { name: buildRegex(keyword) },
        ...(brandIds.length ? [{ brandId: { $in: brandIds } }] : []),
        ...(categoryIds.length ? [{ categoryId: { $in: categoryIds } }] : []),
      ];
    }
    if (query.brand) filter.brandId = (await this.taxonomyId(this.brandRepository, query.brand)) || '__no-match__';
    if (query.category) filter.categoryId = (await this.taxonomyId(this.categoryRepository, query.category)) || '__no-match__';
    if (query.status) filter.status = query.status;
    return filter;
  }

  async denormalize(items) {
    if (!items) return items;
    const list = Array.isArray(items) ? items : [items];
    const brandIds = [...new Set(list.map((item) => item.brandId).filter(Boolean))];
    const categoryIds = [...new Set(list.map((item) => item.categoryId).filter(Boolean))];
    const [brands, categories] = await Promise.all([
      Promise.all(brandIds.map((id) => this.brandRepository.findById(id))),
      Promise.all(categoryIds.map((id) => this.categoryRepository.findById(id))),
    ]);
    const brandMap = new Map(brands.filter(Boolean).map((item) => [item.id, item.name]));
    const categoryMap = new Map(categories.filter(Boolean).map((item) => [item.id, item.name]));
    const result = list.map((item) => ({ ...item, brand: brandMap.get(item.brandId) || '', category: categoryMap.get(item.categoryId) || '' }));
    return Array.isArray(items) ? result : result[0];
  }

  async list(query = {}) {
    const filter = await this.buildFilter(query);
    const pagination = parsePagination(query);
    const sort = sortMap[query.sort] || sortMap.newest;
    if (!pagination) return this.denormalize(await this.repository.findAll(filter, { sort }));
    const skip = (pagination.page - 1) * pagination.limit;
    const [rawItems, total] = await Promise.all([
      this.repository.findAll(filter, { sort, skip, limit: pagination.limit }),
      this.repository.count(filter),
    ]);
    return { items: await this.denormalize(rawItems), pagination: { ...pagination, total, totalPages: Math.ceil(total / pagination.limit) } };
  }

  async listPublic(query = {}) {
    return this.list({ ...query, status: 'active' });
  }

  async getById(id) {
    const item = await this.repository.findById(id);
    if (!item) throw new AppError('Không tìm thấy dữ liệu yêu cầu', 404);
    return this.denormalize(item);
  }

  async getPublicById(id) {
    const item = await this.repository.findOne({ _id: id, status: 'active' });
    if (!item) throw new AppError('Không tìm thấy dữ liệu yêu cầu', 404);
    return this.denormalize(item);
  }

  normalizeImages(payload) {
    if (!Object.hasOwn(payload, 'images')) return payload;
    const images = [...new Set((payload.images || []).filter(Boolean))].slice(0, 5);
    return { ...payload, images, image: images[0] || payload.image || '' };
  }

  async create(payload) {
    return this.denormalize(await this.repository.create(this.normalizeImages(payload)));
  }

  async update(id, payload) {
    return this.denormalize(await this.repository.update(id, this.normalizeImages(payload)));
  }
  async remove(id) { return this.repository.softDelete(id); }
}

module.exports = CatalogService;

const BaseCrudService = require('./baseCrudService');
const slugify = require('../utils/slugify');
const AppError = require('../utils/AppError');

class TaxonomyService extends BaseCrudService {
  constructor(repository, { productRepository, accessoryRepository } = {}) {
    super(repository);
    this.productRepository = productRepository;
    this.accessoryRepository = accessoryRepository;
  }

  async create(payload) {
    return this.repository.create({
      ...payload,
      slug: payload.slug || slugify(payload.name),
    });
  }

  async update(id, payload) {
    const nextPayload = { ...payload };
    if (payload.name && !payload.slug) nextPayload.slug = slugify(payload.name);
    return this.repository.update(id, nextPayload);
  }

  async remove(id) {
    const references = await Promise.all([
      this.productRepository.count({ $or: [{ brandId: id }, { categoryId: id }] }),
      this.accessoryRepository.count({ $or: [{ brandId: id }, { categoryId: id }] }),
    ]);
    if (references.some((count) => count > 0)) {
      throw new AppError('Không thể xóa taxonomy đang được sản phẩm sử dụng', 409);
    }
    return this.repository.softDelete(id);
  }
}

module.exports = TaxonomyService;

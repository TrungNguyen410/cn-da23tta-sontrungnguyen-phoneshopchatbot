const AppError = require('../utils/AppError');

const toResource = (doc) => (doc && typeof doc.toJSON === 'function' ? doc.toJSON() : doc);

class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async findAll(filter = {}, options = {}) {
    const queryFilter = { ...filter, isDeleted: false };
    const query = this.model.find(queryFilter);

    if (options.sort) query.sort(options.sort);
    else query.sort({ createdAt: -1 });

    if (options.skip) query.skip(options.skip);
    if (options.limit) query.limit(options.limit);

    const docs = await query;
    return docs.map(toResource);
  }

  async count(filter = {}, options = {}) {
    const query = this.model.countDocuments({ ...filter, isDeleted: false });
    if (options.session) query.session(options.session);
    return query;
  }

  async findById(id, options = {}) {
    const query = this.model.findOne({ _id: id, isDeleted: false });
    if (options.select) query.select(options.select);
    if (options.session) query.session(options.session);
    const doc = await query;
    return toResource(doc);
  }

  async create(payload) {
    const doc = await this.model.create(payload);
    return toResource(doc);
  }

  async update(id, payload) {
    const doc = await this.model.findOneAndUpdate(
      { _id: id, isDeleted: false },
      payload,
      { returnDocument: 'after', runValidators: true },
    );
    if (!doc) throw new AppError('Không tìm thấy dữ liệu yêu cầu', 404);
    return toResource(doc);
  }

  async softDelete(id) {
    const doc = await this.model.findOne({ _id: id, isDeleted: false });
    if (!doc) throw new AppError('Không tìm thấy dữ liệu yêu cầu', 404);
    await doc.softDelete();
    return { id, deleted: true };
  }
}

module.exports = BaseRepository;

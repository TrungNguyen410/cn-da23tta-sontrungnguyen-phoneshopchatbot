const BaseRepository = require('./baseRepository');

const toResource = (doc) => (doc && typeof doc.toJSON === 'function' ? doc.toJSON() : doc);

// Shared stock handling for sellable catalog items (products and accessories).
class StockedRepository extends BaseRepository {
  async findOne(filter = {}) {
    const doc = await this.model.findOne({ ...filter, isDeleted: false });
    return toResource(doc);
  }

  // Atomically takes `quantity` out of stock; returns null when the item is unavailable or short.
  async reserveStock(id, quantity, session) {
    const doc = await this.model.findOneAndUpdate(
      { _id: id, isDeleted: false, status: 'active', stock: { $gte: quantity } },
      { $inc: { stock: -quantity, sold: quantity } },
      { returnDocument: 'after', runValidators: true, session },
    );
    return toResource(doc);
  }

  async findTopSelling(limit = 5) {
    return this.findAll({}, { sort: { sold: -1, createdAt: -1 }, limit });
  }

  // Items still on sale whose stock has fallen to the warning threshold or below.
  async findLowStock(threshold, limit) {
    const filter = { status: 'active', stock: { $lte: threshold } };
    const [items, total] = await Promise.all([
      this.findAll(filter, { sort: { stock: 1, name: 1 }, limit }),
      this.count(filter),
    ]);
    return { items, total };
  }

  async releaseStock(id, quantity, session) {
    await this.model.updateOne(
      { _id: id },
      { $inc: { stock: quantity, sold: -quantity } },
      { session },
    );
  }
}

module.exports = StockedRepository;

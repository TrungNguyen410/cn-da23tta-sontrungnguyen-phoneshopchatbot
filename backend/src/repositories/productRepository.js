const BaseRepository = require('./baseRepository');
const Product = require('../models/Product');

class ProductRepository extends BaseRepository {
  async findOne(filter = {}) {
    const product = await this.model.findOne({ ...filter, isDeleted: false });
    return product?.toJSON();
  }

  async findTopSelling(limit = 5) {
    return this.findAll({}, { sort: { sold: -1, createdAt: -1 }, limit });
  }
}

module.exports = new ProductRepository(Product);

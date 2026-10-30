const StockedRepository = require('./stockedRepository');
const Product = require('../models/Product');

class ProductRepository extends StockedRepository {
  async findTopSelling(limit = 5) {
    return this.findAll({}, { sort: { sold: -1, createdAt: -1 }, limit });
  }
}

module.exports = new ProductRepository(Product);

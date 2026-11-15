const StockedRepository = require('./stockedRepository');
const Product = require('../models/Product');

class ProductRepository extends StockedRepository {}

module.exports = new ProductRepository(Product);

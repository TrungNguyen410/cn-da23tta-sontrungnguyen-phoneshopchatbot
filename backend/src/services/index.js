const BaseCrudService = require('./baseCrudService');
const CatalogService = require('./catalogService');
const TaxonomyService = require('./taxonomyService');
const accessoryRepository = require('../repositories/accessoryRepository');
const bannerRepository = require('../repositories/bannerRepository');
const brandRepository = require('../repositories/brandRepository');
const categoryRepository = require('../repositories/categoryRepository');
const contactRepository = require('../repositories/contactRepository');
const productRepository = require('../repositories/productRepository');
const settingRepository = require('../repositories/settingRepository');

module.exports = {
  productService: new CatalogService(productRepository, { brandRepository, categoryRepository }),
  accessoryService: new CatalogService(accessoryRepository, { brandRepository, categoryRepository }),
  categoryService: new TaxonomyService(categoryRepository, { productRepository, accessoryRepository }),
  brandService: new TaxonomyService(brandRepository, { productRepository, accessoryRepository }),
  bannerService: new BaseCrudService(bannerRepository),
  contactService: new BaseCrudService(contactRepository),
  settingService: new BaseCrudService(settingRepository),
};

const Accessory = require('../src/models/Accessory');
const Brand = require('../src/models/Brand');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const { migrate } = require('../src/scripts/migrateCatalogTaxonomy');

describe('catalog taxonomy migration', () => {
  test('maps legacy strings, creates missing taxonomy, and remains idempotent', async () => {
    await Product.collection.insertOne({
      _id: 'legacy-product',
      name: 'Legacy Phone',
      brand: 'Legacy Brand',
      category: 'Legacy Category',
      price: 1000000,
      status: 'active',
      isDeleted: false,
    });
    await Accessory.collection.insertOne({
      _id: 'legacy-accessory',
      name: 'Legacy Case',
      brand: 'legacy brand',
      category: 'Legacy Category',
      price: 100000,
      status: 'active',
      isDeleted: false,
    });

    await migrate(Product);
    await migrate(Accessory);
    await migrate(Product);
    await migrate(Accessory);

    const [product, accessory, brands, categories] = await Promise.all([
      Product.collection.findOne({ _id: 'legacy-product' }),
      Accessory.collection.findOne({ _id: 'legacy-accessory' }),
      Brand.find({}),
      Category.find({}),
    ]);

    expect(product.brand).toBeUndefined();
    expect(product.category).toBeUndefined();
    expect(product.brandId).toBe(accessory.brandId);
    expect(product.categoryId).toBe(accessory.categoryId);
    expect(brands).toHaveLength(1);
    expect(categories).toHaveLength(1);
  });
});

const request = require('supertest');
const Product = require('../src/models/Product');
const { app } = require('./helpers');

describe('product sitemap', () => {
  it('lists active products and excludes inactive products', async () => {
    await Product.create({
      _id: 'seo-active',
      name: 'SEO Active Phone',
      brandId: 'brand-seo',
      categoryId: 'category-seo',
      price: 1000000,
      stock: 1,
      status: 'active',
    });
    await Product.create({
      _id: 'seo-inactive',
      name: 'SEO Inactive Phone',
      brandId: 'brand-seo',
      categoryId: 'category-seo',
      price: 1000000,
      stock: 1,
      status: 'inactive',
    });

    const response = await request(app).get('/api/seo/sitemap.xml').expect(200);
    expect(response.headers['content-type']).toContain('application/xml');
    expect(response.text).toContain('/products/seo-active');
    expect(response.text).not.toContain('/products/seo-inactive');
  });
});

const request = require('supertest');
const Brand = require('../src/models/Brand');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const Accessory = require('../src/models/Accessory');
const { app, createUser, login } = require('./helpers');

const seedTaxonomy = async () => {
  const [apple, samsung, google] = await Brand.insertMany([
    { name: 'Apple', slug: 'apple', active: true },
    { name: 'Samsung', slug: 'samsung', active: true },
    { name: 'Google', slug: 'google', active: true },
  ]);
  const phones = await Category.create({ name: 'Dien thoai', slug: 'dien-thoai', active: true });
  return { apple, samsung, google, phones };
};

const loginAdmin = async () => {
  await createUser({ email: 'admin@test.com', phone: '0900000000', role: 'admin' });
  return login('admin@test.com');
};

describe('Product API', () => {
  it('lists products and supports search filters', async () => {
    const { apple, samsung, phones } = await seedTaxonomy();
    await Product.create({ name: 'iPhone 16 Pro Max', brandId: apple.id, categoryId: phones.id, price: 33990000, status: 'active' });
    await Product.create({ name: 'Galaxy S25 Ultra', brandId: samsung.id, categoryId: phones.id, price: 30990000, status: 'active' });
    const response = await request(app).get('/api/products?q=iphone&brand=Apple');
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toEqual(expect.objectContaining({ brand: 'Apple', category: 'Dien thoai', brandId: apple.id }));

    const brandResponse = await request(app).get('/api/products?q=Apple');
    expect(brandResponse.status).toBe(200);
    expect(brandResponse.body.data.map((item) => item.name)).toEqual(['iPhone 16 Pro Max']);

    const categoryResponse = await request(app).get('/api/products?q=Dien%20thoai');
    expect(categoryResponse.status).toBe(200);
    expect(categoryResponse.body.data).toHaveLength(2);
  });

  it('lets admins create products, validates taxonomy, and blocks customers', async () => {
    const { google, phones } = await seedTaxonomy();
    await createUser({ email: 'admin@test.com', phone: '0900000000', role: 'admin' });
    await createUser({ email: 'customer@test.com', phone: '0911111111', role: 'customer' });
    const adminToken = await login('admin@test.com');
    const customerToken = await login('customer@test.com');
    const payload = {
      name: 'Pixel 9 Pro',
      brandId: google.id,
      categoryId: phones.id,
      price: 23990000,
      stock: 10,
      images: ['https://example.com/front.png', 'https://example.com/back.png'],
    };
    expect((await request(app).post('/api/products').set('Authorization', `Bearer ${customerToken}`).send(payload)).status).toBe(403);
    const created = await request(app).post('/api/products').set('Authorization', `Bearer ${adminToken}`).send(payload);
    expect(created.status).toBe(201);
    expect(created.body.data).toEqual(expect.objectContaining({
      name: 'Pixel 9 Pro',
      brand: 'Google',
      category: 'Dien thoai',
      image: 'https://example.com/front.png',
      images: payload.images,
    }));
    const tooManyImages = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...payload,
        name: 'Pixel with too many images',
        images: Array.from({ length: 6 }, (_, index) => `https://example.com/${index}.png`),
      });
    expect(tooManyImages.status).toBe(422);
    const invalid = await request(app).post('/api/products').set('Authorization', `Bearer ${adminToken}`).send({ ...payload, brandId: 'missing' });
    expect(invalid.status).toBe(422);
  });

  it('allows catalog fields without persisting injected document ownership fields', async () => {
    const { google, phones } = await seedTaxonomy();
    const adminToken = await loginAdmin();

    const response = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        _id: 'forged-product-id',
        name: 'Pixel Audit Edition',
        brandId: google.id,
        categoryId: phones.id,
        price: 19990000,
        ram: '12GB',
        storage: '256GB',
        specifications: { color: 'Black' },
        isDeleted: true,
        deletedAt: '2026-01-01T00:00:00.000Z',
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      name: 'Pixel Audit Edition',
      brandId: google.id,
      categoryId: phones.id,
      ram: '12GB',
      storage: '256GB',
      specifications: { color: 'Black' },
      isDeleted: false,
      deletedAt: null,
    });
    expect(response.body.data.id).not.toBe('forged-product-id');
  });

  it('ignores transaction-owned sold values on product creation', async () => {
    const { google, phones } = await seedTaxonomy();
    const adminToken = await loginAdmin();

    const response = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Product Sold Create Audit',
        brandId: google.id,
        categoryId: phones.id,
        price: 1000000,
        sold: 999,
      });

    expect(response.status).toBe(201);
    expect(response.body.data.sold).toBe(0);
  });

  it('does not overwrite transaction-owned product sold values on update', async () => {
    const { google, phones } = await seedTaxonomy();
    const product = await Product.create({
      name: 'Product Sold Update Audit',
      brandId: google.id,
      categoryId: phones.id,
      price: 1000000,
      sold: 7,
    });
    const adminToken = await loginAdmin();

    const response = await request(app)
      .put(`/api/admin/products/${product.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Product Name', sold: 999 });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ name: 'Updated Product Name', sold: 7 });
  });

  it('ignores transaction-owned sold values on accessory creation', async () => {
    const { google, phones } = await seedTaxonomy();
    const adminToken = await loginAdmin();

    const response = await request(app)
      .post('/api/admin/accessories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Accessory Sold Create Audit',
        brandId: google.id,
        categoryId: phones.id,
        price: 500000,
        sold: 999,
      });

    expect(response.status).toBe(201);
    expect(response.body.data.sold).toBe(0);
  });

  it('does not overwrite transaction-owned accessory sold values on update', async () => {
    const { google, phones } = await seedTaxonomy();
    const accessory = await Accessory.create({
      name: 'Accessory Sold Update Audit',
      brandId: google.id,
      categoryId: phones.id,
      price: 500000,
      sold: 4,
    });
    const adminToken = await loginAdmin();

    const response = await request(app)
      .put(`/api/admin/accessories/${accessory.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Accessory Name', sold: 999 });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ name: 'Updated Accessory Name', sold: 4 });
  });
});

describe('public catalog visibility', () => {
  it('forces active status for the public product list', async () => {
    const { apple, phones } = await seedTaxonomy();
    const visible = await Product.create({ name: 'Visible Phone', brandId: apple.id, categoryId: phones.id, price: 1000000, status: 'active' });
    await Product.create({ name: 'Hidden Phone', brandId: apple.id, categoryId: phones.id, price: 1000000, status: 'inactive' });

    const response = await request(app).get('/api/products?status=inactive');

    expect(response.status).toBe(200);
    expect(response.body.data.map((item) => item.id)).toEqual([visible.id]);
  });

  it('does not disclose inactive product details publicly', async () => {
    const { apple, phones } = await seedTaxonomy();
    const hidden = await Product.create({ name: 'Hidden Phone', brandId: apple.id, categoryId: phones.id, price: 1000000, status: 'inactive' });

    expect((await request(app).get(`/api/products/${hidden.id}`)).status).toBe(404);
  });

  it('forces active status for the public accessory list', async () => {
    const { apple, phones } = await seedTaxonomy();
    const visible = await Accessory.create({ name: 'Visible Charger', brandId: apple.id, categoryId: phones.id, price: 1000000, status: 'active' });
    await Accessory.create({ name: 'Hidden Charger', brandId: apple.id, categoryId: phones.id, price: 1000000, status: 'inactive' });

    const response = await request(app).get('/api/accessories?status=inactive');

    expect(response.status).toBe(200);
    expect(response.body.data.map((item) => item.id)).toEqual([visible.id]);
  });

  it('does not disclose inactive accessory details publicly', async () => {
    const { apple, phones } = await seedTaxonomy();
    const hidden = await Accessory.create({ name: 'Hidden Charger', brandId: apple.id, categoryId: phones.id, price: 1000000, status: 'inactive' });

    expect((await request(app).get(`/api/accessories/${hidden.id}`)).status).toBe(404);
  });

  it('returns 404 for soft-deleted product and accessory public details', async () => {
    const { apple, phones } = await seedTaxonomy();
    const product = await Product.create({ name: 'Archived Phone', brandId: apple.id, categoryId: phones.id, price: 1000000, status: 'active' });
    const accessory = await Accessory.create({ name: 'Archived Charger', brandId: apple.id, categoryId: phones.id, price: 500000, status: 'active' });
    await Promise.all([
      Product.updateOne({ _id: product.id }, { isDeleted: true, deletedAt: new Date() }),
      Accessory.updateOne({ _id: accessory.id }, { isDeleted: true, deletedAt: new Date() }),
    ]);

    const [productResponse, accessoryResponse] = await Promise.all([
      request(app).get(`/api/products/${product.id}`),
      request(app).get(`/api/accessories/${accessory.id}`),
    ]);

    expect(productResponse.status).toBe(404);
    expect(accessoryResponse.status).toBe(404);
  });

  it('retains inactive catalog records in admin lists', async () => {
    const { apple, phones } = await seedTaxonomy();
    const hiddenProduct = await Product.create({ name: 'Hidden Phone', brandId: apple.id, categoryId: phones.id, price: 1000000, status: 'inactive' });
    const hiddenAccessory = await Accessory.create({ name: 'Hidden Charger', brandId: apple.id, categoryId: phones.id, price: 1000000, status: 'inactive' });
    const token = await loginAdmin();

    const [products, accessories] = await Promise.all([
      request(app).get('/api/admin/products?status=inactive').set('Authorization', `Bearer ${token}`),
      request(app).get('/api/admin/accessories?status=inactive').set('Authorization', `Bearer ${token}`),
    ]);

    expect(products.body.data.map((item) => item.id)).toEqual([hiddenProduct.id]);
    expect(accessories.body.data.map((item) => item.id)).toEqual([hiddenAccessory.id]);
  });
});

describe('taxonomy reference integrity', () => {
  it('refuses category deletion when an active product references it', async () => {
    const { apple, phones } = await seedTaxonomy();
    await Product.create({ name: 'Referenced Phone', brandId: apple.id, categoryId: phones.id, price: 1000000 });
    const token = await loginAdmin();

    expect((await request(app).delete(`/api/admin/categories/${phones.id}`).set('Authorization', `Bearer ${token}`)).status).toBe(409);
  });

  it('refuses category deletion when an active accessory references it', async () => {
    const { apple, phones } = await seedTaxonomy();
    await Accessory.create({ name: 'Referenced Charger', brandId: apple.id, categoryId: phones.id, price: 1000000 });
    const token = await loginAdmin();

    expect((await request(app).delete(`/api/admin/categories/${phones.id}`).set('Authorization', `Bearer ${token}`)).status).toBe(409);
  });

  it('refuses brand deletion when an active product references it', async () => {
    const { apple, phones } = await seedTaxonomy();
    await Product.create({ name: 'Referenced Phone', brandId: apple.id, categoryId: phones.id, price: 1000000 });
    const token = await loginAdmin();

    expect((await request(app).delete(`/api/admin/brands/${apple.id}`).set('Authorization', `Bearer ${token}`)).status).toBe(409);
  });

  it('refuses brand deletion when an active accessory references it', async () => {
    const { apple, phones } = await seedTaxonomy();
    await Accessory.create({ name: 'Referenced Charger', brandId: apple.id, categoryId: phones.id, price: 1000000 });
    const token = await loginAdmin();

    expect((await request(app).delete(`/api/admin/brands/${apple.id}`).set('Authorization', `Bearer ${token}`)).status).toBe(409);
  });

  it('allows taxonomy deletion when its only catalog reference is soft deleted', async () => {
    const { apple, phones } = await seedTaxonomy();
    const product = await Product.create({ name: 'Deleted Phone', brandId: apple.id, categoryId: phones.id, price: 1000000 });
    await product.softDelete();
    const token = await loginAdmin();

    expect((await request(app).delete(`/api/admin/categories/${phones.id}`).set('Authorization', `Bearer ${token}`)).status).toBe(200);
  });
});

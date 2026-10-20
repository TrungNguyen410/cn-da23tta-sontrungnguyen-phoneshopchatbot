const request = require('supertest');
const jwt = require('jsonwebtoken');
const Order = require('../src/models/Order');
const User = require('../src/models/User');
const OrderItem = require('../src/models/OrderItem');
const Product = require('../src/models/Product');
const Accessory = require('../src/models/Accessory');
const Brand = require('../src/models/Brand');
const Category = require('../src/models/Category');
const Voucher = require('../src/models/Voucher');
const env = require('../src/config/env');
const orderItemRepository = require('../src/repositories/orderItemRepository');
const orderRepository = require('../src/repositories/orderRepository');
const accessoryRepository = require('../src/repositories/accessoryRepository');
const productRepository = require('../src/repositories/productRepository');
const voucherService = require('../src/services/voucherService');
const { app, createUser, login } = require('./helpers');

describe('Orders and dashboard APIs', () => {
  const orderPayload = (productId, overrides = {}) => ({
    items: [{ productId, quantity: 1 }],
    customer: {
      fullName: 'Checkout Customer',
      email: 'checkout@example.com',
      phone: '0912345678',
      address: '1 Nguyen Hue',
      province: 'Ho Chi Minh',
      district: 'District 1',
      ward: 'Ben Nghe',
    },
    ...overrides,
  });
  const seedTaxonomy = async () => {
    const brand = await Brand.create({ name: 'Apple', slug: 'apple', active: true });
    const category = await Category.create({ name: 'Dien thoai', slug: 'dien-thoai', active: true });
    return { brandId: brand.id, categoryId: category.id };
  };
  const seedVoucher = (overrides = {}) => Voucher.create({
    code: overrides.code || 'LASTONE',
    type: 'fixed',
    value: 100000,
    minOrder: 0,
    quantity: overrides.quantity ?? 1,
    used: overrides.used ?? 0,
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    active: true,
  });
  it('rejects unauthenticated order creation without decrementing stock', async () => {
    const taxonomy = await seedTaxonomy();
    const product = await Product.create({
      _id: 'protected-stock',
      name: 'Protected Stock Phone',
      ...taxonomy,
      price: 1000000,
      stock: 2,
      status: 'active',
    });

    const response = await request(app)
      .post('/api/orders')
      .send(orderPayload(product.id));

    expect(response.status).toBe(401);
    expect((await Product.findById(product.id)).stock).toBe(2);
  });

  it('rejects card orders outside the VNPay checkout endpoint', async () => {
    await createUser({ email: 'direct-card@test.com', phone: '0912121212' });
    const token = await login('direct-card@test.com');
    const taxonomy = await seedTaxonomy();
    const product = await Product.create({
      _id: 'direct-card',
      name: 'Direct Card Phone',
      ...taxonomy,
      price: 1000000,
      stock: 2,
      status: 'active',
    });

    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(orderPayload(product.id, { paymentMethod: 'card' }));

    expect(response.status).toBe(422);
    expect((await Product.findById(product.id)).stock).toBe(2);
  });

  it('rejects unknown direct-order fields before inventory changes', async () => {
    await createUser({ email: 'direct-allowlist@test.com', phone: '0915151515' });
    const token = await login('direct-allowlist@test.com');
    const taxonomy = await seedTaxonomy();
    const product = await Product.create({
      _id: 'direct-allowlist',
      name: 'Allowlisted Direct Phone',
      ...taxonomy,
      price: 1000000,
      stock: 2,
      status: 'active',
    });

    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(orderPayload(product.id, {
        items: [{ productId: product.id, quantity: 1, suppliedPrice: 1 }],
        internalStatus: 'confirmed',
      }));

    expect(response.status).toBe(422);
    expect((await Product.findById(product.id)).stock).toBe(2);
  });

  it('rejects more than 50 line items', async () => {
    await createUser({ email: 'line-limit@test.com', phone: '0913131313' });
    const token = await login('line-limit@test.com');

    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(orderPayload('product-1', {
        items: Array.from({ length: 51 }, () => ({ productId: 'product-1', quantity: 1 })),
      }));

    expect(response.status).toBe(422);
  });

  it('aggregates duplicate line items before checking inventory', async () => {
    await createUser({ email: 'duplicate-items@test.com', phone: '0914141414' });
    const token = await login('duplicate-items@test.com');
    const taxonomy = await seedTaxonomy();
    const product = await Product.create({
      _id: 'aggregate-stock',
      name: 'Aggregate Stock Phone',
      ...taxonomy,
      price: 1000000,
      stock: 1,
      status: 'active',
    });

    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(orderPayload(product.id, {
        items: [
          { productId: product.id, quantity: 1 },
          { productId: product.id, quantity: 1 },
        ],
      }));

    expect(response.status).toBe(400);
    expect((await Product.findById(product.id)).stock).toBe(1);
  });

  it('stores a canonical phone and returns a masked minimal public lookup DTO', async () => {
    await createUser({ email: 'customer@test.com', phone: '0911111111' });
    const token = await login('customer@test.com');
    const taxonomy = await seedTaxonomy();
    const product = await Product.create({
      _id: 'phone-1',
      name: 'iPhone 16 Pro Max',
      ...taxonomy,
      price: 33990000,
      stock: 5,
      status: 'active',
    });

    const created = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ id: product.id, productId: product.id, quantity: 1 }],
        customer: {
          fullName: 'Test Customer',
          email: 'customer@test.com',
          phone: '0911 111 111',
          address: 'Test address',
          province: 'Ho Chi Minh',
          ward: 'Ben Nghe',
        },
      });

    expect(created.status).toBe(201);
    expect(created.body.data.orderNumber).toMatch(/^TP/);
    expect(created.body.data.customer.phone).toBe('0911111111');
    expect(created.body.data.subtotal).toBe(product.price);
    expect(created.body.data.total).toBe(product.price);
    const updatedProduct = await Product.findById(product.id);
    expect(updatedProduct.stock).toBe(4);
    expect(updatedProduct.sold).toBe(1);

    const lookup = await request(app).get('/api/orders/lookup').query({
      orderNumber: created.body.data.orderNumber,
      phone: '+84 911 111 111',
    });
    expect(lookup.status).toBe(200);
    expect(lookup.body.data.id).toBe(created.body.data.id);
    expect(lookup.body.data.customer).toEqual({
      fullName: 'T***',
      phone: '091****111',
    });
    expect(lookup.body.data.customer.address).toBeUndefined();
    expect(lookup.body.data.customer.email).toBeUndefined();
    expect(lookup.body.data.items[0]).toEqual({
      id: product.id,
      name: product.name,
      image: '',
      price: product.price,
      quantity: 1,
      type: 'product',
    });
    expect(Object.keys(lookup.body.data).sort()).toEqual([
      'createdAt',
      'customer',
      'estimatedDelivery',
      'id',
      'items',
      'orderNumber',
      'shippingProvider',
      'status',
      'total',
      'trackingNumber',
    ]);
  });

  it('rate limits repeated public lookup failures at the configured boundary', async () => {
    const lookup = () => request(app).get('/api/orders/lookup').query({
      orderNumber: 'TP2601019999',
      phone: '0912345678',
    });

    for (let index = 0; index < 10; index += 1) {
      await lookup().expect(404);
    }

    const blocked = await lookup();
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('rate limits a lookup IP even when the order number and phone vary', async () => {
    const orderService = require('../src/services/orderService');
    const lookupSpy = jest.spyOn(orderService, 'lookup');

    for (let index = 0; index < 10; index += 1) {
      await request(app).get('/api/orders/lookup').query({
        orderNumber: `TP260101${String(index).padStart(4, '0')}`,
        phone: `09123456${String(index).padStart(2, '0')}`,
      }).expect(404);
    }

    const blocked = await request(app).get('/api/orders/lookup').query({
      orderNumber: 'TP2601019999',
      phone: '0999999999',
    });

    expect(blocked.status).toBe(429);
    expect(lookupSpy).toHaveBeenCalledTimes(10);
  });

  it('ignores spoofed forwarded IP headers for direct requests', async () => {
    expect(app.get('trust proxy')).toBe(false);

    for (let index = 0; index < 10; index += 1) {
      await request(app)
        .get('/api/orders/lookup')
        .set('X-Forwarded-For', `198.51.100.${index + 1}`)
        .query({
          orderNumber: `TP260102${String(index).padStart(4, '0')}`,
          phone: `09234567${String(index).padStart(2, '0')}`,
        })
        .expect(404);
    }

    await request(app)
      .get('/api/orders/lookup')
      .set('X-Forwarded-For', '198.51.100.99')
      .query({ orderNumber: 'TP2601029999', phone: '0988888888' })
      .expect(429);
  });

  it('atomically allows exactly max concurrent bucket consumers', async () => {
    const { consumeRateLimit } = require('../src/repositories/rateLimitRepository');
    const attempts = await Promise.all(
      Array.from({ length: 15 }, () => consumeRateLimit({
        key: 'order-lookup:203.0.113.8:TP2601019999:0912345678',
        windowMs: 60000,
        max: 10,
      })),
    );

    expect(attempts.filter(({ allowed }) => allowed)).toHaveLength(10);
    expect(attempts.filter(({ allowed }) => !allowed)).toHaveLength(5);
  });

  it('safely rejects an already exhausted persistent bucket', async () => {
    const { consumeRateLimit } = require('../src/repositories/rateLimitRepository');
    const options = { key: 'exhausted-bucket', windowMs: 60000, max: 1 };

    await expect(consumeRateLimit(options)).resolves.toMatchObject({ allowed: true });
    await expect(consumeRateLimit(options)).resolves.toMatchObject({ allowed: false });
  });

  it('persists only hashed rate-limit identities', async () => {
    const RateLimitBucket = require('../src/models/RateLimitBucket');
    const { consumeRateLimit } = require('../src/repositories/rateLimitRepository');
    const rawIdentity = 'order-lookup:203.0.113.8:TP2601019999:0912345678';

    await consumeRateLimit({ key: rawIdentity, windowMs: 60000, max: 10 });

    const bucket = await RateLimitBucket.findOne().lean();
    expect(bucket._id).toMatch(/^[a-f0-9]{64}$/);
    expect(bucket._id).not.toContain('0912345678');
    expect(bucket._id).not.toContain('TP2601019999');
    expect(bucket._id).not.toContain('203.0.113.8');
  });

  it('does not trust a reverse-proxy hop outside the Render deployment', () => {
    expect(env.trustProxy).toBe(false);
  });

  it('rejects orders that exceed product stock', async () => {
    await createUser({ email: 'stock@test.com', phone: '0922222222' });
    const token = await login('stock@test.com');
    const taxonomy = await seedTaxonomy();
    const product = await Product.create({
      _id: 'stock-phone-1',
      name: 'Low Stock Phone',
      ...taxonomy,
      price: 1000000,
      stock: 1,
      status: 'active',
    });

    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId: product.id, quantity: 2 }],
        customer: {
          fullName: 'Stock Customer',
          email: 'stock@test.com',
          phone: '0922222222',
          address: 'Test address',
          province: 'Ho Chi Minh',
          ward: 'Ben Nghe',
        },
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('returns the same order and decrements stock once for a repeated idempotency key', async () => {
    await createUser({ email: 'idempotent@test.com', phone: '0944444444' });
    const token = await login('idempotent@test.com');
    const taxonomy = await seedTaxonomy();
    const product = await Product.create({
      _id: 'idempotent-phone',
      name: 'Idempotent Phone',
      ...taxonomy,
      price: 2000000,
      stock: 3,
      status: 'active',
    });
    const payload = {
      items: [{ productId: product.id, quantity: 1 }],
      customer: {
        fullName: 'Idempotent Customer',
        email: 'idempotent@test.com',
        phone: '0944444444',
        address: 'Test address',
          province: 'Ho Chi Minh',
          ward: 'Ben Nghe',
      },
    };

    const first = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'checkout-attempt-1')
      .send(payload);
    const second = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'checkout-attempt-1')
      .send({
        ...payload,
        customer: { ...payload.customer, phone: '+84 944 444 444' },
      });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data.id).toBe(first.body.data.id);
    expect(first.body.data.subtotal).toBe(product.price);
    expect(first.body.data.total).toBe(product.price + 20000);
    const productAfter = await Product.findById(product.id);
    expect(productAfter.stock).toBe(2);
  });

  it('handles concurrent requests with one idempotency key without double-decrementing stock', async () => {
    await createUser({ email: 'race@test.com', phone: '0955555555' });
    const token = await login('race@test.com');
    const taxonomy = await seedTaxonomy();
    const product = await Product.create({
      _id: 'race-phone',
      name: 'Race Phone',
      ...taxonomy,
      price: 3000000,
      stock: 3,
      status: 'active',
    });
    const payload = {
      items: [{ productId: product.id, quantity: 1 }],
      customer: {
        fullName: 'Race Customer',
        email: 'race@test.com',
        phone: '0955555555',
        address: 'Test address',
          province: 'Ho Chi Minh',
          ward: 'Ben Nghe',
      },
    };
    const post = () => request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'checkout-race')
      .send(payload);

    const [first, second] = await Promise.all([post(), post()]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data.id).toBe(first.body.data.id);
    const productAfter = await Product.findById(product.id);
    expect(productAfter.stock).toBe(2);
  });

  it('ensures the real unique order idempotency index before accepting requests', async () => {
    expect(typeof orderRepository.ensureIndexes).toBe('function');

    await orderRepository.ensureIndexes();

    const idempotencyIndex = (await Order.collection.indexes())
      .find((index) => index.key?.idempotencyKey === 1);
    expect(idempotencyIndex).toEqual(
      expect.objectContaining({ unique: true, sparse: true }),
    );
  });

  it('returns only fully durable embedded orders when secondary item persistence fails', async () => {
    await createUser({ email: 'durable@test.com', phone: '0901010101' });
    const token = await login('durable@test.com');
    const taxonomy = await seedTaxonomy();
    const product = await Product.create({
      _id: 'durable-phone',
      name: 'Durable Phone',
      ...taxonomy,
      price: 3500000,
      stock: 3,
      status: 'active',
    });
    const payload = {
      items: [{ productId: product.id, quantity: 1 }],
      customer: {
        fullName: 'Durable Customer',
        email: 'durable@test.com',
        phone: '0901010101',
        address: 'Test address',
          province: 'Ho Chi Minh',
          ward: 'Ben Nghe',
      },
    };
    const secondaryWrite = jest
      .spyOn(orderItemRepository, 'create')
      .mockRejectedValue(new Error('Injected secondary persistence failure'));
    const post = () => request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'durable-checkout')
      .send(payload);

    try {
      const [first, second] = await Promise.all([post(), post()]);

      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      expect(second.body.data.id).toBe(first.body.data.id);
      expect(first.body.data.items).toEqual([
        expect.objectContaining({ productId: product.id, quantity: 1, price: product.price }),
      ]);
      expect(await Order.countDocuments()).toBe(1);
      expect(await OrderItem.countDocuments()).toBe(0);
      expect((await Product.findById(product.id)).stock).toBe(2);
      expect(secondaryWrite).not.toHaveBeenCalled();
    } finally {
      secondaryWrite.mockRestore();
    }
  });

  it('does not expose another user order when they reuse the same raw idempotency key', async () => {
    await createUser({ email: 'first@test.com', phone: '0966666666' });
    await createUser({ email: 'second@test.com', phone: '0977777777' });
    const firstToken = await login('first@test.com');
    const secondToken = await login('second@test.com');
    const taxonomy = await seedTaxonomy();
    const product = await Product.create({
      _id: 'scoped-phone',
      name: 'Scoped Phone',
      ...taxonomy,
      price: 4000000,
      stock: 3,
      status: 'active',
    });
    const payloadFor = (email, phone) => ({
      items: [{ productId: product.id, quantity: 1 }],
      customer: {
        fullName: 'Customer', email, phone, address: 'Test address', province: 'Ho Chi Minh', ward: 'Ben Nghe',
      },
    });

    const first = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${firstToken}`)
      .set('Idempotency-Key', 'same-browser-key')
      .send(payloadFor('first@test.com', '0966666666'));
    const second = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${secondToken}`)
      .set('Idempotency-Key', 'same-browser-key')
      .send(payloadFor('second@test.com', '0977777777'));

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data.id).not.toBe(first.body.data.id);
    expect(second.body.data.userId).not.toBe(first.body.data.userId);
  });

  it('assigns the authenticated customer as order owner', async () => {
    const user = await createUser({ email: 'owned-order@test.com', phone: '0988888888' });
    const token = jwt.sign({ sub: user.id, role: user.role }, env.jwtAccessSecret);
    const taxonomy = await seedTaxonomy();
    const product = await Product.create({
      _id: 'guest-scoped-phone',
      name: 'Guest Scoped Phone',
      ...taxonomy,
      price: 5000000,
      stock: 4,
      status: 'active',
    });
    const payload = {
      items: [{ productId: product.id, quantity: 1 }],
      customer: {
        fullName: 'Customer',
        email: 'owned-order@test.com',
        phone: '0988888888',
        address: 'Test address',
        province: 'Ho Chi Minh',
        ward: 'Ben Nghe',
      },
    };
    const created = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'guest-shared-key')
      .send(payload);

    expect(created.status).toBe(201);
    expect(created.body.data.userId).toBe(user.id);
    const productAfter = await Product.findById(product.id);
    expect(productAfter.stock).toBe(3);
  });

  it('rejects an expired bearer token before refresh and owns the retried order', async () => {
    const user = await createUser({ email: 'refresh-order@test.com', phone: '0902020202' });
    const session = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'refresh-order@test.com', password: '123456' })
      .expect(200);
    const expiredToken = jwt.sign(
      { sub: user.id, role: user.role },
      env.jwtAccessSecret,
      { expiresIn: -1 },
    );
    const taxonomy = await seedTaxonomy();
    const product = await Product.create({
      _id: 'refresh-owned-phone',
      name: 'Refresh Owned Phone',
      ...taxonomy,
      price: 4500000,
      stock: 2,
      status: 'active',
    });
    const payload = {
      items: [{ productId: product.id, quantity: 1 }],
      customer: {
        fullName: 'Refresh Customer',
        email: 'refresh-order@test.com',
        phone: '0902020202',
        address: 'Test address',
          province: 'Ho Chi Minh',
          ward: 'Ben Nghe',
      },
    };

    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${expiredToken}`)
      .set('Idempotency-Key', 'refresh-owned-order')
      .send(payload)
      .expect(401);
    expect(await Order.countDocuments()).toBe(0);
    expect((await Product.findById(product.id)).stock).toBe(2);

    const refreshed = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: session.body.data.refreshToken })
      .expect(200);
    const created = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${refreshed.body.data.token}`)
      .set('Idempotency-Key', 'refresh-owned-order')
      .send(payload)
      .expect(201);

    expect(created.body.data.userId).toBe(user.id);
    expect((await Product.findById(product.id)).stock).toBe(1);
  });

  it('exhausts a limited voucher sequentially from authoritative usage', async () => {
    const user = await createUser({ email: 'voucher-one@test.com', phone: '0903030303' });
    const token = jwt.sign({ sub: user.id, role: user.role }, env.jwtAccessSecret);
    const taxonomy = await seedTaxonomy();
    const product = await Product.create({
      _id: 'sequential-voucher-phone',
      name: 'Sequential Voucher Phone',
      ...taxonomy,
      price: 2000000,
      stock: 3,
      status: 'active',
    });
    await seedVoucher({ code: 'SEQUENTIAL', quantity: 1 });
    const payloadFor = (email, phone) => ({
      items: [{ productId: product.id, quantity: 1 }],
      customer: {
        fullName: 'Voucher Customer', email, phone, address: 'Test address', province: 'Ho Chi Minh', ward: 'Ben Nghe',
      },
      voucherCode: 'SEQUENTIAL',
    });

    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'voucher-sequential-1')
      .send(payloadFor('voucher-one@test.com', '0903030303'))
      .expect(201);
    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'voucher-sequential-2')
      .send(payloadFor('voucher-two@test.com', '0904040404'))
      .expect(400);

    expect((await Voucher.findOne({ code: 'SEQUENTIAL' })).used).toBe(1);
    expect((await Product.findById(product.id)).stock).toBe(2);
  });

  it('allows only one concurrent last-voucher redemption', async () => {
    const firstUser = await createUser({ email: 'concurrent-one@test.com', phone: '0905050505' });
    const secondUser = await createUser({ email: 'concurrent-two@test.com', phone: '0906060606' });
    const firstToken = jwt.sign({ sub: firstUser.id, role: firstUser.role }, env.jwtAccessSecret);
    const secondToken = jwt.sign({ sub: secondUser.id, role: secondUser.role }, env.jwtAccessSecret);
    const taxonomy = await seedTaxonomy();
    const product = await Product.create({
      _id: 'concurrent-voucher-phone',
      name: 'Concurrent Voucher Phone',
      ...taxonomy,
      price: 2500000,
      stock: 3,
      status: 'active',
    });
    await seedVoucher({ code: 'CONCURRENT', quantity: 1 });
    const post = (email, phone, key, token) => request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .send({
        items: [{ productId: product.id, quantity: 1 }],
        customer: {
          fullName: 'Voucher Customer', email, phone, address: 'Test address', province: 'Ho Chi Minh', ward: 'Ben Nghe',
        },
        voucherCode: 'CONCURRENT',
      });

    const responses = await Promise.all([
      post('concurrent-one@test.com', '0905050505', 'voucher-concurrent-1', firstToken),
      post('concurrent-two@test.com', '0906060606', 'voucher-concurrent-2', secondToken),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([201, 400]);
    expect((await Voucher.findOne({ code: 'CONCURRENT' })).used).toBe(1);
    expect(await Order.countDocuments()).toBe(1);
    expect((await Product.findById(product.id)).stock).toBe(2);
  });

  it('converges same-key concurrent requests that consume the final voucher redemption', async () => {
    const user = await createUser({ email: 'same-voucher@test.com', phone: '0906161616' });
    const token = jwt.sign({ sub: user.id, role: user.role }, env.jwtAccessSecret);
    const taxonomy = await seedTaxonomy();
    const product = await Product.create({
      _id: 'same-key-final-voucher-phone',
      name: 'Same Key Final Voucher Phone',
      ...taxonomy,
      price: 2800000,
      stock: 3,
      status: 'active',
    });
    await seedVoucher({ code: 'SAMEKEYLAST', quantity: 1 });
    const payload = {
      items: [{ productId: product.id, quantity: 1 }],
      customer: {
        fullName: 'Same Voucher Guest',
        email: 'same-voucher@test.com',
        phone: '0906161616',
        address: 'Test address',
          province: 'Ho Chi Minh',
          ward: 'Ben Nghe',
      },
      voucherCode: 'SAMEKEYLAST',
    };
    const post = () => request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'same-key-final-voucher')
      .send(payload);

    const [first, second] = await Promise.all([post(), post()]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data.id).toBe(first.body.data.id);
    expect((await Voucher.findOne({ code: 'SAMEKEYLAST' })).used).toBe(1);
    expect(await Order.countDocuments()).toBe(1);
    expect((await Product.findById(product.id)).stock).toBe(2);
  });

  it('compensates the duplicate loser and releases voucher usage once on cancellation', async () => {
    await createUser({ email: 'voucher-cancel@test.com', phone: '0907070707' });
    const token = await login('voucher-cancel@test.com');
    const taxonomy = await seedTaxonomy();
    const product = await Product.create({
      _id: 'voucher-cancel-phone',
      name: 'Voucher Cancel Phone',
      ...taxonomy,
      price: 3000000,
      stock: 3,
      status: 'active',
    });
    await seedVoucher({ code: 'CANCELONCE', quantity: 2 });
    const payload = {
      items: [{ productId: product.id, quantity: 1 }],
      customer: {
        fullName: 'Voucher Customer',
        email: 'voucher-cancel@test.com',
        phone: '0907070707',
        address: 'Test address',
          province: 'Ho Chi Minh',
          ward: 'Ben Nghe',
      },
      voucherCode: 'CANCELONCE',
    };
    const post = () => request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'voucher-duplicate')
      .send(payload);

    const [first, second] = await Promise.all([post(), post()]);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.data.id).toBe(second.body.data.id);
    expect((await Voucher.findOne({ code: 'CANCELONCE' })).used).toBe(1);

    await request(app)
      .put(`/api/orders/${first.body.data.id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await request(app)
      .put(`/api/orders/${first.body.data.id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect((await Voucher.findOne({ code: 'CANCELONCE' })).used).toBe(0);
    expect((await Product.findById(product.id)).stock).toBe(3);
  });

  it('rolls back a failed inventory restore so cancellation can be retried exactly once', async () => {
    await createUser({ email: 'restore-retry@test.com', phone: '0907171717' });
    const token = await login('restore-retry@test.com');
    const taxonomy = await seedTaxonomy();
    const product = await Product.create({
      _id: 'restore-retry-phone',
      name: 'Restore Retry Phone',
      ...taxonomy,
      price: 3100000,
      stock: 3,
      status: 'active',
    });
    const created = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'restore-retry-order')
      .send({
        items: [{ productId: product.id, quantity: 1 }],
        customer: {
          fullName: 'Restore Retry',
          email: 'restore-retry@test.com',
          phone: '0907171717',
          address: 'Test address',
          province: 'Ho Chi Minh',
          ward: 'Ben Nghe',
        },
      })
      .expect(201);
    const restore = Product.updateOne;
    const restoreSpy = jest
      .spyOn(Product, 'updateOne')
      .mockRejectedValueOnce(new Error('Injected inventory restore failure'))
      .mockImplementation(restore);

    try {
      await request(app)
        .put(`/api/orders/${created.body.data.id}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .expect(500);
    } finally {
      restoreSpy.mockRestore();
    }

    expect((await Order.findById(created.body.data.id)).status).toBe('pending');
    expect((await Product.findById(product.id)).stock).toBe(2);

    await request(app)
      .put(`/api/orders/${created.body.data.id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await request(app)
      .put(`/api/orders/${created.body.data.id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect((await Order.findById(created.body.data.id)).status).toBe('cancelled');
    expect((await Product.findById(product.id)).stock).toBe(3);
  });

  it('rolls back a failed voucher release so cancellation can be retried exactly once', async () => {
    await createUser({ email: 'voucher-retry@test.com', phone: '0907272727' });
    const token = await login('voucher-retry@test.com');
    const taxonomy = await seedTaxonomy();
    const product = await Product.create({
      _id: 'voucher-retry-phone',
      name: 'Voucher Retry Phone',
      ...taxonomy,
      price: 3200000,
      stock: 3,
      status: 'active',
    });
    await seedVoucher({ code: 'RELEASEFAIL', quantity: 1 });
    const created = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'voucher-release-retry')
      .send({
        items: [{ productId: product.id, quantity: 1 }],
        customer: {
          fullName: 'Voucher Retry',
          email: 'voucher-retry@test.com',
          phone: '0907272727',
          address: 'Test address',
          province: 'Ho Chi Minh',
          ward: 'Ben Nghe',
        },
        voucherCode: 'RELEASEFAIL',
      })
      .expect(201);
    const release = voucherService.release.bind(voucherService);
    const releaseSpy = jest
      .spyOn(voucherService, 'release')
      .mockRejectedValueOnce(new Error('Injected voucher release failure'))
      .mockImplementation(release);

    try {
      await request(app)
        .put(`/api/orders/${created.body.data.id}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .expect(500);
    } finally {
      releaseSpy.mockRestore();
    }

    expect((await Order.findById(created.body.data.id)).status).toBe('pending');
    expect((await Product.findById(product.id)).stock).toBe(2);
    expect((await Voucher.findOne({ code: 'RELEASEFAIL' })).used).toBe(1);

    await request(app)
      .put(`/api/orders/${created.body.data.id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await request(app)
      .put(`/api/orders/${created.body.data.id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect((await Product.findById(product.id)).stock).toBe(3);
    expect((await Voucher.findOne({ code: 'RELEASEFAIL' })).used).toBe(0);
  });

  it('processes mixed product and accessory transaction operations sequentially', async () => {
    const user = await createUser({ email: 'mixed@test.com', phone: '0904141414' });
    const token = jwt.sign({ sub: user.id, role: user.role }, env.jwtAccessSecret);
    const taxonomy = await seedTaxonomy();
    const product = await Product.create({
      _id: 'mixed-phone',
      name: 'Mixed Phone',
      ...taxonomy,
      price: 2000000,
      stock: 3,
      status: 'active',
    });
    const accessory = await Accessory.create({
      _id: 'mixed-accessory',
      name: 'Mixed Accessory',
      ...taxonomy,
      price: 500000,
      stock: 3,
      status: 'active',
    });
    let activeReads = 0;
    let maxConcurrentReads = 0;
    const originalProductFind = productRepository.findById.bind(productRepository);
    const originalAccessoryFind = accessoryRepository.findById.bind(accessoryRepository);
    const trackRead = (original) => async (...args) => {
      activeReads += 1;
      maxConcurrentReads = Math.max(maxConcurrentReads, activeReads);
      await new Promise((resolve) => setImmediate(resolve));
      try {
        return await original(...args);
      } finally {
        activeReads -= 1;
      }
    };
    const productFindSpy = jest
      .spyOn(productRepository, 'findById')
      .mockImplementation(trackRead(originalProductFind));
    const accessoryFindSpy = jest
      .spyOn(accessoryRepository, 'findById')
      .mockImplementation(trackRead(originalAccessoryFind));

    let created;
    try {
      created = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', 'mixed-transaction')
        .send({
          items: [
            { productId: product.id, type: 'product', quantity: 1 },
            { accessoryId: accessory.id, type: 'accessory', quantity: 1 },
          ],
          customer: {
            fullName: 'Mixed Customer',
            email: 'mixed@test.com',
            phone: '0904141414',
            address: 'Test address',
          province: 'Ho Chi Minh',
          ward: 'Ben Nghe',
          },
        });
    } finally {
      productFindSpy.mockRestore();
      accessoryFindSpy.mockRestore();
    }

    expect(created.status).toBe(201);
    expect(maxConcurrentReads).toBe(1);
    expect(created.body.data.items).toHaveLength(2);

    let activeRestores = 0;
    let maxConcurrentRestores = 0;
    const originalProductUpdate = Product.updateOne.bind(Product);
    const originalAccessoryUpdate = Accessory.updateOne.bind(Accessory);
    const trackRestore = (original) => async (...args) => {
      activeRestores += 1;
      maxConcurrentRestores = Math.max(maxConcurrentRestores, activeRestores);
      await new Promise((resolve) => setImmediate(resolve));
      try {
        return await original(...args);
      } finally {
        activeRestores -= 1;
      }
    };
    const productUpdateSpy = jest
      .spyOn(Product, 'updateOne')
      .mockImplementation(trackRestore(originalProductUpdate));
    const accessoryUpdateSpy = jest
      .spyOn(Accessory, 'updateOne')
      .mockImplementation(trackRestore(originalAccessoryUpdate));

    try {
      await request(app)
        .put(`/api/orders/${created.body.data.id}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    } finally {
      productUpdateSpy.mockRestore();
      accessoryUpdateSpy.mockRestore();
    }

    expect(maxConcurrentRestores).toBe(1);
    expect((await Product.findById(product.id)).stock).toBe(3);
    expect((await Accessory.findById(accessory.id)).stock).toBe(3);
  });

  it('rejects generic admin state mutations while allowing safe shipping edits', async () => {
    const admin = await createUser({ email: 'safe-admin@test.com', phone: '0904242424', role: 'admin' });
    const adminToken = jwt.sign({ sub: admin.id, role: admin.role }, env.jwtAccessSecret);
    const order = await Order.create({
      orderNumber: 'TP260729SAFE',
      userId: 'customer-id',
      status: 'pending',
      paymentStatus: 'pending',
      items: [{ id: 'phone-safe', productId: 'phone-safe', name: 'Phone', price: 1000000, quantity: 1 }],
      subtotal: 1000000,
      shippingFee: 30000,
      discount: 0,
      total: 1030000,
      customer: {
        fullName: 'Safe Update Customer',
        email: 'safe-update@test.com',
        phone: '0904343434',
        address: 'Test address',
          province: 'Ho Chi Minh',
          ward: 'Ben Nghe',
      },
    });

    await request(app)
      .put(`/api/admin/orders/${order.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'cancelled', paymentStatus: 'paid' })
      .expect(422);

    const unchanged = await Order.findById(order.id);
    expect(unchanged.status).toBe('pending');
    expect(unchanged.paymentStatus).toBe('pending');

    const safe = await request(app)
      .put(`/api/admin/orders/${order.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ shippingProvider: 'Safe Express', trackingNumber: 'SAFE-001' })
      .expect(200);

    expect(safe.body.data).toEqual(expect.objectContaining({
      status: 'pending',
      paymentStatus: 'pending',
      shippingProvider: 'Safe Express',
      trackingNumber: 'SAFE-001',
    }));

    const customerUpdate = await request(app)
      .put(`/api/admin/orders/${order.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customer: {
          fullName: 'Safe Update Customer',
          email: 'safe-update@test.com',
          phone: '+84 904 343 434',
          address: 'Test address',
          province: 'Ho Chi Minh',
          ward: 'Ben Nghe',
        },
      })
      .expect(200);

    expect(customerUpdate.body.data.customer.phone).toBe('0904343434');
  });

  it('allocates unique order numbers for concurrent different checkout keys', async () => {
    const user = await createUser({ email: 'sequence@test.com', phone: '0904444444' });
    const token = jwt.sign({ sub: user.id, role: user.role }, env.jwtAccessSecret);
    const taxonomy = await seedTaxonomy();
    const product = await Product.create({
      _id: 'sequence-phone',
      name: 'Sequence Phone',
      ...taxonomy,
      price: 2500000,
      stock: 4,
      status: 'active',
    });
    const payload = {
      items: [{ productId: product.id, quantity: 1 }],
      customer: {
        fullName: 'Sequence Customer',
        email: 'sequence@test.com',
        phone: '0904444444',
        address: 'Test address',
          province: 'Ho Chi Minh',
          ward: 'Ben Nghe',
      },
    };
    const post = (key) => request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .send(payload);

    const [first, second] = await Promise.all([
      post('sequence-attempt-1'),
      post('sequence-attempt-2'),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data.orderNumber).not.toBe(first.body.data.orderNumber);
    expect((await Product.findById(product.id)).stock).toBe(2);
  });

  it('enforces valid admin order status transitions', async () => {
    const admin = await createUser({ email: 'admin@test.com', phone: '0900000000', role: 'admin' });
    const adminToken = jwt.sign({ sub: admin.id, role: admin.role }, env.jwtAccessSecret);
    const order = await Order.create({
      orderNumber: 'TP26061799',
      userId: 'customer-id',
      status: 'pending',
      items: [{ id: 'phone-1', productId: 'phone-1', name: 'Phone', price: 1000000, quantity: 1 }],
      subtotal: 1000000,
      shippingFee: 30000,
      discount: 0,
      total: 1030000,
      customer: {
        fullName: 'Transition Customer',
        email: 'transition@test.com',
        phone: '0933333333',
        address: 'Test address',
          province: 'Ho Chi Minh',
          ward: 'Ben Nghe',
      },
    });

    const invalid = await request(app)
      .put(`/api/admin/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'delivered' });

    expect(invalid.status).toBe(400);

    const valid = await request(app)
      .put(`/api/admin/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'confirmed' });

    expect(valid.status).toBe(200);
    expect(valid.body.data.status).toBe('confirmed');
  });

  it('restores inventory and voucher usage before an admin archives an active order', async () => {
    const admin = await createUser({ email: 'archive-admin@test.com', phone: '0904545454', role: 'admin' });
    const adminToken = jwt.sign({ sub: admin.id, role: admin.role }, env.jwtAccessSecret);
    const taxonomy = await seedTaxonomy();
    const product = await Product.create({
      _id: 'archive-phone',
      name: 'Archive Phone',
      ...taxonomy,
      price: 3000000,
      stock: 3,
      status: 'active',
    });
    const voucher = await seedVoucher({ code: 'ARCHIVE', quantity: 2 });

    const created = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [{ productId: product.id, quantity: 1 }],
        customer: {
          fullName: 'Archive Customer',
          email: 'archive-customer@test.com',
          phone: '0904646464',
          address: 'Test address',
          province: 'Ho Chi Minh',
          ward: 'Ben Nghe',
        },
        voucherCode: voucher.code,
      })
      .expect(201);

    expect((await Product.findById(product.id)).stock).toBe(2);
    expect((await Voucher.findById(voucher.id)).used).toBe(1);

    await request(app)
      .delete(`/api/admin/orders/${created.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const archivedOrder = await Order.findById(created.body.data.id);
    expect(archivedOrder.status).toBe('cancelled');
    expect(archivedOrder.isDeleted).toBe(true);
    expect((await Product.findById(product.id)).toObject()).toEqual(
      expect.objectContaining({ stock: 3, sold: 0 }),
    );
    expect((await Voucher.findById(voucher.id)).used).toBe(0);

    const paidOrder = await Order.create({
      orderNumber: 'TP260729PAID',
      status: 'confirmed',
      paymentStatus: 'paid',
      items: [{
        id: product.id,
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
      }],
      subtotal: product.price,
      total: product.price,
      customer: {
        fullName: 'Paid Customer',
        email: 'paid-archive@test.com',
        phone: '0904747474',
        address: 'Test address',
          province: 'Ho Chi Minh',
          ward: 'Ben Nghe',
      },
    });

    await request(app)
      .delete(`/api/admin/orders/${paidOrder.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
    expect((await Order.findById(paidOrder.id)).isDeleted).toBe(false);
  });

  it('returns admin dashboard statistics', async () => {
    const admin = await createUser({
      email: 'admin@test.com',
      phone: '0900000000',
      role: 'admin',
    });
    const token = jwt.sign({ sub: admin.id, role: 'admin' }, env.jwtAccessSecret, {
      expiresIn: '15m',
    });

    const response = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.stats).toEqual(
      expect.objectContaining({
        products: 0,
        orders: 0,
        customers: 0,
        revenue: 0,
      }),
    );
    expect(response.body.data.monthlyRevenue).toHaveLength(12);
  });

  it('does not merge the same month from different years', async () => {
    const admin = await createUser({
      email: 'year-admin@test.com',
      phone: '0900000001',
      role: 'admin',
    });
    const token = jwt.sign({ sub: admin.id, role: 'admin' }, env.jwtAccessSecret, {
      expiresIn: '15m',
    });
    const customer = {
      fullName: 'Revenue Customer',
      email: 'revenue@test.com',
      phone: '0912000000',
      address: 'Test address',
    };

    await Order.create([
      {
        orderNumber: 'TP25011001',
        status: 'completed',
        items: [],
        subtotal: 1000000,
        total: 1000000,
        customer,
        createdAt: new Date('2025-01-10T00:00:00.000Z'),
      },
      {
        orderNumber: 'TP26011001',
        status: 'delivered',
        items: [],
        subtotal: 2000000,
        total: 2000000,
        customer,
        createdAt: new Date('2026-01-10T00:00:00.000Z'),
      },
      {
        orderNumber: 'TP26011002',
        status: 'pending',
        items: [],
        subtotal: 4000000,
        total: 4000000,
        customer,
        createdAt: new Date('2026-01-11T00:00:00.000Z'),
      },
      {
        orderNumber: 'TP26011003',
        status: 'completed',
        items: [],
        subtotal: 8000000,
        total: 8000000,
        customer,
        isDeleted: true,
        deletedAt: new Date('2026-01-12T00:00:00.000Z'),
        createdAt: new Date('2026-01-12T00:00:00.000Z'),
      },
    ]);

    const response = await request(app)
      .get('/api/admin/dashboard?year=2026')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.stats.revenue).toBe(2000000);
    expect(response.body.data.monthlyRevenue[0]).toBe(2);
  });

  it('returns zero revenue for an empty year and rejects unsafe years', async () => {
    const admin = await createUser({
      email: 'empty-year-admin@test.com',
      phone: '0900000002',
      role: 'admin',
    });
    const token = jwt.sign({ sub: admin.id, role: 'admin' }, env.jwtAccessSecret, {
      expiresIn: '15m',
    });

    const empty = await request(app)
      .get('/api/admin/dashboard?year=2024')
      .set('Authorization', `Bearer ${token}`);
    expect(empty.status).toBe(200);
    expect(empty.body.data.stats.revenue).toBe(0);
    expect(empty.body.data.monthlyRevenue).toEqual(Array(12).fill(0));

    await request(app)
      .get('/api/admin/dashboard?year=1899')
      .set('Authorization', `Bearer ${token}`)
      .expect(422);
    await request(app)
      .get('/api/admin/dashboard?year=10000')
      .set('Authorization', `Bearer ${token}`)
      .expect(422);
  });

  it('paginates admin customers with aggregate order totals', async () => {
    const admin = await createUser({
      email: 'customer-page-admin@test.com',
      phone: '0900000003',
      role: 'admin',
    });
    const token = jwt.sign({ sub: admin.id, role: 'admin' }, env.jwtAccessSecret, {
      expiresIn: '15m',
    });
    const customers = await Promise.all([
      createUser({ email: 'page-1@test.com', phone: '0913000001', fullName: 'Page One' }),
      createUser({ email: 'page-2@test.com', phone: '0913000002', fullName: 'Page Two' }),
      createUser({ email: 'page-3@test.com', phone: '0913000003', fullName: 'Page Three' }),
    ]);
    await Order.create({
      orderNumber: 'TPCUSTOMER01',
      userId: customers[0].id,
      status: 'delivered',
      items: [],
      subtotal: 1500000,
      total: 1500000,
      customer: {
        fullName: customers[0].fullName,
        email: customers[0].email,
        phone: customers[0].phone,
        address: 'Test address',
      },
    });

    const firstPage = await request(app)
      .get('/api/admin/customers?page=1&limit=2')
      .set('Authorization', `Bearer ${token}`);
    const secondPage = await request(app)
      .get('/api/admin/customers?page=2&limit=2')
      .set('Authorization', `Bearer ${token}`);

    expect(firstPage.status).toBe(200);
    expect(firstPage.body.data.items).toHaveLength(2);
    expect(firstPage.body.data.pagination).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
    expect(secondPage.body.data.items).toHaveLength(1);
    expect(secondPage.body.data.pagination).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
    const enrichedCustomer = [...firstPage.body.data.items, ...secondPage.body.data.items]
      .find((item) => item.id === customers[0].id);
    expect(enrichedCustomer).toEqual(expect.objectContaining({ orderCount: 1, totalSpent: 1500000 }));
  });

  it('paginates admin orders while preserving the response envelope', async () => {
    const admin = await createUser({
      email: 'order-page-admin@test.com',
      phone: '0900000004',
      role: 'admin',
    });
    const token = jwt.sign({ sub: admin.id, role: 'admin' }, env.jwtAccessSecret, {
      expiresIn: '15m',
    });
    const customer = {
      fullName: 'Paged Order Customer',
      email: 'paged-order@test.com',
      phone: '0914000000',
      address: 'Test address',
    };
    await Order.create([1, 2, 3].map((number) => ({
      orderNumber: `TPPAGE000${number}`,
      status: 'pending',
      items: [],
      subtotal: number,
      total: number,
      customer,
      createdAt: new Date(`2026-01-0${number}T00:00:00.000Z`),
    })));

    const response = await request(app)
      .get('/api/admin/orders?page=2&limit=2')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.pagination).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
  });

  it('filters admin customers before pagination and escapes literal search text', async () => {
    const admin = await createUser({
      email: 'customer-filter-admin@test.com',
      phone: '0900000005',
      role: 'admin',
    });
    const token = jwt.sign({ sub: admin.id, role: 'admin' }, env.jwtAccessSecret, {
      expiresIn: '15m',
    });
    const matchingCustomers = await Promise.all([1, 2, 3].map((number) => createUser({
      email: `literal.${number}@test.com`,
      phone: `091500000${number}`,
      fullName: `Literal.Customer ${number}`,
    })));
    await createUser({
      email: 'plain-customer@test.com',
      phone: '0915000004',
      fullName: 'Plain Customer',
    });
    const deleted = await createUser({
      email: 'deleted.literal@test.com',
      phone: '0915000005',
      fullName: 'Deleted Literal.Customer',
    });
    await User.updateOne({ _id: deleted.id }, { isDeleted: true, deletedAt: new Date() });

    const response = await request(app)
      .get('/api/admin/customers?search=Literal.Customer&page=2&limit=2')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(1);
    expect(matchingCustomers.map((customer) => customer.id)).toContain(response.body.data.items[0].id);
    expect(response.body.data.pagination).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });

    await request(app)
      .get(`/api/admin/customers?search=${'x'.repeat(101)}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(422);
  });

  it('filters admin orders and count with the same escaped search and status', async () => {
    const admin = await createUser({
      email: 'order-filter-admin@test.com',
      phone: '0900000006',
      role: 'admin',
    });
    const token = jwt.sign({ sub: admin.id, role: 'admin' }, env.jwtAccessSecret, {
      expiresIn: '15m',
    });
    const customer = {
      fullName: 'Order Filter Customer',
      email: 'order-filter@test.com',
      phone: '0916000000',
      address: 'Test address',
    };
    const plainCustomer = {
      fullName: 'Plain Customer',
      email: 'plain',
      phone: '0916000001',
      address: 'Test address',
    };
    await Order.create([
      { orderNumber: 'TP.LITERAL1', status: 'pending', items: [], subtotal: 1, total: 1, customer },
      { orderNumber: 'TPPLAIN001', status: 'pending', items: [], subtotal: 2, total: 2, customer: plainCustomer },
      { orderNumber: 'TP.LITERAL2', status: 'completed', items: [], subtotal: 3, total: 3, customer },
      {
        orderNumber: 'TP.LITERAL3',
        status: 'pending',
        items: [],
        subtotal: 4,
        total: 4,
        customer,
        isDeleted: true,
        deletedAt: new Date(),
      },
    ]);

    const response = await request(app)
      .get('/api/admin/orders?search=.&status=pending&page=1&limit=20')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.items.map((order) => order.orderNumber)).toEqual(['TP.LITERAL1']);
    expect(response.body.data.pagination).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });

    await request(app)
      .get('/api/admin/orders?status=not-a-status')
      .set('Authorization', `Bearer ${token}`)
      .expect(422);
    await request(app)
      .get(`/api/admin/orders?search=${'x'.repeat(101)}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(422);
  });

  it('accepts dashboard year 9999 and defaults omitted year to the current UTC year', async () => {
    const admin = await createUser({
      email: 'dashboard-boundary-admin@test.com',
      phone: '0900000007',
      role: 'admin',
    });
    const token = jwt.sign({ sub: admin.id, role: 'admin' }, env.jwtAccessSecret, {
      expiresIn: '15m',
    });
    const currentYear = new Date().getUTCFullYear();
    await Order.create({
      orderNumber: 'TPCURRENTYEAR1',
      status: 'completed',
      items: [],
      subtotal: 7000000,
      total: 7000000,
      customer: {
        fullName: 'Current Year Customer',
        email: 'current-year@test.com',
        phone: '0917000000',
        address: 'Test address',
      },
      createdAt: new Date(Date.UTC(currentYear, 5, 1)),
    });

    const boundary = await request(app)
      .get('/api/admin/dashboard?year=9999')
      .set('Authorization', `Bearer ${token}`);
    const omitted = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(boundary.status).toBe(200);
    expect(boundary.body.data.stats.revenue).toBe(0);
    expect(omitted.status).toBe(200);
    expect(omitted.body.data.stats.revenue).toBe(7000000);
    expect(omitted.body.data.monthlyRevenue[5]).toBe(7);
  });
});

const request = require('supertest');
const Order = require('../src/models/Order');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Brand = require('../src/models/Brand');
const Category = require('../src/models/Category');
const voucherService = require('../src/services/voucherService');
const chatTools = require('../src/services/chatTools');
const { app, createUser, login } = require('./helpers');

const seedProduct = async (overrides = {}) => {
  const brand = await Brand.create({ name: `Brand ${overrides._id}`, slug: `brand-${overrides._id}`, active: true });
  const category = await Category.create({ name: `Cat ${overrides._id}`, slug: `cat-${overrides._id}`, active: true });
  return Product.create({
    name: 'Feature Phone',
    brandId: brand.id,
    categoryId: category.id,
    price: 2000000,
    stock: 5,
    status: 'active',
    ...overrides,
  });
};

const customerInfo = (overrides = {}) => ({
  fullName: 'Nguyễn Minh Khang',
  email: 'khang@test.com',
  phone: '0912345678',
  address: '12 Lê Lợi',
  province: 'TP. Hồ Chí Minh',
  ward: 'Phường Sài Gòn',
  ...overrides,
});

const placeOrder = (token, productId, body = {}) => request(app)
  .post('/api/orders')
  .set('Authorization', `Bearer ${token}`)
  .send({ items: [{ productId, quantity: 1 }], customer: customerInfo(), ...body });

describe('Customer self-cancellation', () => {
  it('lets a customer cancel only while the order is waiting for confirmation', async () => {
    await createUser({ email: 'self-cancel@test.com', phone: '0912345678' });
    await createUser({ email: 'cancel-admin@test.com', phone: '0900000000', role: 'admin' });
    const token = await login('0912345678');
    const adminToken = await login('0900000000');
    const product = await seedProduct({ _id: 'self-cancel-phone' });

    const pending = await placeOrder(token, product.id).expect(201);
    await request(app)
      .put(`/api/orders/${pending.body.data.id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect((await Product.findById(product.id)).stock).toBe(5);

    const confirmed = await placeOrder(token, product.id).expect(201);
    await request(app)
      .put(`/api/admin/orders/${confirmed.body.data.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'confirmed' })
      .expect(200);

    const rejected = await request(app)
      .put(`/api/orders/${confirmed.body.data.id}/cancel`)
      .set('Authorization', `Bearer ${token}`);
    expect(rejected.status).toBe(400);
    expect(rejected.body.message).toMatch(/đã được cửa hàng xác nhận/);
    expect((await Order.findById(confirmed.body.data.id)).status).toBe('confirmed');
    expect((await Product.findById(product.id)).stock).toBe(4);

    await request(app)
      .put(`/api/admin/orders/${confirmed.body.data.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'cancelled' })
      .expect(200);
    expect((await Product.findById(product.id)).stock).toBe(5);
  });
});


describe('Saved shipping address', () => {
  const savedAddress = async (phone) => (await User.findOne({ phone })).toJSON().shippingAddress;

  it('saves the first order address and only replaces it when the customer asks', async () => {
    await createUser({ email: 'address@test.com', phone: '0912345678' });
    const product = await seedProduct({ _id: 'address-phone', stock: 10 });
    let token = await login('0912345678');

    await placeOrder(token, product.id).expect(201);
    expect(await savedAddress('0912345678')).toEqual({
      fullName: 'Nguyễn Minh Khang',
      email: 'khang@test.com',
      phone: '0912345678',
      address: '12 Lê Lợi',
      province: 'TP. Hồ Chí Minh',
      ward: 'Phường Sài Gòn',
    });

    token = await login('0912345678');
    const gift = customerInfo({ fullName: 'Trần Thu Hà', address: '5 Trần Phú', province: 'Hà Nội', ward: 'Phường Ba Đình' });
    await placeOrder(token, product.id, { customer: gift }).expect(201);
    expect((await savedAddress('0912345678')).address).toBe('12 Lê Lợi');

    await placeOrder(token, product.id, { customer: gift, saveAddress: true }).expect(201);
    expect(await savedAddress('0912345678')).toMatchObject({
      fullName: 'Trần Thu Hà',
      address: '5 Trần Phú',
      province: 'Hà Nội',
      ward: 'Phường Ba Đình',
    });
  });

  it('rejects a non-boolean saveAddress flag before touching stock', async () => {
    await createUser({ email: 'address-flag@test.com', phone: '0912345678' });
    const product = await seedProduct({ _id: 'address-flag-phone' });
    const token = await login('0912345678');

    await placeOrder(token, product.id, { saveAddress: 'yes' }).expect(422);
    expect((await Product.findById(product.id)).stock).toBe(5);
  });

  it('updates and validates the saved address from the profile', async () => {
    await createUser({ email: 'profile-address@test.com', phone: '0912345678' });
    const token = await login('0912345678');

    const updated = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ shippingAddress: customerInfo({ phone: '+84912345678', email: 'KHANG@TEST.COM' }) })
      .expect(200);
    expect(updated.body.data.shippingAddress).toMatchObject({ phone: '0912345678', email: 'khang@test.com' });

    await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ shippingAddress: customerInfo({ ward: '' }) })
      .expect(422);
    await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ shippingAddress: { ...customerInfo(), district: 'Quận 1' } })
      .expect(422);
  });
});

describe('Gift vouchers for loyal customers', () => {
  const nextWeek = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  it('creates a one-use voucher that only the gifted customer can see and redeem', async () => {
    const loyal = await createUser({ email: 'loyal@test.com', phone: '0912345678' });
    await createUser({ email: 'other@test.com', phone: '0987654321' });
    await createUser({ email: 'gift-admin@test.com', phone: '0900000000', role: 'admin' });
    const adminToken = await login('0900000000');
    const loyalToken = await login('0912345678');
    const otherToken = await login('0987654321');
    const product = await seedProduct({ _id: 'gift-phone', price: 3000000 });

    const gift = await request(app)
      .post(`/api/admin/customers/${loyal.id}/vouchers`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'fixed', value: 200000, minOrder: 1000000, endDate: nextWeek() })
      .expect(201);
    const { code } = gift.body.data;
    expect(code).toMatch(/^TRIAN[A-Z2-9]{6}$/);
    expect(gift.body.data).toMatchObject({ assignedUserId: loyal.id, quantity: 1, note: 'Tri ân khách hàng Test User' });

    const mine = await request(app).get('/api/vouchers/mine').set('Authorization', `Bearer ${loyalToken}`).expect(200);
    expect(mine.body.data).toEqual([expect.objectContaining({ code, status: 'available', value: 200000 })]);
    const othersList = await request(app).get('/api/vouchers/mine').set('Authorization', `Bearer ${otherToken}`).expect(200);
    expect(othersList.body.data).toEqual([]);

    await request(app).post('/api/vouchers/check').send({ code, subtotal: 3000000 }).expect(400);
    await request(app).post('/api/vouchers/check').set('Authorization', `Bearer ${otherToken}`).send({ code, subtotal: 3000000 }).expect(400);
    await request(app).post('/api/vouchers/check').set('Authorization', `Bearer ${loyalToken}`).send({ code, subtotal: 3000000 }).expect(200);

    const stolen = await placeOrder(otherToken, product.id, { voucherCode: code, customer: customerInfo({ phone: '0987654321' }) });
    expect(stolen.status).toBe(400);
    expect((await Product.findById(product.id)).stock).toBe(5);

    const redeemed = await placeOrder(loyalToken, product.id, { voucherCode: code }).expect(201);
    expect(redeemed.body.data.discount).toBe(200000);
    const afterUse = await request(app).get('/api/vouchers/mine').set('Authorization', `Bearer ${loyalToken}`).expect(200);
    expect(afterUse.body.data[0].status).toBe('used');
    await placeOrder(loyalToken, product.id, { voucherCode: code }).expect(400);
  });

  it('keeps gift vouchers out of the chatbot promotion list', async () => {
    const loyal = await createUser({ email: 'loyal-chat@test.com', phone: '0912345678' });
    await voucherService.giftToCustomer(loyal.id, { type: 'percent', value: 10, maxDiscount: 300000, endDate: nextWeek() });
    const result = await chatTools.handlers.list_promotions();
    expect(result.vouchers).toEqual([]);
  });

  it('validates gift voucher input and the target customer', async () => {
    const loyal = await createUser({ email: 'loyal-invalid@test.com', phone: '0912345678' });
    const admin = await createUser({ email: 'gift-admin2@test.com', phone: '0900000000', role: 'admin' });
    const adminToken = await login('0900000000');
    const send = (id, body) => request(app)
      .post(`/api/admin/customers/${id}/vouchers`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body);

    await send(loyal.id, { type: 'percent', value: 150, endDate: nextWeek() }).expect(422);
    await send(loyal.id, { type: 'fixed', value: 0, endDate: nextWeek() }).expect(422);
    await send(loyal.id, { type: 'fixed', value: 100000, endDate: nextWeek(), quantity: 99 }).expect(422);
    await send(loyal.id, { type: 'fixed', value: 100000, endDate: '2020-01-01' }).expect(422);
    await send(admin.id, { type: 'fixed', value: 100000, endDate: nextWeek() }).expect(404);
    await request(app)
      .post(`/api/admin/customers/${loyal.id}/vouchers`)
      .set('Authorization', `Bearer ${await login('0912345678')}`)
      .send({ type: 'fixed', value: 100000, endDate: nextWeek() })
      .expect(403);
  });
});

describe('Admin dashboard insights', () => {
  const receiver = { fullName: 'Revenue Customer', email: 'rev@test.com', phone: '0912000000', address: 'Test address' };
  const order = (overrides) => ({
    orderNumber: `TP${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    status: 'completed',
    items: [],
    subtotal: overrides.total,
    customer: receiver,
    ...overrides,
  });
  const adminGet = async (path) => {
    await createUser({ email: 'insight-admin@test.com', phone: '0900000000', role: 'admin' });
    const token = await login('0900000000');
    return request(app).get(path).set('Authorization', `Bearer ${token}`);
  };

  it('groups revenue by Vietnam year, month and day', async () => {
    await Order.create([
      // 2026-03-01 06:00 in Vietnam is still 2026-02-28 in UTC.
      order({ total: 1000000, createdAt: new Date('2026-02-28T23:00:00.000Z') }),
      order({ total: 2000000, status: 'delivered', createdAt: new Date('2026-03-15T03:00:00.000Z') }),
      order({ total: 9000000, status: 'cancelled', createdAt: new Date('2026-03-15T03:00:00.000Z') }),
      order({ total: 4000000, createdAt: new Date('2024-07-01T03:00:00.000Z') }),
      // 2025-12-31 18:00 UTC is already 2026-01-01 in Vietnam.
      order({ total: 500000, createdAt: new Date('2025-12-31T18:00:00.000Z') }),
    ]);

    const response = await adminGet('/api/admin/dashboard/revenue?year=2026&month=3');

    expect(response.status).toBe(200);
    const { yearly, monthly, daily } = response.body.data;
    expect(yearly).toEqual([
      { year: 2022, total: 0 },
      { year: 2023, total: 0 },
      { year: 2024, total: 4000000 },
      { year: 2025, total: 0 },
      { year: 2026, total: 3500000 },
    ]);
    expect(monthly.slice(0, 3)).toEqual([500000, 0, 3000000]);
    expect(daily).toHaveLength(31);
    expect(daily[0]).toBe(1000000);
    expect(daily[14]).toBe(2000000);
  });

  it('rejects an invalid month', async () => {
    const response = await adminGet('/api/admin/dashboard?year=2026&month=13');
    expect(response.status).toBe(422);
  });

  it('ranks customers by delivered spending and flags stock at or below 10', async () => {
    const big = await createUser({ fullName: 'Khách lớn', email: 'big@test.com', phone: '0912345678' });
    const small = await createUser({ fullName: 'Khách nhỏ', email: 'small@test.com', phone: '0987654321' });
    await Order.create([
      order({ userId: small.id, total: 3000000, createdAt: new Date() }),
      order({ userId: big.id, total: 5000000, createdAt: new Date() }),
      order({ userId: big.id, total: 4000000, status: 'delivered', createdAt: new Date() }),
      order({ userId: big.id, total: 99000000, status: 'pending', createdAt: new Date() }),
    ]);
    await seedProduct({ _id: 'stock-ten', name: 'Còn mười', stock: 10, sold: 7 });
    await seedProduct({ _id: 'stock-zero', name: 'Hết hàng', stock: 0, sold: 30 });
    await seedProduct({ _id: 'stock-eleven', name: 'Còn mười một', stock: 11 });
    await seedProduct({ _id: 'stock-hidden', name: 'Ngừng bán', stock: 1, status: 'inactive' });

    const response = await adminGet('/api/admin/dashboard');

    expect(response.status).toBe(200);
    expect(response.body.data.topCustomers.map(({ fullName, orderCount, totalSpent }) => ({ fullName, orderCount, totalSpent })))
      .toEqual([
        { fullName: 'Khách lớn', orderCount: 2, totalSpent: 9000000 },
        { fullName: 'Khách nhỏ', orderCount: 1, totalSpent: 3000000 },
      ]);
    expect(response.body.data.lowStock).toMatchObject({ threshold: 10, total: 2, outOfStock: 1 });
    expect(response.body.data.lowStock.items.map((item) => [item.name, item.stock, item.type]))
      .toEqual([['Hết hàng', 0, 'product'], ['Còn mười', 10, 'product']]);
    expect(response.body.data.topProducts.map((item) => item.name)).toEqual(['Hết hàng', 'Còn mười']);
  });
});

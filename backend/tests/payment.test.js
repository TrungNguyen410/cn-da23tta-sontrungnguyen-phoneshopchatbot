const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('./helpers');
const env = require('../src/config/env');
const Order = require('../src/models/Order');
const orderRepository = require('../src/repositories/orderRepository');
const { createUser } = require('./helpers');

describe('Payment configuration', () => {
  env.bank ||= {};
  const originalBank = { ...env.bank };

  beforeEach(() => {
    Object.assign(env.bank, {
      name: '',
      bin: '',
      accountNumber: '',
      accountName: '',
    });
  });

  afterAll(() => {
    Object.assign(env.bank, originalBank);
  });

  it('returns only COD and bank transfer with public bank display data', async () => {
    Object.assign(env.bank, {
      name: 'Test Bank',
      bin: '970436',
      accountNumber: '123456789',
      accountName: 'PHONESHOPAI TEST',
    });

    const response = await request(app).get('/api/payments/config').expect(200);

    expect(Object.keys(response.body.data.providers).sort()).toEqual(['bank', 'cod']);
    expect(response.body.data.providers.bank).toEqual({
      enabled: true,
      autoConfirm: false,
      display: {
        bankName: 'Test Bank',
        bankBin: '970436',
        accountNumber: '123456789',
        accountName: 'PHONESHOPAI TEST',
      },
    });
  });

  it('trims display values and does not enable a whitespace-only bank account', async () => {
    Object.assign(env.bank, {
      name: '  Test Bank  ',
      bin: ' 970436 ',
      accountNumber: ' 123456789 ',
      accountName: ' PHONESHOPAI TEST ',
    });

    const response = await request(app).get('/api/payments/config').expect(200);

    expect(response.body.data.providers.bank.display).toEqual({
      bankName: 'Test Bank',
      bankBin: '970436',
      accountNumber: '123456789',
      accountName: 'PHONESHOPAI TEST',
    });

    Object.assign(env.bank, { name: '   ', bin: '   ', accountNumber: '   ', accountName: '   ' });
    const disabled = await request(app).get('/api/payments/config').expect(200);
    expect(disabled.body.data.providers.bank).toEqual({ enabled: false });
  });

  it('no longer exposes the removed VNPay endpoints', async () => {
    await request(app).post('/api/payments/vnpay/checkout').send({}).expect(404);
    await request(app).get('/api/payments/vnpay/ipn').expect(404);
    await request(app).get('/api/payments/vnpay/return').expect(404);
    await request(app).post('/api/payments/vnpay/result').send({}).expect(404);
  });
});

describe('Manual payment reconciliation', () => {
  let admin;
  let adminToken;
  let orderSequence;

  const seedOrder = (overrides = {}) => {
    orderSequence += 1;
    return Order.create({
      orderNumber: `TP260805MANUAL${orderSequence}`,
      userId: 'manual-payment-customer',
      status: 'pending',
      paymentMethod: 'bank',
      paymentStatus: 'pending',
      items: [{
        id: `manual-phone-${orderSequence}`,
        productId: `manual-phone-${orderSequence}`,
        name: 'Manual Payment Phone',
        price: 1000000,
        quantity: 1,
      }],
      subtotal: 1000000,
      shippingFee: 0,
      discount: 0,
      total: 1000000,
      customer: {
        fullName: 'Manual Payment Customer',
        email: 'manual-payment@test.com',
        phone: '0912345678',
        address: '1 Nguyen Hue',
        province: 'Ho Chi Minh',
        ward: 'Ben Nghe',
      },
      ...overrides,
    });
  };

  const reconcile = (orderId, payload, token = adminToken) => request(app)
    .put(`/api/admin/orders/${orderId}/payment`)
    .set('Authorization', `Bearer ${token}`)
    .send(payload);

  beforeEach(async () => {
    orderSequence = 0;
    admin = await createUser({
      email: 'payment-admin@test.com',
      phone: '0900000805',
      role: 'admin',
    });
    adminToken = jwt.sign({ sub: admin.id, role: admin.role }, env.jwtAccessSecret);
  });

  it('lets an admin reconcile a pending bank payment once and records server-owned audit data', async () => {
    const order = await seedOrder();
    const before = Date.now();

    const response = await reconcile(order.id, {
      status: 'paid',
      reference: 'BANK-20260805-01',
      note: 'Matched bank statement',
    }).expect(200);

    expect(response.body.data).toMatchObject({
      paymentStatus: 'paid',
      paymentReference: 'BANK-20260805-01',
      status: 'confirmed',
      paymentAudit: {
        confirmedBy: admin.id,
        note: 'Matched bank statement',
      },
    });
    expect(new Date(response.body.data.paymentAudit.confirmedAt).getTime()).toBeGreaterThanOrEqual(before);

    await reconcile(order.id, {
      status: 'paid',
      reference: 'BANK-20260805-01',
      note: 'Duplicate click',
    }).expect(409);

    const persisted = await Order.findById(order.id);
    expect(persisted.paymentAudit.note).toBe('Matched bank statement');
  });

  it('allows failed to paid reconciliation and does not regress shipping or completed order states', async () => {
    const shipping = await seedOrder({ paymentStatus: 'failed', status: 'shipping' });
    const completed = await seedOrder({ paymentStatus: 'failed', status: 'completed' });

    const shippingResponse = await reconcile(shipping.id, {
      status: 'paid',
      reference: 'BANK-PAID-LATE',
      note: 'Late bank transfer confirmation',
    }).expect(200);
    const completedResponse = await reconcile(completed.id, {
      status: 'paid',
      reference: 'BANK-COMPLETED-LATE',
    }).expect(200);

    expect(shippingResponse.body.data).toMatchObject({ paymentStatus: 'paid', status: 'shipping' });
    expect(completedResponse.body.data).toMatchObject({ paymentStatus: 'paid', status: 'completed' });
  });

  it('records a failed reconciliation without confirming the order', async () => {
    const order = await seedOrder();

    const response = await reconcile(order.id, {
      status: 'failed',
      reference: '',
      note: 'Transfer could not be matched',
    }).expect(200);

    expect(response.body.data).toMatchObject({
      paymentStatus: 'failed',
      paymentReference: '',
      status: 'pending',
      paymentAudit: { confirmedBy: admin.id, note: 'Transfer could not be matched' },
    });
  });

  it('rejects non-admins, unknown fields, invalid states, and a paid result without a reference', async () => {
    const order = await seedOrder();
    const customerUser = await createUser({
      email: 'payment-non-admin@test.com',
      phone: '0900000806',
    });
    const customerToken = jwt.sign(
      { sub: customerUser.id, role: customerUser.role },
      env.jwtAccessSecret,
    );

    await reconcile(order.id, { status: 'paid', reference: 'BANK-01' }, customerToken).expect(403);
    await reconcile(order.id, {
      status: 'paid',
      reference: 'BANK-01',
      confirmedBy: customerUser.id,
      confirmedAt: '2000-01-01T00:00:00.000Z',
    }).expect(422);
    await reconcile(order.id, { status: 'refunded', reference: 'BANK-01' }).expect(422);
    await reconcile(order.id, { status: 'paid', reference: '   ' }).expect(422);
    await reconcile(order.id, {
      status: 'paid',
      reference: 'R'.repeat(151),
    }).expect(422);
    await reconcile(order.id, {
      status: 'failed',
      note: 'N'.repeat(1001),
    }).expect(422);

    const unchanged = await Order.findById(order.id);
    expect(unchanged.paymentStatus).toBe('pending');
    expect(unchanged.paymentAudit.toObject()).toEqual({
      confirmedBy: null,
      confirmedAt: null,
      note: '',
    });
  });

  it('rejects nonexistent, COD, and finalized manual payments', async () => {
    const cod = await seedOrder({ paymentMethod: 'cod' });
    const finalized = await seedOrder({ paymentStatus: 'refund_required' });

    await reconcile('missing-order', { status: 'failed', note: 'Missing' }).expect(404);
    await reconcile(cod.id, { status: 'paid', reference: 'COD-01' }).expect(409);
    await reconcile(finalized.id, { status: 'paid', reference: 'BANK-02' }).expect(409);
  });

  it('returns conflict to the admin who loses a concurrent compare-and-set', async () => {
    const secondAdmin = await createUser({
      email: 'payment-admin-2@test.com',
      phone: '0900000807',
      role: 'admin',
    });
    const secondToken = jwt.sign(
      { sub: secondAdmin.id, role: secondAdmin.role },
      env.jwtAccessSecret,
    );
    const order = await seedOrder();
    const originalFindById = orderRepository.findById.bind(orderRepository);
    let reads = 0;
    let releaseReads;
    const bothRead = new Promise((resolve) => { releaseReads = resolve; });
    const findSpy = jest.spyOn(orderRepository, 'findById').mockImplementation(async (...args) => {
      const found = await originalFindById(...args);
      if (args[0] === order.id && reads < 2) {
        reads += 1;
        if (reads === 2) releaseReads();
        await bothRead;
      }
      return found;
    });

    let responses;
    try {
      responses = await Promise.all([
        reconcile(order.id, { status: 'paid', reference: 'BANK-ADMIN-1' }),
        reconcile(order.id, { status: 'failed', reference: 'BANK-ADMIN-2' }, secondToken),
      ]);
    } finally {
      releaseReads();
      findSpy.mockRestore();
    }

    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    const winner = responses.find((response) => response.status === 200).body.data;
    const persisted = await Order.findById(order.id);
    expect(persisted.paymentReference).toBe(winner.paymentReference);
    expect(persisted.paymentAudit.confirmedBy).toBe(winner.paymentAudit.confirmedBy);
  });
});

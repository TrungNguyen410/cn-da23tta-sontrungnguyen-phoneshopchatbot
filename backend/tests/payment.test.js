const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('./helpers');
const env = require('../src/config/env');
const Product = require('../src/models/Product');
const Order = require('../src/models/Order');
const PaymentTransaction = require('../src/models/PaymentTransaction');
const orderRepository = require('../src/repositories/orderRepository');
const paymentTransactionRepository = require('../src/repositories/paymentTransactionRepository');
const { signParams } = require('../src/services/paymentProviders/vnpayProvider');
const vnpayProvider = require('../src/services/paymentProviders/vnpayProvider');
const { createUser, login } = require('./helpers');

const customer = {
  fullName: 'Guest Customer',
  email: 'guest@example.com',
  phone: '0912345678',
  address: '1 Nguyen Hue',
  province: 'Ho Chi Minh',
  district: 'District 1',
  ward: 'Ben Nghe',
};

describe('VNPay checkout and IPN', () => {
  let checkoutToken;
  env.bank ||= {};
  env.momo ||= {};
  const originalBank = { ...env.bank };
  const originalMomo = { ...env.momo };

  beforeEach(async () => {
    const user = await createUser({ email: 'payment-customer@test.com', phone: '0912345678' });
    checkoutToken = jwt.sign({ sub: user.id, role: user.role }, env.jwtAccessSecret);
    env.vnpay.tmnCode = 'TESTCODE';
    env.vnpay.hashSecret = 'test-vnpay-secret';
    env.vnpay.returnUrl = 'http://localhost:5000/api/payments/vnpay/return';
    Object.assign(env.bank, {
      name: '',
      bin: '',
      accountNumber: '',
      accountName: '',
    });
    Object.assign(env.momo, { phone: '', accountName: '' });
  });

  const checkoutRequest = () => request(app)
    .post('/api/payments/vnpay/checkout')
    .set('Authorization', `Bearer ${checkoutToken}`);
  const orderRequest = () => request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${checkoutToken}`);

  afterAll(() => {
    Object.assign(env.bank, originalBank);
    Object.assign(env.momo, originalMomo);
  });

  it('returns only enabled providers and public payment display data', async () => {
    Object.assign(env.bank, {
      name: 'Test Bank',
      bin: '970436',
      accountNumber: '123456789',
      accountName: 'TECHPHONE TEST',
    });

    const response = await request(app).get('/api/payments/config').expect(200);

    expect(response.body.data.providers.bank).toEqual({
      enabled: true,
      display: {
        bankName: 'Test Bank',
        bankBin: '970436',
        accountNumber: '123456789',
        accountName: 'TECHPHONE TEST',
      },
    });
    expect(response.body.data.providers.momo.enabled).toBe(false);
    expect(response.body.data.providers.vnpay.enabled).toBe(true);
    expect(JSON.stringify(response.body.data)).not.toContain(env.vnpay.hashSecret);
    expect(response.body.data.providers.vnpay).not.toHaveProperty('tmnCode');
  });

  it('trims display values and does not enable whitespace-only providers', async () => {
    Object.assign(env.bank, {
      name: '  Test Bank  ',
      bin: ' 970436 ',
      accountNumber: ' 123456789 ',
      accountName: ' TECHPHONE TEST ',
    });
    Object.assign(env.momo, { phone: '   ', accountName: ' TECHPHONE MOMO ' });

    const response = await request(app).get('/api/payments/config').expect(200);

    expect(response.body.data.providers.bank.display).toEqual({
      bankName: 'Test Bank',
      bankBin: '970436',
      accountNumber: '123456789',
      accountName: 'TECHPHONE TEST',
    });
    expect(response.body.data.providers.momo).toEqual({ enabled: false });
  });

  it('does not enable or accept whitespace-only VNPay credentials', async () => {
    env.vnpay.tmnCode = '   ';
    env.vnpay.hashSecret = '   ';

    const config = await request(app).get('/api/payments/config').expect(200);

    expect(config.body.data.providers.vnpay.enabled).toBe(false);
    await checkoutRequest()
      .set('Idempotency-Key', 'whitespace-vnpay')
      .send({
        items: [{ id: 'missing', type: 'product', quantity: 1 }],
        customer,
        paymentMethod: 'card',
      })
      .expect(503);
  });

  it('rejects unauthenticated VNPay checkout without decrementing stock', async () => {
    const product = await Product.create({
      name: 'Protected VNPay Phone',
      slug: 'protected-vnpay-phone',
      categoryId: 'category-test',
      brandId: 'brand-test',
      price: 1000000,
      stock: 2,
      status: 'active',
    });

    const response = await request(app)
      .post('/api/payments/vnpay/checkout')
      .send({
        items: [{ id: product.id, type: 'product', quantity: 1 }],
        customer,
        paymentMethod: 'card',
      });

    expect(response.status).toBe(401);
    expect((await Product.findById(product.id)).stock).toBe(2);
  });

  it('rejects unknown VNPay checkout fields before inventory changes', async () => {
    const product = await Product.create({
      name: 'Allowlisted VNPay Phone',
      slug: 'allowlisted-vnpay-phone',
      categoryId: 'category-test',
      brandId: 'brand-test',
      price: 1000000,
      stock: 2,
      status: 'active',
    });

    const response = await checkoutRequest().send({
      items: [{ id: product.id, type: 'product', quantity: 1, suppliedPrice: 1 }],
      customer,
      paymentMethod: 'card',
      internalStatus: 'confirmed',
    });

    expect(response.status).toBe(422);
    expect((await Product.findById(product.id)).stock).toBe(2);
  });

  it('creates an authenticated VNPay order and confirms it only after a valid IPN', async () => {
    const product = await Product.create({
      name: 'Test Phone',
      slug: 'test-phone',
      categoryId: 'category-test',
      brandId: 'brand-test',
      price: 1000000,
      stock: 3,
      status: 'active',
    });

    const checkout = await checkoutRequest()
      .set('Idempotency-Key', 'checkout-test-1')
      .send({
        items: [{ id: product.id, type: 'product', quantity: 1 }],
        customer,
        paymentMethod: 'card',
      })
      .expect(201);

    expect(checkout.body.data.paymentUrl).toContain('sandbox.vnpayment.vn');
    expect(checkout.body.data.order.paymentStatus).toBe('pending');

    const transaction = await PaymentTransaction.findOne();
    const query = {
      vnp_Amount: String(transaction.amount * 100),
      vnp_BankCode: 'NCB',
      vnp_ResponseCode: '00',
      vnp_TransactionNo: '14567890',
      vnp_TransactionStatus: '00',
      vnp_TxnRef: transaction.reference,
    };
    query.vnp_SecureHash = signParams(query, env.vnpay.hashSecret);

    await request(app).get('/api/payments/vnpay/ipn').query(query).expect(200, {
      RspCode: '00',
      Message: 'Confirm Success',
    });

    const order = await Order.findById(transaction.orderId);
    expect(order.paymentStatus).toBe('paid');
    expect(order.status).toBe('confirmed');
  });

  it('retries a failed VNPay URL creation with the same pending order and reserved stock', async () => {
    const product = await Product.create({
      name: 'Retry Phone',
      slug: 'retry-phone',
      categoryId: 'category-test',
      brandId: 'brand-test',
      price: 2000000,
      stock: 3,
      status: 'active',
    });
    const payload = {
      items: [{ id: product.id, type: 'product', quantity: 1 }],
      customer,
      paymentMethod: 'card',
    };
    const createPaymentUrl = vnpayProvider.createPaymentUrl;
    const providerSpy = jest
      .spyOn(vnpayProvider, 'createPaymentUrl')
      .mockImplementationOnce(() => {
        throw new Error('Temporary VNPay failure');
      })
      .mockImplementation(createPaymentUrl);

    try {
      await checkoutRequest()
        .set('Idempotency-Key', 'checkout-retry-1')
        .send(payload)
        .expect(500);

      const pendingOrder = await Order.findOne();
      expect(pendingOrder.status).toBe('pending');
      expect((await Product.findById(product.id)).stock).toBe(2);

      const retry = await checkoutRequest()
        .set('Idempotency-Key', 'checkout-retry-1')
        .send(payload)
        .expect(201);

      expect(retry.body.data.order.id).toBe(pendingOrder.id);
      expect(retry.body.data.order.status).toBe('pending');
      expect((await Product.findById(product.id)).stock).toBe(2);
      expect(await Order.countDocuments()).toBe(1);
    } finally {
      providerSpy.mockRestore();
    }
  });

  it('converges concurrent checkout requests to one order, transaction, and payment URL', async () => {
    const product = await Product.create({
      name: 'Concurrent Payment Phone',
      slug: 'concurrent-payment-phone',
      categoryId: 'category-test',
      brandId: 'brand-test',
      price: 3000000,
      stock: 3,
      status: 'active',
    });
    const payload = {
      items: [{ id: product.id, type: 'product', quantity: 1 }],
      customer,
      paymentMethod: 'card',
    };
    const post = () => checkoutRequest()
      .set('Idempotency-Key', 'checkout-concurrent-payment')
      .send(payload);

    const [first, second] = await Promise.all([post(), post()]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data.order.id).toBe(first.body.data.order.id);
    expect(second.body.data.transaction.id).toBe(first.body.data.transaction.id);
    expect(second.body.data.paymentUrl).toBe(first.body.data.paymentUrl);
    expect(await Order.countDocuments()).toBe(1);
    expect(await PaymentTransaction.countDocuments()).toBe(1);
    expect((await Product.findById(product.id)).stock).toBe(2);
    const activeKeyIndex = (await PaymentTransaction.collection.indexes())
      .find((index) => index.key?.activeIdempotencyKey === 1);
    expect(activeKeyIndex).toEqual(expect.objectContaining({ unique: true, sparse: true }));
  });

  it('rejects reusing an idempotency key with a different payment intent', async () => {
    const product = await Product.create({
      name: 'Payment Intent Phone',
      slug: 'payment-intent-phone',
      categoryId: 'category-test',
      brandId: 'brand-test',
      price: 3200000,
      stock: 4,
      status: 'active',
    });
    const basePayload = {
      items: [{ id: product.id, type: 'product', quantity: 1 }],
      customer,
    };

    const codFirst = await orderRequest()
      .set('Idempotency-Key', 'cod-then-vnpay')
      .send({ ...basePayload, paymentMethod: 'cod' })
      .expect(201);
    await checkoutRequest()
      .set('Idempotency-Key', 'cod-then-vnpay')
      .send({ ...basePayload, paymentMethod: 'card' })
      .expect(409);

    expect(await PaymentTransaction.countDocuments()).toBe(0);
    expect((await Order.findById(codFirst.body.data.id)).paymentMethod).toBe('cod');

    const vnpayFirst = await checkoutRequest()
      .set('Idempotency-Key', 'vnpay-then-cod')
      .send({ ...basePayload, paymentMethod: 'card' })
      .expect(201);
    await orderRequest()
      .set('Idempotency-Key', 'vnpay-then-cod')
      .send({ ...basePayload, paymentMethod: 'cod' })
      .expect(409);

    expect((await Order.findById(vnpayFirst.body.data.order.id)).paymentMethod).toBe('card');
    expect(await Order.countDocuments()).toBe(2);
    expect(await PaymentTransaction.countDocuments()).toBe(1);
    expect((await Product.findById(product.id)).stock).toBe(2);
  });

  it('issues one fresh attempt when concurrent retries follow a failed transaction', async () => {
    const product = await Product.create({
      name: 'Failed Retry Phone',
      slug: 'failed-retry-phone',
      categoryId: 'category-test',
      brandId: 'brand-test',
      price: 4000000,
      stock: 3,
      status: 'active',
    });
    const payload = {
      items: [{ id: product.id, type: 'product', quantity: 1 }],
      customer,
      paymentMethod: 'card',
    };
    const post = () => checkoutRequest()
      .set('Idempotency-Key', 'checkout-failed-retry')
      .send(payload);
    const initial = await post().expect(201);
    await PaymentTransaction.updateOne(
      { _id: initial.body.data.transaction.id },
      { $set: { status: 'failed' }, $unset: { activeIdempotencyKey: 1 } },
    );

    const [firstRetry, secondRetry] = await Promise.all([post(), post()]);

    expect(firstRetry.status).toBe(201);
    expect(secondRetry.status).toBe(201);
    expect(firstRetry.body.data.order.id).toBe(initial.body.data.order.id);
    expect(firstRetry.body.data.transaction.id).not.toBe(initial.body.data.transaction.id);
    expect(secondRetry.body.data.transaction.id).toBe(firstRetry.body.data.transaction.id);
    expect(secondRetry.body.data.paymentUrl).toBe(firstRetry.body.data.paymentUrl);
    expect(await PaymentTransaction.countDocuments({ status: 'pending' })).toBe(1);
    expect(await PaymentTransaction.countDocuments({ status: 'failed' })).toBe(1);
    expect((await Product.findById(product.id)).stock).toBe(2);
  });

  it('expires a stale URL and issues a fresh attempt on the same order', async () => {
    const product = await Product.create({
      name: 'Expired Retry Phone',
      slug: 'expired-retry-phone',
      categoryId: 'category-test',
      brandId: 'brand-test',
      price: 5000000,
      stock: 3,
      status: 'active',
    });
    const payload = {
      items: [{ id: product.id, type: 'product', quantity: 1 }],
      customer,
      paymentMethod: 'card',
    };
    const post = () => checkoutRequest()
      .set('Idempotency-Key', 'checkout-expired-retry')
      .send(payload);
    const initial = await post().expect(201);
    await PaymentTransaction.collection.updateOne(
      { _id: initial.body.data.transaction.id },
      { $set: { createdAt: new Date(Date.now() - 20 * 60 * 1000) } },
    );

    const retry = await post().expect(201);

    expect(retry.body.data.order.id).toBe(initial.body.data.order.id);
    expect(retry.body.data.transaction.id).not.toBe(initial.body.data.transaction.id);
    expect(
      (await PaymentTransaction.findById(initial.body.data.transaction.id)).status,
    ).toBe('expired');
    expect(await PaymentTransaction.countDocuments({ status: 'pending' })).toBe(1);
    expect((await Product.findById(product.id)).stock).toBe(2);
  });

  it('does not let a late failed callback overwrite a fresh pending attempt', async () => {
    const product = await Product.create({
      name: 'Late Failure Phone',
      slug: 'late-failure-phone',
      categoryId: 'category-test',
      brandId: 'brand-test',
      price: 5500000,
      stock: 3,
      status: 'active',
    });
    const payload = {
      items: [{ id: product.id, type: 'product', quantity: 1 }],
      customer,
      paymentMethod: 'card',
    };
    const post = () => checkoutRequest()
      .set('Idempotency-Key', 'checkout-late-failure')
      .send(payload);
    const initial = await post().expect(201);
    await PaymentTransaction.collection.updateOne(
      { _id: initial.body.data.transaction.id },
      { $set: { createdAt: new Date(Date.now() - 20 * 60 * 1000) } },
    );
    const retry = await post().expect(201);
    const failedQuery = {
      vnp_Amount: String(initial.body.data.transaction.amount * 100),
      vnp_ResponseCode: '24',
      vnp_TransactionStatus: '02',
      vnp_TxnRef: initial.body.data.transaction.reference,
    };
    failedQuery.vnp_SecureHash = signParams(failedQuery, env.vnpay.hashSecret);

    await request(app).get('/api/payments/vnpay/ipn').query(failedQuery).expect(200);

    const order = await Order.findById(initial.body.data.order.id);
    expect(order.paymentStatus).toBe('pending');
    expect((await PaymentTransaction.findById(retry.body.data.transaction.id)).status)
      .toBe('pending');
  });

  it('closes replacement attempts after a late success and prevents another payment', async () => {
    const product = await Product.create({
      name: 'Late Success Phone',
      slug: 'late-success-phone',
      categoryId: 'category-test',
      brandId: 'brand-test',
      price: 6000000,
      stock: 3,
      status: 'active',
    });
    const payload = {
      items: [{ id: product.id, type: 'product', quantity: 1 }],
      customer,
      paymentMethod: 'card',
    };
    const post = () => checkoutRequest()
      .set('Idempotency-Key', 'checkout-late-success')
      .send(payload);
    const initial = await post().expect(201);
    await PaymentTransaction.collection.updateOne(
      { _id: initial.body.data.transaction.id },
      { $set: { createdAt: new Date(Date.now() - 20 * 60 * 1000) } },
    );
    const retry = await post().expect(201);
    const paidQuery = {
      vnp_Amount: String(initial.body.data.transaction.amount * 100),
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_TxnRef: initial.body.data.transaction.reference,
    };
    paidQuery.vnp_SecureHash = signParams(paidQuery, env.vnpay.hashSecret);

    await request(app).get('/api/payments/vnpay/ipn').query(paidQuery).expect(200);

    expect((await Order.findById(initial.body.data.order.id)).paymentStatus).toBe('paid');
    expect((await PaymentTransaction.findById(retry.body.data.transaction.id)).status)
      .toBe('expired');
    await post().expect(409);
    expect(await PaymentTransaction.countDocuments()).toBe(2);
  });

  it('keeps a concurrently cancelled and restocked order cancelled when a paid IPN arrives', async () => {
    await createUser({ email: 'cancel-race@test.com', phone: '0908181818' });
    const token = await login('cancel-race@test.com');
    const product = await Product.create({
      name: 'Cancel Race Phone',
      slug: 'cancel-race-phone',
      categoryId: 'category-test',
      brandId: 'brand-test',
      price: 6100000,
      stock: 3,
      status: 'active',
    });
    const checkout = await checkoutRequest()
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'cancel-paid-race')
      .send({
        items: [{ id: product.id, type: 'product', quantity: 1 }],
        customer: {
          ...customer,
          email: 'cancel-race@test.com',
          phone: '0908181818',
        },
        paymentMethod: 'card',
      })
      .expect(201);
    const transaction = checkout.body.data.transaction;
    const paidQuery = {
      vnp_Amount: String(transaction.amount * 100),
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_TxnRef: transaction.reference,
    };
    paidQuery.vnp_SecureHash = signParams(paidQuery, env.vnpay.hashSecret);

    const restore = Product.updateOne;
    let releaseRestore;
    let restoreReached;
    const restoreGate = new Promise((resolve) => { releaseRestore = resolve; });
    const reached = new Promise((resolve) => { restoreReached = resolve; });
    const restoreSpy = jest.spyOn(Product, 'updateOne').mockImplementationOnce(
      async function pausedRestore(...args) {
        restoreReached();
        await restoreGate;
        return restore.apply(this, args);
      },
    );

    try {
      const cancelPromise = request(app)
        .put(`/api/orders/${checkout.body.data.order.id}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .then((response) => response);
      await reached;
      const ipnPromise = request(app)
        .get('/api/payments/vnpay/ipn')
        .query(paidQuery)
        .then((response) => response);
      await new Promise((resolve) => setImmediate(resolve));
      releaseRestore();

      const [cancelled, ipn] = await Promise.all([cancelPromise, ipnPromise]);
      expect(cancelled.status).toBe(200);
      expect(ipn.status).toBe(200);
    } finally {
      releaseRestore();
      restoreSpy.mockRestore();
    }

    const order = await Order.findById(checkout.body.data.order.id);
    expect(order.status).toBe('cancelled');
    expect(order.paymentStatus).toBe('refund_required');
    expect((await Product.findById(product.id)).stock).toBe(3);
    expect((await PaymentTransaction.findById(transaction.id)).status).toBe('paid');
  });

  it('rejects cancellation after payment commits without restocking the order', async () => {
    await createUser({ email: 'paid-first@test.com', phone: '0908282828' });
    const token = await login('paid-first@test.com');
    const product = await Product.create({
      name: 'Paid First Phone',
      slug: 'paid-first-phone',
      categoryId: 'category-test',
      brandId: 'brand-test',
      price: 6200000,
      stock: 3,
      status: 'active',
    });
    const checkout = await checkoutRequest()
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'paid-before-cancel')
      .send({
        items: [{ id: product.id, type: 'product', quantity: 1 }],
        customer: {
          ...customer,
          email: 'paid-first@test.com',
          phone: '0908282828',
        },
        paymentMethod: 'card',
      })
      .expect(201);
    const transaction = checkout.body.data.transaction;
    const paidQuery = {
      vnp_Amount: String(transaction.amount * 100),
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_TxnRef: transaction.reference,
    };
    paidQuery.vnp_SecureHash = signParams(paidQuery, env.vnpay.hashSecret);

    await request(app).get('/api/payments/vnpay/ipn').query(paidQuery).expect(200);
    await request(app)
      .put(`/api/orders/${checkout.body.data.order.id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    const order = await Order.findById(checkout.body.data.order.id);
    expect(order.status).toBe('confirmed');
    expect(order.paymentStatus).toBe('paid');
    expect((await Product.findById(product.id)).stock).toBe(2);
  });

  it('does not expose a replacement URL when payment commits during attempt creation', async () => {
    const product = await Product.create({
      name: 'Replacement Payment Race Phone',
      slug: 'replacement-payment-race-phone',
      categoryId: 'category-test',
      brandId: 'brand-test',
      price: 6300000,
      stock: 3,
      status: 'active',
    });
    const payload = {
      items: [{ id: product.id, type: 'product', quantity: 1 }],
      customer,
      paymentMethod: 'card',
    };
    const post = () => checkoutRequest()
      .set('Idempotency-Key', 'replacement-paid-race')
      .send(payload);
    const initial = await post().expect(201);
    await PaymentTransaction.updateOne(
      { _id: initial.body.data.transaction.id },
      { $set: { status: 'failed' }, $unset: { activeIdempotencyKey: 1 } },
    );
    const paidQuery = {
      vnp_Amount: String(initial.body.data.transaction.amount * 100),
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_TxnRef: initial.body.data.transaction.reference,
    };
    paidQuery.vnp_SecureHash = signParams(paidQuery, env.vnpay.hashSecret);

    const create = paymentTransactionRepository.create.bind(paymentTransactionRepository);
    let releaseCreate;
    let createReached;
    const createGate = new Promise((resolve) => { releaseCreate = resolve; });
    const reached = new Promise((resolve) => { createReached = resolve; });
    const createSpy = jest
      .spyOn(paymentTransactionRepository, 'create')
      .mockImplementationOnce(async (...args) => {
        createReached();
        await createGate;
        return create(...args);
      });

    try {
      const retryPromise = post().then((response) => response);
      await reached;
      await request(app).get('/api/payments/vnpay/ipn').query(paidQuery).expect(200);
      releaseCreate();
      const retry = await retryPromise;
      expect(retry.status).toBe(409);
    } finally {
      releaseCreate();
      createSpy.mockRestore();
    }

    const order = await Order.findById(initial.body.data.order.id);
    expect(order.paymentStatus).toBe('paid');
    expect(order.status).toBe('confirmed');
    expect(await PaymentTransaction.countDocuments()).toBe(1);
    expect(await PaymentTransaction.countDocuments({ status: 'pending' })).toBe(0);
  });

  it('issues and verifies a short-lived result proof for a signed VNPay return', async () => {
    const query = {
      vnp_ResponseCode: '00',
      vnp_TxnRef: 'SIGNED-RETURN-01',
    };
    query.vnp_SecureHash = signParams(query, env.vnpay.hashSecret);

    const returned = await request(app)
      .get('/api/payments/vnpay/return')
      .query(query)
      .expect(302);
    const redirect = new URL(returned.headers.location);
    const proof = redirect.searchParams.get('proof');

    expect(proof).toBeTruthy();
    expect(redirect.searchParams.has('valid')).toBe(false);

    const verified = await request(app)
      .post('/api/payments/vnpay/result')
      .send({ proof })
      .expect(200);
    expect(verified.body.data).toEqual({
      valid: true,
      reference: 'SIGNED-RETURN-01',
      code: '00',
    });

    await request(app)
      .post('/api/payments/vnpay/result')
      .send({ proof: `${proof}tampered` })
      .expect(400);
  });

  it('rejects a callback with an invalid signature', async () => {
    const response = await request(app)
      .get('/api/payments/vnpay/ipn')
      .query({ vnp_TxnRef: 'missing', vnp_SecureHash: 'invalid' })
      .expect(200);

    expect(response.body).toEqual({ RspCode: '97', Message: 'Chữ ký không hợp lệ' });
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
    const shipping = await seedOrder({ paymentMethod: 'momo', paymentStatus: 'failed', status: 'shipping' });
    const completed = await seedOrder({ paymentStatus: 'failed', status: 'completed' });

    const shippingResponse = await reconcile(shipping.id, {
      status: 'paid',
      reference: 'MOMO-PAID-LATE',
      note: 'Late MoMo confirmation',
    }).expect(200);
    const completedResponse = await reconcile(completed.id, {
      status: 'paid',
      reference: 'BANK-COMPLETED-LATE',
    }).expect(200);

    expect(shippingResponse.body.data).toMatchObject({ paymentStatus: 'paid', status: 'shipping' });
    expect(completedResponse.body.data).toMatchObject({ paymentStatus: 'paid', status: 'completed' });
  });

  it('records a failed reconciliation without confirming the order', async () => {
    const order = await seedOrder({ paymentMethod: 'momo' });

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

  it('rejects nonexistent, card, COD, and finalized manual payments', async () => {
    const card = await seedOrder({ paymentMethod: 'card' });
    const cod = await seedOrder({ paymentMethod: 'cod' });
    const finalized = await seedOrder({ paymentStatus: 'refund_required' });

    await reconcile('missing-order', { status: 'failed', note: 'Missing' }).expect(404);
    await reconcile(card.id, { status: 'paid', reference: 'CARD-01' }).expect(409);
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

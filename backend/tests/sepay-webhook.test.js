const request = require('supertest');
const { app } = require('./helpers');
const env = require('../src/config/env');
const Order = require('../src/models/Order');
const PaymentTransaction = require('../src/models/PaymentTransaction');

const API_KEY = 'sepay-test-key';

const createBankOrder = (overrides = {}) => Order.create({
  orderNumber: 'TP2610200001',
  subtotal: 5000000,
  total: 5020000,
  paymentMethod: 'bank',
  customer: {
    fullName: 'Nguyen Van A',
    email: 'a@example.com',
    phone: '0912345678',
    address: '1 Nguyen Hue',
  },
  ...overrides,
});

const webhookPayload = (overrides = {}) => ({
  id: 92704,
  gateway: 'Vietcombank',
  transactionDate: '2026-10-20 14:02:37',
  accountNumber: '0123499999',
  code: null,
  content: 'TP2610200001 0912345678 chuyen tien',
  transferType: 'in',
  transferAmount: 5020000,
  accumulated: 19077000,
  referenceCode: 'MBVCB.3278907687',
  description: '',
  ...overrides,
});

const sendWebhook = (payload, authorization = `Apikey ${API_KEY}`) => request(app)
  .post('/api/payments/sepay/webhook')
  .set('Authorization', authorization)
  .send(payload);

describe('SePay bank-transfer webhook', () => {
  const originalKey = env.sepay.webhookApiKey;

  beforeEach(() => {
    env.sepay.webhookApiKey = API_KEY;
  });

  afterAll(() => {
    env.sepay.webhookApiKey = originalKey;
  });

  it('rejects requests without the configured API key', async () => {
    await createBankOrder();

    await sendWebhook(webhookPayload(), 'Apikey wrong-key').expect(401);
    await sendWebhook(webhookPayload(), '').expect(401);

    const order = await Order.findOne({ orderNumber: 'TP2610200001' });
    expect(order.paymentStatus).toBe('pending');
  });

  it('returns 503 when SePay is not configured', async () => {
    env.sepay.webhookApiKey = '';
    await sendWebhook(webhookPayload()).expect(503);
  });

  it('marks the matching bank order as paid and confirmed', async () => {
    await createBankOrder();

    const response = await sendWebhook(webhookPayload()).expect(200);

    expect(response.body).toMatchObject({
      success: true,
      matched: true,
      orderNumber: 'TP2610200001',
      paymentStatus: 'paid',
    });
    const order = await Order.findOne({ orderNumber: 'TP2610200001' });
    expect(order.paymentStatus).toBe('paid');
    expect(order.status).toBe('confirmed');
    expect(order.paymentReference).toBe('SEPAY-92704');
    const transaction = await PaymentTransaction.findOne({ reference: 'SEPAY-92704' });
    expect(transaction).toMatchObject({ provider: 'sepay', method: 'bank', status: 'paid', amount: 5020000 });
  });

  it('is idempotent when SePay retries the same transaction', async () => {
    await createBankOrder();

    await sendWebhook(webhookPayload()).expect(200);
    const retry = await sendWebhook(webhookPayload()).expect(200);

    expect(retry.body.duplicate).toBe(true);
    expect(await PaymentTransaction.countDocuments({ reference: 'SEPAY-92704' })).toBe(1);
  });

  it('keeps the order pending when the transfer is short', async () => {
    await createBankOrder();

    const response = await sendWebhook(webhookPayload({ transferAmount: 1000000 })).expect(200);

    expect(response.body.underpaid).toBe(true);
    const order = await Order.findOne({ orderNumber: 'TP2610200001' });
    expect(order.paymentStatus).toBe('pending');
    expect(order.status).toBe('pending');
    const transaction = await PaymentTransaction.findOne({ reference: 'SEPAY-92704' });
    expect(transaction.status).toBe('failed');
  });

  it('confirms the order once several short transfers add up to the total', async () => {
    await createBankOrder();

    const first = await sendWebhook(webhookPayload({ id: 1, transferAmount: 2000000 })).expect(200);
    expect(first.body.underpaid).toBe(true);
    const second = await sendWebhook(webhookPayload({ id: 2, transferAmount: 3020000 })).expect(200);
    expect(second.body.paymentStatus).toBe('paid');

    const order = await Order.findOne({ orderNumber: 'TP2610200001' });
    expect(order).toMatchObject({ paymentStatus: 'paid', status: 'confirmed', paymentReference: 'SEPAY-2' });
    expect(order.paymentAudit.note).toContain('đã nhận đủ qua 2 lần chuyển');
  });

  it('flags money received after the order was already paid for a refund', async () => {
    await createBankOrder();
    await sendWebhook(webhookPayload({ id: 10 })).expect(200);

    const response = await sendWebhook(webhookPayload({ id: 11 })).expect(200);

    expect(response.body).toMatchObject({ duplicate: true, overpaid: true });
    const order = await Order.findOne({ orderNumber: 'TP2610200001' });
    expect(order.paymentStatus).toBe('paid');
    expect(order.paymentAudit.note).toContain('Nhận thêm 5.020.000đ (SEPAY-11)');
    expect(order.paymentAudit.note).toContain('cần hoàn cho khách');
    const extra = await PaymentTransaction.findOne({ reference: 'SEPAY-11' });
    expect(extra).toMatchObject({ status: 'failed', responseCode: 'OVERPAID' });
  });

  it('reads order numbers with a 5-digit daily sequence and glued transfer content', async () => {
    await createBankOrder({ orderNumber: 'TP2610201000' });
    await createBankOrder({ orderNumber: 'TP26102010000' });

    await sendWebhook(webhookPayload({ content: 'thanhtoanTP26102010000 chuyen tien' })).expect(200);

    expect((await Order.findOne({ orderNumber: 'TP26102010000' })).paymentStatus).toBe('paid');
    expect((await Order.findOne({ orderNumber: 'TP2610201000' })).paymentStatus).toBe('pending');
  });

  it('flags a refund when a cancelled order is paid', async () => {
    await createBankOrder({ status: 'cancelled' });

    await sendWebhook(webhookPayload()).expect(200);

    const order = await Order.findOne({ orderNumber: 'TP2610200001' });
    expect(order.status).toBe('cancelled');
    expect(order.paymentStatus).toBe('refund_required');
  });

  it('ignores outgoing transfers and unmatched content', async () => {
    await createBankOrder();

    const outgoing = await sendWebhook(webhookPayload({ transferType: 'out' })).expect(200);
    const unmatched = await sendWebhook(webhookPayload({ id: 1, content: 'tien an trua' })).expect(200);
    const cod = await sendWebhook(webhookPayload({ id: 2, content: 'TP2610209999' })).expect(200);

    expect(outgoing.body).toMatchObject({ matched: false, reason: 'not_incoming' });
    expect(unmatched.body).toMatchObject({ matched: false, reason: 'order_number_missing' });
    expect(cod.body).toMatchObject({ matched: false, reason: 'order_not_found' });
    expect(await PaymentTransaction.countDocuments()).toBe(0);
  });

  it('rejects malformed payloads', async () => {
    await sendWebhook({ transferType: 'in', content: 'TP2610200001' }).expect(400);
  });

  it('advertises auto confirmation in the public payment config', async () => {
    Object.assign(env.bank, {
      name: 'Test Bank', bin: '970436', accountNumber: '123', accountName: 'TEST',
    });
    try {
      const response = await request(app).get('/api/payments/config').expect(200);
      expect(response.body.data.providers.bank.autoConfirm).toBe(true);
      expect(JSON.stringify(response.body.data)).not.toContain(API_KEY);
    } finally {
      Object.assign(env.bank, { name: '', bin: '', accountNumber: '', accountName: '' });
    }
  });
});

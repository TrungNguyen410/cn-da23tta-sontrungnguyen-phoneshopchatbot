jest.mock('../src/services/aiProviders/geminiProvider', () => ({
  generate: jest.fn(),
  isConfigured: jest.fn(() => false),
}));

const request = require('supertest');
const { app, createUser, login } = require('./helpers');
const geminiProvider = require('../src/services/aiProviders/geminiProvider');
const Accessory = require('../src/models/Accessory');
const Brand = require('../src/models/Brand');
const Category = require('../src/models/Category');
const ChatMessage = require('../src/models/ChatMessage');
const ChatSession = require('../src/models/ChatSession');
const KnowledgeArticle = require('../src/models/KnowledgeArticle');
const Order = require('../src/models/Order');
const Product = require('../src/models/Product');
const Voucher = require('../src/models/Voucher');
const { parseBudget } = require('../src/services/chatService');

const VISITOR = 'visitor-test-0001';

const product = (id, name, brandId, price, extra = {}) => ({
  _id: id,
  name,
  brandId,
  categoryId: 'cat-phone',
  price,
  oldPrice: price + 2000000,
  ram: '8GB',
  storage: '256GB',
  chip: 'Snapdragon 8 Gen 3',
  battery: '5000 mAh',
  camera: '50MP',
  stock: 5,
  sold: 10,
  status: 'active',
  ...extra,
});

const seedCatalog = async () => {
  await Brand.insertMany([
    { _id: 'brand-apple', name: 'Apple', slug: 'apple' },
    { _id: 'brand-samsung', name: 'Samsung', slug: 'samsung' },
    { _id: 'brand-xiaomi', name: 'Xiaomi', slug: 'xiaomi' },
  ]);
  await Category.insertMany([
    { _id: 'cat-phone', name: 'Điện thoại', slug: 'dien-thoai' },
    { _id: 'cat-charger', name: 'Sạc', slug: 'sac' },
  ]);
  await Product.insertMany([
    product('p-iphone', 'iPhone 16 Pro Max', 'brand-apple', 33990000, { sold: 90 }),
    product('p-s25', 'Galaxy S25 Ultra', 'brand-samsung', 30990000, { sold: 80 }),
    product('p-redmi', 'Redmi Note 14', 'brand-xiaomi', 6990000, { sold: 120 }),
    product('p-a56', 'Galaxy A56', 'brand-samsung', 9490000, { sold: 60 }),
    product('p-hidden', 'Galaxy Hidden', 'brand-samsung', 5000000, { status: 'inactive' }),
  ]);
  await Accessory.create({
    _id: 'acc-charger',
    name: 'Anker GaN Charger 65W',
    brandId: 'brand-apple',
    categoryId: 'cat-charger',
    price: 1090000,
    stock: 10,
  });
  await KnowledgeArticle.create({
    title: 'Chính sách bảo hành',
    category: 'warranty',
    keywords: ['bảo hành', 'bao hanh'],
    content: 'Điện thoại được bảo hành chính hãng 12 tháng, lỗi trong 30 ngày đổi máy mới.',
  });
};

const send = (body, token) => {
  const req = request(app).post('/api/chat/messages');
  if (token) req.set('Authorization', `Bearer ${token}`);
  return req.send(body);
};

describe('AI chatbot', () => {
  beforeEach(async () => {
    geminiProvider.isConfigured.mockReturnValue(false);
    geminiProvider.generate.mockReset();
    await seedCatalog();
  });

  describe('offline mode (no GEMINI_API_KEY)', () => {
    it('parses Vietnamese budgets', () => {
      expect(parseBudget('duoi 10 trieu')).toEqual({ maxPrice: 10000000 });
      expect(parseBudget('tren 20tr')).toEqual({ minPrice: 20000000 });
      expect(parseBudget('tam 7 trieu')).toEqual({ minPrice: 5600000, maxPrice: 8050000 });
      expect(parseBudget('may nao tot')).toEqual({});
    });

    it('recommends in-budget phones with product cards and stores the session', async () => {
      const response = await send({ message: 'Tư vấn điện thoại dưới 10 triệu', visitorId: VISITOR }).expect(201);

      const { sessionId, message } = response.body.data;
      expect(message.role).toBe('assistant');
      expect(message.source).toBe('offline');
      expect(message.content).toContain('Redmi Note 14');
      expect(message.content).not.toContain('iPhone 16 Pro Max');
      expect(message.products.map((item) => item.id)).toEqual(expect.arrayContaining(['p-redmi', 'p-a56']));
      expect(message.products.map((item) => item.id)).not.toContain('p-hidden');
      expect(message.toolCalls[0]).toMatchObject({ name: 'search_products', ok: true });

      const session = await ChatSession.findById(sessionId);
      expect(session).toMatchObject({ visitorId: VISITOR, messageCount: 2, title: 'Tư vấn điện thoại dưới 10 triệu' });
      expect(await ChatMessage.countDocuments({ sessionId })).toBe(2);
    });

    it('filters by brand alias', async () => {
      const response = await send({ message: 'Có iphone nào không', visitorId: VISITOR }).expect(201);
      expect(response.body.data.message.products.map((item) => item.id)).toEqual(['p-iphone']);
    });

    it('answers policy questions from the knowledge base', async () => {
      const response = await send({ message: 'Chính sách bảo hành thế nào?', visitorId: VISITOR }).expect(201);
      expect(response.body.data.message.content).toContain('12 tháng');
      expect(response.body.data.message.toolCalls[0].name).toBe('search_store_policies');
    });

    it('lists active promotions', async () => {
      await Voucher.create({
        code: 'TECH10', type: 'percent', value: 10, minOrder: 5000000,
        startDate: new Date(Date.now() - 86400000), endDate: new Date(Date.now() + 86400000 * 10),
      });
      const response = await send({ message: 'Có mã giảm giá nào không', visitorId: VISITOR }).expect(201);
      expect(response.body.data.message.content).toContain('TECH10');
    });

    it('finds accessories by Vietnamese category name', async () => {
      const response = await send({ message: 'Tìm cục sạc nhanh', visitorId: VISITOR }).expect(201);
      expect(response.body.data.message.products[0]).toMatchObject({ id: 'acc-charger', type: 'accessory', url: '/accessories/acc-charger' });
    });

    it('asks for missing order details and looks up a matching order', async () => {
      await Order.create({
        orderNumber: 'TP2610200007',
        subtotal: 6990000,
        total: 7010000,
        status: 'shipping',
        items: [{ name: 'Redmi Note 14', price: 6990000, quantity: 1 }],
        customer: { fullName: 'Le Van B', email: 'b@example.com', phone: '0912345678', address: 'HCM' },
      });

      const missing = await send({ message: 'Kiểm tra đơn hàng giúp mình', visitorId: VISITOR }).expect(201);
      expect(missing.body.data.message.content).toContain('mã đơn');

      const found = await send({ message: 'Đơn TP2610200007 sđt 0912345678', visitorId: VISITOR }).expect(201);
      expect(found.body.data.message.content).toContain('Đang giao hàng');

      const wrongPhone = await send({ message: 'Đơn TP2610200007 sđt 0999999999', visitorId: VISITOR }).expect(201);
      expect(wrongPhone.body.data.message.content).toContain('không tìm thấy');
    });
  });

  describe('Gemini mode', () => {
    beforeEach(() => {
      geminiProvider.isConfigured.mockReturnValue(true);
    });

    it('runs function calls against real data and returns the model answer', async () => {
      geminiProvider.generate
        .mockResolvedValueOnce({
          content: {
            role: 'model',
            parts: [{ functionCall: { name: 'search_products', args: { brand: 'Samsung', maxPrice: 15000000 } } }],
          },
        })
        .mockResolvedValueOnce({
          content: { role: 'model', parts: [{ text: 'Bạn có thể chọn **Galaxy A56** giá 9.490.000đ.' }] },
        });

      const response = await send({ message: 'Samsung dưới 15 triệu', visitorId: VISITOR }).expect(201);

      const { message } = response.body.data;
      expect(message.source).toBe('gemini');
      expect(message.content).toContain('Galaxy A56');
      expect(message.toolCalls).toEqual([
        expect.objectContaining({ name: 'search_products', ok: true }),
      ]);
      expect(message.products.map((item) => item.id)).toEqual(['p-a56']);

      const secondCall = geminiProvider.generate.mock.calls[1][0];
      const toolTurn = secondCall.contents.at(-1);
      expect(toolTurn.parts[0].functionResponse.name).toBe('search_products');
      expect(toolTurn.parts[0].functionResponse.response.products[0].name).toBe('Galaxy A56');
      expect(secondCall.systemInstruction).toContain('Tuyệt đối không tự bịa giá');
      expect(secondCall.tools.map((tool) => tool.name)).toContain('lookup_order');
    });

    it('sends previous turns as conversation history', async () => {
      geminiProvider.generate.mockResolvedValue({ content: { role: 'model', parts: [{ text: 'Chào bạn!' }] } });

      const first = await send({ message: 'Xin chào', visitorId: VISITOR }).expect(201);
      await send({ message: 'Bạn là ai?', sessionId: first.body.data.sessionId, visitorId: VISITOR }).expect(201);

      const { contents } = geminiProvider.generate.mock.calls[1][0];
      expect(contents.map((item) => item.role)).toEqual(['user', 'model', 'user']);
      expect(contents[0].parts[0].text).toBe('Xin chào');
    });

    it('falls back to offline answers when Gemini fails', async () => {
      geminiProvider.generate.mockRejectedValue(new Error('quota exceeded'));

      const response = await send({ message: 'điện thoại dưới 10 triệu', visitorId: VISITOR }).expect(201);

      expect(response.body.data.message.source).toBe('fallback');
      expect(response.body.data.message.products.length).toBeGreaterThan(0);
    });
  });

  describe('sessions, feedback and validation', () => {
    it('requires a message and a visitor id for guests', async () => {
      await send({ message: '', visitorId: VISITOR }).expect(422);
      await send({ message: 'x'.repeat(1001), visitorId: VISITOR }).expect(422);
      await send({ message: 'Xin chào' }).expect(422);
      await send({ message: 'Xin chào', visitorId: 'bad id!' }).expect(422);
    });

    it('only lets the owner read a session and rate replies', async () => {
      const created = await send({ message: 'Xin chào', visitorId: VISITOR }).expect(201);
      const { sessionId, message } = created.body.data;

      const own = await request(app).get(`/api/chat/sessions/${sessionId}`).query({ visitorId: VISITOR }).expect(200);
      expect(own.body.data.messages).toHaveLength(2);
      await request(app).get(`/api/chat/sessions/${sessionId}`).query({ visitorId: 'someone-else-01' }).expect(404);
      await send({ message: 'hi', sessionId, visitorId: 'someone-else-01' }).expect(404);

      await request(app).post(`/api/chat/messages/${message.id}/feedback`).send({ value: 'up', visitorId: 'someone-else-01' }).expect(404);
      const rated = await request(app).post(`/api/chat/messages/${message.id}/feedback`).send({ value: 'up', visitorId: VISITOR }).expect(200);
      expect(rated.body.data.feedback).toBe('up');
    });

    it('links sessions to logged-in customers', async () => {
      const user = await createUser({ email: 'chat@test.com', phone: '0933333333' });
      const token = await login('chat@test.com');

      const response = await send({ message: 'Xin chào' }, token).expect(201);
      const session = await ChatSession.findById(response.body.data.sessionId);
      expect(session.userId).toBe(user.id);
      await request(app).get(`/api/chat/sessions/${session.id}`).set('Authorization', `Bearer ${token}`).expect(200);
      await request(app).get(`/api/chat/sessions/${session.id}`).query({ visitorId: VISITOR }).expect(404);
    });
  });

  describe('admin', () => {
    let adminToken;

    beforeEach(async () => {
      await createUser({ email: 'admin-chat@test.com', phone: '0944444444', role: 'admin' });
      adminToken = await login('admin-chat@test.com');
    });

    it('rejects non-admin access', async () => {
      await createUser({ email: 'customer-chat@test.com', phone: '0955555555' });
      const token = await login('customer-chat@test.com');
      await request(app).get('/api/admin/chat/stats').set('Authorization', `Bearer ${token}`).expect(403);
      await request(app).get('/api/admin/knowledge').expect(401);
    });

    it('reports sessions, transcripts and statistics', async () => {
      const created = await send({ message: 'Tư vấn điện thoại dưới 10 triệu', visitorId: VISITOR }).expect(201);
      await request(app)
        .post(`/api/chat/messages/${created.body.data.message.id}/feedback`)
        .send({ value: 'down', visitorId: VISITOR })
        .expect(200);

      const sessions = await request(app).get('/api/admin/chat/sessions').set('Authorization', `Bearer ${adminToken}`).expect(200);
      expect(sessions.body.data.total).toBe(1);
      expect(sessions.body.data.items[0].customerName).toBe('Khách vãng lai');

      const transcript = await request(app)
        .get(`/api/admin/chat/sessions/${created.body.data.sessionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(transcript.body.data.messages).toHaveLength(2);

      const stats = await request(app).get('/api/admin/chat/stats').set('Authorization', `Bearer ${adminToken}`).expect(200);
      expect(stats.body.data).toMatchObject({
        sessions: 1, answers: 1, disliked: 1, fallback: 1, aiEnabled: false,
      });
      expect(stats.body.data.tools[0]).toEqual({ name: 'search_products', count: 1 });
      expect(stats.body.data.recentQuestions[0].content).toBe('Tư vấn điện thoại dưới 10 triệu');
    });

    it('manages knowledge articles used by the chatbot', async () => {
      const created = await request(app)
        .post('/api/admin/knowledge')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Thu cũ đổi mới',
          category: 'faq',
          keywords: 'thu cũ, đổi mới, thu cu',
          content: 'Cửa hàng thu cũ đổi mới, trợ giá đến 2.000.000đ khi lên đời điện thoại.',
        })
        .expect(201);
      expect(created.body.data.keywords).toEqual(['thu cũ', 'đổi mới', 'thu cu']);

      await request(app)
        .put(`/api/admin/knowledge/${created.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ active: false })
        .expect(200);
      const list = await request(app).get('/api/admin/knowledge').set('Authorization', `Bearer ${adminToken}`).expect(200);
      expect(list.body.data).toHaveLength(2);

      await request(app).post('/api/admin/knowledge').set('Authorization', `Bearer ${adminToken}`).send({ title: 'x' }).expect(422);
      await request(app).delete(`/api/admin/knowledge/${created.body.data.id}`).set('Authorization', `Bearer ${adminToken}`).expect(200);
    });
  });
});

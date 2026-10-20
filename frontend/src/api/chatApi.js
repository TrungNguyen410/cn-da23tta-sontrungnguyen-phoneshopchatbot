import { USE_MOCK } from '../utils/constants';
import { mockDb } from '../mock/mockDb';
import { storage } from '../utils/storage';
import axiosClient from './axiosClient';

const MOCK_KNOWLEDGE_KEY = 'mock_knowledge';
const mockId = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// Minimal offline reply used only in VITE_USE_MOCK mode so the widget is demoable without a backend.
const mockReply = async (message) => {
  const text = message.toLowerCase();
  const budget = /(\d+)\s*(triệu|tr)/.exec(text);
  const maxPrice = budget ? Number(budget[1]) * 1000000 : Infinity;
  const products = (await mockDb.listPublicCatalog('products'))
    .filter((item) => item.price <= maxPrice)
    .sort((a, b) => (b.sold || 0) - (a.sold || 0))
    .slice(0, 3);
  const cards = products.map((item) => ({
    id: item.id,
    type: 'product',
    name: item.name,
    price: item.price,
    oldPrice: item.oldPrice || 0,
    image: item.image,
    url: `/products/${item.id}`,
    stock: item.stock,
  }));
  return {
    content: products.length
      ? `Chế độ demo (mock). Một số mẫu phù hợp:\n${products.map((item) => `- **${item.name}**: ${item.price.toLocaleString('vi-VN')}đ`).join('\n')}`
      : 'Chế độ demo (mock): chưa tìm thấy sản phẩm phù hợp.',
    products: cards,
  };
};

export const chatApi = {
  sendMessage: async ({ message, sessionId, visitorId }) => {
    if (!USE_MOCK) {
      // Gemini answers with tool calls can take longer than the default 10s client timeout.
      return axiosClient.post('/chat/messages', { message, sessionId, visitorId }, { timeout: 45000 });
    }
    const reply = await mockReply(message);
    return {
      sessionId: sessionId || mockId('chat'),
      message: {
        id: mockId('msg'),
        role: 'assistant',
        source: 'offline',
        createdAt: new Date().toISOString(),
        toolCalls: [],
        feedback: null,
        ...reply,
      },
    };
  },
  getSession: (sessionId, visitorId) =>
    USE_MOCK
      ? Promise.reject(Object.assign(new Error('Mock mode không lưu lịch sử chat'), { status: 404 }))
      : axiosClient.get(`/chat/sessions/${sessionId}`, { params: { visitorId } }),
  sendFeedback: (messageId, value, visitorId) =>
    USE_MOCK
      ? Promise.resolve({ id: messageId, feedback: value })
      : axiosClient.post(`/chat/messages/${messageId}/feedback`, { value, visitorId }),

  getStats: () =>
    USE_MOCK
      ? Promise.resolve({
          sessions: 0, sessionsToday: 0, answers: 0, liked: 0, disliked: 0, fallback: 0,
          avgLatencyMs: 0, tools: [], recentQuestions: [], aiEnabled: false,
        })
      : axiosClient.get('/admin/chat/stats'),
  getSessions: (params) =>
    USE_MOCK
      ? Promise.resolve({ items: [], total: 0, page: 1, limit: 20 })
      : axiosClient.get('/admin/chat/sessions', { params }),
  getSessionAdmin: (id) => axiosClient.get(`/admin/chat/sessions/${id}`),
};

export const knowledgeApi = {
  getAll: () => (USE_MOCK ? Promise.resolve(storage.get(MOCK_KNOWLEDGE_KEY, [])) : axiosClient.get('/admin/knowledge')),
  create: async (payload) => {
    if (!USE_MOCK) return axiosClient.post('/admin/knowledge', payload);
    const item = { ...payload, id: mockId('kb') };
    storage.set(MOCK_KNOWLEDGE_KEY, [item, ...storage.get(MOCK_KNOWLEDGE_KEY, [])]);
    return item;
  },
  update: async (id, payload) => {
    if (!USE_MOCK) return axiosClient.put(`/admin/knowledge/${id}`, payload);
    const items = storage.get(MOCK_KNOWLEDGE_KEY, []).map((item) => (item.id === id ? { ...item, ...payload } : item));
    storage.set(MOCK_KNOWLEDGE_KEY, items);
    return items.find((item) => item.id === id);
  },
  remove: async (id) => {
    if (!USE_MOCK) return axiosClient.delete(`/admin/knowledge/${id}`);
    storage.set(MOCK_KNOWLEDGE_KEY, storage.get(MOCK_KNOWLEDGE_KEY, []).filter((item) => item.id !== id));
    return { id, deleted: true };
  },
};

import { API_URL, STORAGE_KEYS, USE_MOCK } from '../utils/constants';
import { mockDb } from '../mock/mockDb';
import { storage } from '../utils/storage';
import axiosClient from './axiosClient';

const MOCK_KNOWLEDGE_KEY = 'mock_knowledge';
const MOCK_CONFIG_KEY = 'mock_chat_config';
const STREAM_TIMEOUT_MS = 60000;

export const DEFAULT_CHAT_CONFIG = {
  enabled: true,
  greeting: 'Xin chào! Mình là **trợ lý AI** của cửa hàng. Mình có thể:\n- Tư vấn chọn điện thoại theo ngân sách, nhu cầu\n- So sánh các mẫu máy\n- Tra cứu đơn hàng, khuyến mãi, chính sách\nBạn cần hỗ trợ gì ạ?',
  quickQuestions: [
    'Tư vấn điện thoại dưới 10 triệu',
    'So sánh iPhone 16 Pro Max và Galaxy S25 Ultra',
    'Chính sách bảo hành thế nào?',
    'Có mã giảm giá nào không?',
  ],
};

const streamError = (message, status) => Object.assign(new Error(message), { status, response: { status } });

// Reads the backend Server-Sent Events stream. Axios cannot stream response bodies
// in the browser, so this uses fetch and calls onEvent for every parsed event.
const readEventStream = async (payload, onEvent) => {
  const token = storage.get(STORAGE_KEYS.token);
  const response = await fetch(`${API_URL}/chat/messages/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout?.(STREAM_TIMEOUT_MS),
  });
  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => ({}));
    throw streamError(body.message || 'Trợ lý đang gặp sự cố', response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result = null;
  const handle = (block) => {
    const data = block.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('');
    if (!data) return;
    const event = JSON.parse(data);
    if (event.type === 'error') throw streamError(event.message, 500);
    if (event.type === 'done') result = { sessionId: event.sessionId, message: event.message };
    onEvent(event);
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      handle(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf('\n\n');
    }
  }
  if (buffer.trim()) handle(buffer);
  if (!result) throw streamError('Kết nối bị gián đoạn', 502);
  return result;
};
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
  streamMessage: async (payload, onEvent) => {
    if (!USE_MOCK) return readEventStream(payload, onEvent);
    const result = await chatApi.sendMessage(payload);
    onEvent({ type: 'session', sessionId: result.sessionId });
    for (const piece of result.message.content.match(/\S+\s*|\s+/g) || []) onEvent({ type: 'delta', text: piece });
    onEvent({ type: 'done', ...result });
    return result;
  },
  getConfig: async () => {
    if (USE_MOCK) return { ...DEFAULT_CHAT_CONFIG, ...storage.get(MOCK_CONFIG_KEY, {}) };
    return axiosClient.get('/chat/config');
  },
  updateConfig: async (payload) => {
    if (!USE_MOCK) return axiosClient.put('/admin/chat/config', payload);
    const next = { ...DEFAULT_CHAT_CONFIG, ...storage.get(MOCK_CONFIG_KEY, {}), ...payload };
    storage.set(MOCK_CONFIG_KEY, next);
    return next;
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

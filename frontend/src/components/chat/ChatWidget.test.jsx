import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chatApi } from '../../api/chatApi';
import { useCart } from '../../hooks/useCart';
import ChatWidget, { CHAT_STORAGE_KEYS } from './ChatWidget';

vi.mock('../../api/chatApi', () => ({
  DEFAULT_CHAT_CONFIG: {
    enabled: true,
    greeting: 'Xin chào! Mình là **trợ lý AI**.',
    quickQuestions: ['Tư vấn điện thoại dưới 10 triệu', 'Chính sách bảo hành thế nào?'],
  },
  chatApi: {
    sendMessage: vi.fn(),
    streamMessage: vi.fn(),
    getConfig: vi.fn(),
    getSession: vi.fn(),
    sendFeedback: vi.fn(),
  },
}));
vi.mock('../../hooks/useCart', () => ({ useCart: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const reply = {
  sessionId: 'session-1',
  message: {
    id: 'msg-1',
    role: 'assistant',
    source: 'gemini',
    content: 'Gợi ý cho bạn:\n- **Redmi Note 14**: 6.990.000đ',
    feedback: null,
    products: [{
      id: 'p-redmi', type: 'product', name: 'Redmi Note 14', price: 6990000, oldPrice: 7990000,
      image: 'redmi.png', url: '/products/p-redmi', stock: 3,
    }],
  },
};

const streamReply = async (_payload, onEvent) => {
  onEvent({ type: 'session', sessionId: reply.sessionId });
  onEvent({ type: 'delta', text: 'Gợi ý cho bạn:' });
  onEvent({ type: 'done', ...reply });
  return reply;
};

const renderWidget = () => render(<MemoryRouter><ChatWidget /></MemoryRouter>);
const openWidget = async () => fireEvent.click(await screen.findByRole('button', { name: 'Mở trợ lý AI tư vấn' }));

describe('ChatWidget', () => {
  let cart;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    cart = { addToCart: vi.fn() };
    useCart.mockReturnValue(cart);
    chatApi.getConfig.mockResolvedValue({
      enabled: true,
      greeting: 'Chào bạn, mình là **PhoneShop AI**!',
      quickQuestions: ['Máy nào pin trâu?', 'Có mã giảm giá nào không?'],
    });
    chatApi.streamMessage.mockImplementation(streamReply);
    chatApi.sendMessage.mockResolvedValue(reply);
    chatApi.sendFeedback.mockResolvedValue({});
  });
  afterEach(cleanup);

  it('uses the admin-configured greeting and quick questions', async () => {
    renderWidget();
    await openWidget();

    expect(screen.getByRole('dialog', { name: 'Trợ lý AI tư vấn' })).toBeInTheDocument();
    expect(await screen.findByText('PhoneShop AI')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Máy nào pin trâu?' })).toBeInTheDocument();
  });

  it('renders nothing when the chatbot is disabled', async () => {
    chatApi.getConfig.mockResolvedValue({ enabled: false, greeting: '', quickQuestions: [] });
    renderWidget();

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Mở trợ lý AI tư vấn' })).not.toBeInTheDocument());
  });

  it('streams the answer, then shows product cards with a persistent visitor id', async () => {
    let finish;
    chatApi.streamMessage.mockImplementation((_payload, onEvent) => new Promise((resolve) => {
      onEvent({ type: 'session', sessionId: 'session-1' });
      onEvent({ type: 'delta', text: 'Đang tìm ' });
      onEvent({ type: 'delta', text: 'máy phù hợp' });
      finish = () => resolve(reply);
    }));
    renderWidget();
    await openWidget();
    fireEvent.change(screen.getByRole('textbox', { name: 'Nội dung tin nhắn' }), { target: { value: 'Máy dưới 8 triệu' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));

    expect(await screen.findByText('Đang tìm máy phù hợp')).toBeInTheDocument();
    expect(screen.queryByLabelText('Trợ lý đang trả lời')).not.toBeInTheDocument();

    await act(async () => finish());
    expect(await screen.findByRole('link', { name: 'Redmi Note 14' })).toHaveAttribute('href', '/products/p-redmi');
    expect(screen.queryByText('Đang tìm máy phù hợp')).not.toBeInTheDocument();
    const payload = chatApi.streamMessage.mock.calls[0][0];
    expect(payload).toMatchObject({ message: 'Máy dưới 8 triệu', sessionId: null });
    expect(payload.visitorId).toMatch(/^v-/);
    expect(JSON.parse(localStorage.getItem(CHAT_STORAGE_KEYS.visitorId))).toBe(payload.visitorId);
    expect(JSON.parse(localStorage.getItem(CHAT_STORAGE_KEYS.sessionId))).toBe('session-1');
  });

  it('falls back to the JSON endpoint when streaming is unavailable', async () => {
    chatApi.streamMessage.mockRejectedValue(new Error('Failed to fetch'));
    renderWidget();
    await openWidget();
    fireEvent.click(screen.getByRole('button', { name: 'Máy nào pin trâu?' }));

    expect(await screen.findByRole('link', { name: 'Redmi Note 14' })).toBeInTheDocument();
    expect(chatApi.sendMessage).toHaveBeenCalledTimes(1);
  });

  it('adds suggested products to the cart and records feedback', async () => {
    renderWidget();
    await openWidget();
    fireEvent.click(screen.getByRole('button', { name: 'Có mã giảm giá nào không?' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Thêm Redmi Note 14 vào giỏ' }));
    expect(cart.addToCart).toHaveBeenCalledWith(expect.objectContaining({ id: 'p-redmi', stock: 3 }), 1, 'product');

    fireEvent.click(screen.getByRole('button', { name: 'Câu trả lời hữu ích' }));
    await waitFor(() => expect(chatApi.sendFeedback).toHaveBeenCalledWith('msg-1', 'up', expect.stringMatching(/^v-/)));
    expect(screen.getByRole('button', { name: 'Câu trả lời hữu ích' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('restores the previous session history when reopened', async () => {
    localStorage.setItem(CHAT_STORAGE_KEYS.sessionId, JSON.stringify('session-9'));
    localStorage.setItem(CHAT_STORAGE_KEYS.visitorId, JSON.stringify('v-existing-visitor'));
    chatApi.getSession.mockResolvedValue({
      session: { id: 'session-9' },
      messages: [
        { id: 'm1', role: 'user', content: 'Câu hỏi cũ' },
        { id: 'm2', role: 'assistant', content: 'Câu trả lời cũ', products: [] },
      ],
    });

    renderWidget();
    await openWidget();

    expect(await screen.findByText('Câu hỏi cũ')).toBeInTheDocument();
    expect(chatApi.getSession).toHaveBeenCalledWith('session-9', 'v-existing-visitor');
  });

  it('shows friendly errors without retrying rate-limited or paused requests', async () => {
    chatApi.streamMessage.mockRejectedValueOnce(Object.assign(new Error('slow down'), { status: 429 }));
    renderWidget();
    await openWidget();
    fireEvent.click(screen.getByRole('button', { name: 'Máy nào pin trâu?' }));
    expect(await screen.findByText(/gửi hơi nhanh/)).toBeInTheDocument();

    chatApi.streamMessage.mockRejectedValueOnce(Object.assign(new Error('paused'), { status: 503 }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Nội dung tin nhắn' }), { target: { value: 'Alo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
    expect(await screen.findByText(/đang tạm ngưng/)).toBeInTheDocument();
    expect(chatApi.sendMessage).not.toHaveBeenCalled();
  });
});

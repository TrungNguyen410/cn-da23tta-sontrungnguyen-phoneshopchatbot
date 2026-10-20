import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chatApi } from '../../api/chatApi';
import { useCart } from '../../hooks/useCart';
import ChatWidget, { CHAT_STORAGE_KEYS } from './ChatWidget';

vi.mock('../../api/chatApi', () => ({
  chatApi: { sendMessage: vi.fn(), getSession: vi.fn(), sendFeedback: vi.fn() },
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

const renderWidget = () => render(<MemoryRouter><ChatWidget /></MemoryRouter>);
const openWidget = () => fireEvent.click(screen.getByRole('button', { name: 'Mở trợ lý AI tư vấn' }));

describe('ChatWidget', () => {
  let cart;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
    cart = { addToCart: vi.fn() };
    useCart.mockReturnValue(cart);
    chatApi.sendMessage.mockResolvedValue(reply);
    chatApi.sendFeedback.mockResolvedValue({});
  });
  afterEach(cleanup);

  it('opens with a welcome message and quick questions', () => {
    renderWidget();
    openWidget();

    expect(screen.getByRole('dialog', { name: 'Trợ lý AI tư vấn' })).toBeInTheDocument();
    expect(screen.getByText('trợ lý AI')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tư vấn điện thoại dưới 10 triệu' })).toBeInTheDocument();
  });

  it('sends a message with a persistent visitor id and renders product cards', async () => {
    renderWidget();
    openWidget();
    fireEvent.change(screen.getByRole('textbox', { name: 'Nội dung tin nhắn' }), { target: { value: 'Máy dưới 8 triệu' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));

    expect(screen.getByText('Máy dưới 8 triệu')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Redmi Note 14' })).toHaveAttribute('href', '/products/p-redmi');
    const call = chatApi.sendMessage.mock.calls[0][0];
    expect(call).toMatchObject({ message: 'Máy dưới 8 triệu', sessionId: null });
    expect(call.visitorId).toMatch(/^v-/);
    expect(JSON.parse(localStorage.getItem(CHAT_STORAGE_KEYS.visitorId))).toBe(call.visitorId);
    expect(JSON.parse(localStorage.getItem(CHAT_STORAGE_KEYS.sessionId))).toBe('session-1');
  });

  it('adds suggested products to the cart and records feedback', async () => {
    renderWidget();
    openWidget();
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
    openWidget();

    expect(await screen.findByText('Câu hỏi cũ')).toBeInTheDocument();
    expect(chatApi.getSession).toHaveBeenCalledWith('session-9', 'v-existing-visitor');
  });

  it('shows a friendly error when the assistant is unavailable', async () => {
    chatApi.sendMessage.mockRejectedValue(Object.assign(new Error('boom'), { response: { status: 429 } }));
    renderWidget();
    openWidget();
    fireEvent.click(screen.getByRole('button', { name: 'Chính sách bảo hành thế nào?' }));

    expect(await screen.findByText(/gửi hơi nhanh/)).toBeInTheDocument();
  });
});

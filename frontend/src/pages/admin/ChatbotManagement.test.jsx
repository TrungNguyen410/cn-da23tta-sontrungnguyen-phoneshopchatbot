import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'react-toastify';
import { chatApi } from '../../api/chatApi';
import ChatbotManagement from './ChatbotManagement';

vi.mock('../../api/chatApi', () => ({
  DEFAULT_CHAT_CONFIG: { enabled: true, greeting: 'Xin chào', quickQuestions: [] },
  chatApi: {
    getStats: vi.fn(),
    getSessions: vi.fn(),
    getSessionAdmin: vi.fn(),
    getConfig: vi.fn(),
    updateConfig: vi.fn(),
  },
}));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe('ChatbotManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLDialogElement.prototype.showModal ||= function showModal() { this.setAttribute('open', ''); };
    HTMLDialogElement.prototype.close ||= function close() { this.removeAttribute('open'); };
    chatApi.getStats.mockResolvedValue({
      sessions: 12, sessionsToday: 3, answers: 30, liked: 8, disliked: 2, fallback: 6,
      avgLatencyMs: 2400, aiEnabled: true,
      tools: [{ name: 'search_products', count: 14 }],
      recentQuestions: [{ sessionId: 's1', content: 'Có trả góp không?', createdAt: '2026-10-20T08:00:00.000Z' }],
    });
    chatApi.getSessions.mockResolvedValue({
      items: [{ id: 's1', title: 'Có trả góp không?', customerName: 'Khách vãng lai', messageCount: 2, lastMessageAt: '2026-10-20T08:00:00.000Z' }],
      total: 1,
    });
    chatApi.getConfig.mockResolvedValue({ enabled: true, greeting: 'Chào bạn', quickQuestions: ['Câu 1', 'Câu 2'] });
    chatApi.updateConfig.mockImplementation(async (payload) => payload);
    chatApi.getSessionAdmin.mockResolvedValue({
      session: { id: 's1', title: 'Có trả góp không?' },
      messages: [
        { id: 'm1', role: 'user', content: 'Có trả góp không?' },
        { id: 'm2', role: 'assistant', content: 'Có, trả góp **0%**.', source: 'gemini', toolCalls: [{ name: 'search_store_policies' }], latencyMs: 1500 },
      ],
    });
  });
  afterEach(cleanup);

  it('shows AI status, statistics and opens a transcript', async () => {
    render(<MemoryRouter><ChatbotManagement /></MemoryRouter>);

    expect(await screen.findByText('Gemini API đang hoạt động')).toBeInTheDocument();
    expect(screen.getByText('2.4s')).toBeInTheDocument();
    expect(screen.getByText('Tìm điện thoại')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Xem hội thoại Có trả góp không?' }));

    expect(await screen.findByText('0%')).toBeInTheDocument();
    expect(screen.getByText(/Gemini · Chính sách cửa hàng · 1.5s/)).toBeInTheDocument();
  });

  it('saves chatbot settings from the config form', async () => {
    render(<MemoryRouter><ChatbotManagement /></MemoryRouter>);

    const greeting = await screen.findByRole('textbox', { name: /Lời chào/ });
    expect(greeting).toHaveValue('Chào bạn');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Bật chatbot trên website' }));
    fireEvent.change(greeting, { target: { value: 'Xin chào khách!' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Câu hỏi gợi ý/ }), { target: { value: 'Máy pin trâu?\n\n  Trả góp 0%?  ' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu cấu hình/ }));

    await waitFor(() => expect(chatApi.updateConfig).toHaveBeenCalledWith({
      enabled: false,
      greeting: 'Xin chào khách!',
      quickQuestions: ['Máy pin trâu?', 'Trả góp 0%?'],
    }));
    expect(toast.success).toHaveBeenCalledWith('Đã lưu cấu hình chatbot');
  });

  it('rejects more than six quick questions', async () => {
    render(<MemoryRouter><ChatbotManagement /></MemoryRouter>);

    fireEvent.change(await screen.findByRole('textbox', { name: /Câu hỏi gợi ý/ }), { target: { value: '1\n2\n3\n4\n5\n6\n7' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu cấu hình/ }));

    expect(toast.error).toHaveBeenCalledWith('Tối đa 6 câu hỏi gợi ý');
    expect(chatApi.updateConfig).not.toHaveBeenCalled();
  });
});

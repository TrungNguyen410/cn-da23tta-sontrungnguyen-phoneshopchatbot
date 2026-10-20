import { useCallback, useEffect, useRef, useState } from 'react';
import { FiCpu, FiSend, FiShoppingCart, FiThumbsDown, FiThumbsUp, FiTrash2, FiX } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { chatApi } from '../../api/chatApi';
import { useCart } from '../../hooks/useCart';
import { formatCurrency } from '../../utils/formatCurrency';
import { storage } from '../../utils/storage';
import RichText from './RichText';

export const CHAT_STORAGE_KEYS = {
  visitorId: 'chat_visitor_id',
  sessionId: 'chat_session_id',
};

export const QUICK_QUESTIONS = [
  'Tư vấn điện thoại dưới 10 triệu',
  'So sánh iPhone 16 Pro Max và Galaxy S25 Ultra',
  'Chính sách bảo hành thế nào?',
  'Có mã giảm giá nào không?',
];

const WELCOME = {
  id: 'welcome',
  role: 'assistant',
  content: 'Xin chào! Mình là **trợ lý AI** của cửa hàng. Mình có thể:\n- Tư vấn chọn điện thoại theo ngân sách, nhu cầu\n- So sánh các mẫu máy\n- Tra cứu đơn hàng, khuyến mãi, chính sách\nBạn cần hỗ trợ gì ạ?',
  products: [],
};

const ensureVisitorId = () => {
  let visitorId = storage.get(CHAT_STORAGE_KEYS.visitorId);
  if (typeof visitorId !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(visitorId)) {
    visitorId = `v-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`;
    try {
      storage.set(CHAT_STORAGE_KEYS.visitorId, visitorId);
    } catch {
      // Chat still works for this page view when storage is unavailable.
    }
  }
  return visitorId;
};

function ProductCard({ product, onAdd }) {
  return (
    <article className="chat-product-card">
      {product.image && <img src={product.image} alt="" loading="lazy" />}
      <div>
        <Link to={product.url}>{product.name}</Link>
        <strong>{formatCurrency(product.price)}</strong>
        {product.oldPrice > product.price && <del>{formatCurrency(product.oldPrice)}</del>}
      </div>
      <button
        type="button"
        aria-label={`Thêm ${product.name} vào giỏ`}
        disabled={!product.stock}
        onClick={() => onAdd(product)}
      >
        <FiShoppingCart />
      </button>
    </article>
  );
}

export default function ChatWidget() {
  const cart = useCart();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState(() => storage.get(CHAT_STORAGE_KEYS.sessionId));
  const historyRequestedRef = useRef(false);
  const visitorIdRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const visitorId = () => {
    visitorIdRef.current ||= ensureVisitorId();
    return visitorIdRef.current;
  };

  const rememberSession = useCallback((id) => {
    setSessionId(id);
    try {
      if (id) storage.set(CHAT_STORAGE_KEYS.sessionId, id);
      else storage.remove(CHAT_STORAGE_KEYS.sessionId);
    } catch {
      // Ignore unavailable storage.
    }
  }, []);

  useEffect(() => {
    if (!open || historyRequestedRef.current) return;
    historyRequestedRef.current = true;
    if (!sessionId) return;
    chatApi.getSession(sessionId, visitorId())
      .then((data) => {
        if (data?.messages?.length) setMessages((current) => (current.length === 1 ? [WELCOME, ...data.messages] : current));
      })
      .catch(() => rememberSession(null));
  }, [open, rememberSession, sessionId]);

  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus();
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, sending]);

  const send = async (text) => {
    const message = String(text || '').trim();
    if (!message || sending) return;
    if (message.length > 1000) {
      toast.error('Tin nhắn tối đa 1000 ký tự');
      return;
    }
    setInput('');
    setMessages((current) => [...current, { id: `local-${Date.now()}`, role: 'user', content: message }]);
    setSending(true);
    try {
      const result = await chatApi.sendMessage({ message, sessionId, visitorId: visitorId() });
      if (result.sessionId !== sessionId) rememberSession(result.sessionId);
      setMessages((current) => [...current, result.message]);
    } catch (error) {
      const status = error.response?.status ?? error.status;
      if (status === 404 && sessionId) rememberSession(null);
      setMessages((current) => [...current, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        error: true,
        content: status === 429
          ? 'Bạn gửi hơi nhanh, vui lòng chờ một chút rồi thử lại nhé.'
          : 'Xin lỗi, trợ lý đang gặp sự cố. Bạn thử lại sau hoặc gọi hotline nhé.',
      }]);
    } finally {
      setSending(false);
    }
  };

  const rate = async (message, value) => {
    const next = message.feedback === value ? null : value;
    setMessages((current) => current.map((item) => (item.id === message.id ? { ...item, feedback: next } : item)));
    try {
      await chatApi.sendFeedback(message.id, next, visitorId());
    } catch {
      toast.error('Không gửi được đánh giá');
    }
  };

  const addToCart = (product) => {
    cart.addToCart(product, 1, product.type === 'accessory' ? 'accessory' : 'product');
    toast.success(`Đã thêm ${product.name} vào giỏ hàng`);
  };

  const reset = () => {
    rememberSession(null);
    setMessages([WELCOME]);
  };

  const showQuickQuestions = messages.length === 1 && !sending;

  return (
    <div className={`chat-widget ${open ? 'is-open' : ''}`}>
      {open && (
        <section className="chat-panel panel" role="dialog" aria-label="Trợ lý AI tư vấn">
          <header className="chat-header">
            <span className="chat-avatar"><FiCpu /></span>
            <div>
              <strong>Trợ lý AI tư vấn</strong>
              <small>Trả lời dựa trên dữ liệu cửa hàng</small>
            </div>
            <button type="button" aria-label="Cuộc trò chuyện mới" title="Cuộc trò chuyện mới" onClick={reset}><FiTrash2 /></button>
            <button type="button" aria-label="Đóng trợ lý AI" onClick={() => setOpen(false)}><FiX /></button>
          </header>

          <div className="chat-messages" ref={listRef} aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={`chat-message ${message.role} ${message.error ? 'error' : ''}`}>
                <div className="chat-bubble">
                  {message.role === 'assistant' ? <RichText text={message.content} /> : message.content}
                </div>
                {message.products?.length > 0 && (
                  <div className="chat-products">
                    {message.products.map((product) => (
                      <ProductCard key={product.id} product={product} onAdd={addToCart} />
                    ))}
                  </div>
                )}
                {message.role === 'assistant' && message.id !== 'welcome' && !message.error && (
                  <div className="chat-feedback">
                    <button type="button" aria-label="Câu trả lời hữu ích" aria-pressed={message.feedback === 'up'} onClick={() => rate(message, 'up')}><FiThumbsUp /></button>
                    <button type="button" aria-label="Câu trả lời chưa tốt" aria-pressed={message.feedback === 'down'} onClick={() => rate(message, 'down')}><FiThumbsDown /></button>
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="chat-message assistant">
                <div className="chat-bubble chat-typing" aria-label="Trợ lý đang trả lời"><span /><span /><span /></div>
              </div>
            )}
            {showQuickQuestions && (
              <div className="chat-quick">
                {QUICK_QUESTIONS.map((question) => (
                  <button type="button" key={question} onClick={() => send(question)}>{question}</button>
                ))}
              </div>
            )}
          </div>

          <form
            className="chat-input"
            onSubmit={(event) => {
              event.preventDefault();
              send(input);
            }}
          >
            <input
              ref={inputRef}
              value={input}
              maxLength={1000}
              placeholder="Nhập câu hỏi của bạn..."
              aria-label="Nội dung tin nhắn"
              onChange={(event) => setInput(event.target.value)}
            />
            <button type="submit" aria-label="Gửi tin nhắn" disabled={sending || !input.trim()}><FiSend /></button>
          </form>
        </section>
      )}
      <button
        type="button"
        className="chat-toggle"
        aria-expanded={open}
        aria-label={open ? 'Đóng trợ lý AI' : 'Mở trợ lý AI tư vấn'}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <FiX /> : <FiCpu />}
        <span>{open ? 'Đóng' : 'Tư vấn AI'}</span>
      </button>
    </div>
  );
}

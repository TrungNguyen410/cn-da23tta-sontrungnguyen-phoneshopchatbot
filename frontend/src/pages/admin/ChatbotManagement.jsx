import { useEffect, useState } from 'react';
import { FiActivity, FiClock, FiCpu, FiEye, FiMessageCircle, FiThumbsDown, FiThumbsUp } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { chatApi } from '../../api/chatApi';
import ChatbotConfigCard from '../../components/admin/ChatbotConfigCard';
import DataTable from '../../components/admin/DataTable';
import StatCard from '../../components/admin/StatCard';
import RichText from '../../components/chat/RichText';
import AccessibleDialog from '../../components/common/AccessibleDialog';
import Loading from '../../components/common/Loading';
import Pagination from '../../components/common/Pagination';
import { formatDate } from '../../utils/formatCurrency';

const PAGE_SIZE = 15;
const TOOL_LABELS = {
  search_products: 'Tìm điện thoại',
  get_product_details: 'Chi tiết sản phẩm',
  compare_products: 'So sánh máy',
  search_accessories: 'Tìm phụ kiện',
  lookup_order: 'Tra cứu đơn',
  list_promotions: 'Khuyến mãi',
  search_store_policies: 'Chính sách cửa hàng',
};
const SOURCE_LABELS = { gemini: 'Gemini', offline: 'Offline', fallback: 'Dự phòng' };

const percent = (value, total) => (total ? `${Math.round((value / total) * 100)}%` : '0%');

export default function ChatbotManagement() {
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState({ items: [], total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [transcript, setTranscript] = useState(null);

  useEffect(() => {
    chatApi.getStats().then(setStats).catch((error) => toast.error(error.friendlyMessage || error.message));
  }, []);

  useEffect(() => {
    let active = true;
    chatApi.getSessions({ page, limit: PAGE_SIZE })
      .then((data) => {
        if (active) setSessions(data);
      })
      .catch((error) => toast.error(error.friendlyMessage || error.message))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [page]);

  const openTranscript = async (session) => {
    try {
      setTranscript(await chatApi.getSessionAdmin(session.id));
    } catch (error) {
      toast.error(error.friendlyMessage || error.message);
    }
  };

  if (loading || !stats) return <Loading />;

  const columns = [
    { key: 'title', label: 'Câu hỏi đầu tiên', render: (item) => <strong>{item.title}</strong> },
    { key: 'customerName', label: 'Khách hàng' },
    { key: 'messageCount', label: 'Số tin nhắn' },
    { key: 'lastMessageAt', label: 'Hoạt động gần nhất', render: (item) => formatDate(item.lastMessageAt, true) },
    {
      key: 'actions',
      label: 'Thao tác',
      render: (item) => (
        <div className="table-actions">
          <button aria-label={`Xem hội thoại ${item.title}`} onClick={() => openTranscript(item)}><FiEye /></button>
        </div>
      ),
    },
  ];

  const quotaExhausted = stats.aiEnabled && stats.aiQuotaExhausted?.length > 0;

  return (
    <>
      <div className={`chatbot-status ${stats.aiEnabled && !quotaExhausted ? 'is-on' : 'is-off'}`}>
        <FiCpu />
        <div>
          <strong>
            {!stats.aiEnabled
              ? 'Chatbot đang chạy chế độ offline'
              : quotaExhausted
                ? 'Gemini API tạm hết hạn mức'
                : `Gemini API đang hoạt động${stats.aiModel ? ` (${stats.aiModel})` : ''}`}
          </strong>
          <span>
            {!stats.aiEnabled
              ? 'Chưa cấu hình GEMINI_API_KEY trên backend. Chatbot trả lời theo luật dựa trên dữ liệu cửa hàng.'
              : quotaExhausted
                ? `Model ${stats.aiQuotaExhausted.join(', ')} đã hết lượt gọi (gói miễn phí giới hạn theo ngày). Chatbot tạm trả lời ở chế độ offline và sẽ tự dùng lại Gemini khi có hạn mức.`
                : 'Câu trả lời được sinh bởi Gemini, dữ liệu lấy trực tiếp từ cửa hàng qua function calling.'}
          </span>
        </div>
        <Link className="btn btn-light" to="/admin/knowledge">Kho kiến thức</Link>
      </div>

      <section className="stat-grid">
        <StatCard label="Cuộc trò chuyện" value={stats.sessions} change={`${stats.sessionsToday} hôm nay`} icon={FiMessageCircle} color="blue" />
        <StatCard label="Câu trả lời" value={stats.answers} change={`${percent(stats.fallback, stats.answers)} offline/dự phòng`} icon={FiActivity} color="violet" />
        <StatCard label="Hài lòng" value={`${stats.liked} / ${stats.liked + stats.disliked}`} change={`${stats.disliked} đánh giá chưa tốt`} icon={stats.disliked > stats.liked ? FiThumbsDown : FiThumbsUp} color="green" />
        <StatCard label="Thời gian phản hồi" value={`${(stats.avgLatencyMs / 1000).toFixed(1)}s`} change="Trung bình mỗi câu trả lời" icon={FiClock} color="orange" />
      </section>

      <ChatbotConfigCard />

      <section className="dashboard-bottom-grid">
        <div className="admin-card chatbot-tools">
          <div className="card-heading"><div><h2>Chức năng được dùng</h2><span>Số lần chatbot gọi công cụ</span></div></div>
          {stats.tools.length ? stats.tools.map((tool) => (
            <div key={tool.name}><span>{TOOL_LABELS[tool.name] || tool.name}</span><strong>{tool.count}</strong></div>
          )) : <p>Chưa có dữ liệu.</p>}
        </div>
        <div className="admin-card chatbot-questions">
          <div className="card-heading"><div><h2>Câu hỏi gần đây</h2><span>Dùng để bổ sung kho kiến thức</span></div></div>
          {stats.recentQuestions.length ? stats.recentQuestions.map((question) => (
            <div key={`${question.sessionId}-${question.createdAt}`}><span>{question.content}</span><small>{formatDate(question.createdAt, true)}</small></div>
          )) : <p>Chưa có câu hỏi nào.</p>}
        </div>
      </section>

      <div className="admin-table-card">
        <div className="admin-table-title"><div><h2>Lịch sử hội thoại</h2><span>{sessions.total} cuộc trò chuyện</span></div></div>
        <DataTable columns={columns} rows={sessions.items} emptyTitle="Chưa có cuộc trò chuyện nào" />
        <Pagination currentPage={page} totalPages={Math.ceil(sessions.total / PAGE_SIZE)} onPageChange={setPage} />
      </div>

      {transcript && (
        <AccessibleDialog open title="Nội dung hội thoại" className="order-detail-modal chat-transcript-modal" onClose={() => setTranscript(null)}>
          <button className="icon-button modal-close" aria-label="Đóng hội thoại" onClick={() => setTranscript(null)}>×</button>
          <span className="eyebrow">Hội thoại chatbot</span>
          <h2>{transcript.session.title}</h2>
          <div className="chat-transcript">
            {transcript.messages.map((message) => (
              <div key={message.id} className={`chat-message ${message.role}`}>
                <div className="chat-bubble">
                  {message.role === 'assistant' ? <RichText text={message.content} /> : message.content}
                </div>
                {message.role === 'assistant' && (
                  <small className="chat-meta">
                    {SOURCE_LABELS[message.source] || message.source}
                    {message.toolCalls?.length ? ` · ${message.toolCalls.map((tool) => TOOL_LABELS[tool.name] || tool.name).join(', ')}` : ''}
                    {message.latencyMs ? ` · ${(message.latencyMs / 1000).toFixed(1)}s` : ''}
                    {message.feedback === 'up' ? ' · 👍' : message.feedback === 'down' ? ' · 👎' : ''}
                  </small>
                )}
              </div>
            ))}
          </div>
        </AccessibleDialog>
      )}
    </>
  );
}

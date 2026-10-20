import { knowledgeApi } from '../../api/chatApi';
import SimpleCrudPage from '../../components/admin/SimpleCrudPage';

const CATEGORIES = [
  { value: 'warranty', label: 'Bảo hành' },
  { value: 'return', label: 'Đổi trả' },
  { value: 'shipping', label: 'Giao hàng' },
  { value: 'payment', label: 'Thanh toán' },
  { value: 'installment', label: 'Trả góp' },
  { value: 'store', label: 'Cửa hàng' },
  { value: 'faq', label: 'Câu hỏi thường gặp' },
];
const categoryLabel = (value) => CATEGORIES.find((item) => item.value === value)?.label || value;

export default function KnowledgeManagement() {
  return (
    <>
      <p className="admin-page-note">
        Chatbot AI dùng các bài viết này để trả lời câu hỏi về chính sách và dịch vụ. Thêm <strong>từ khóa</strong>
        {' '}(cách nhau bằng dấu phẩy, nên có cả dạng không dấu) để chatbot tìm đúng bài.
      </p>
      <SimpleCrudPage
        api={knowledgeApi}
        title="Kho kiến thức chatbot"
        singular="Bài viết"
        createDefaults={{ title: '', category: 'faq', keywords: '', content: '', active: true }}
        fields={[
          { key: 'title', label: 'Tiêu đề', required: true, full: true },
          { key: 'category', label: 'Nhóm', type: 'select', options: CATEGORIES },
          { key: 'keywords', label: 'Từ khóa' },
          { key: 'content', label: 'Nội dung', type: 'textarea', required: true, full: true },
          { key: 'active', label: 'Đang sử dụng', type: 'checkbox' },
        ]}
        columns={[
          { key: 'title', label: 'Tiêu đề', render: (item) => <strong>{item.title}</strong> },
          { key: 'category', label: 'Nhóm', render: (item) => categoryLabel(item.category) },
          { key: 'keywords', label: 'Từ khóa', render: (item) => (Array.isArray(item.keywords) ? item.keywords.join(', ') : item.keywords) },
          {
            key: 'active',
            label: 'Trạng thái',
            render: (item) => <span className={`status-badge ${item.active ? 'status-completed' : 'status-cancelled'}`}>{item.active ? 'Đang dùng' : 'Tạm tắt'}</span>,
          },
        ]}
      />
    </>
  );
}

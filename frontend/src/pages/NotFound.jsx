import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="not-found-page">
      <div><strong>404</strong><h1>Trang bạn tìm không tồn tại</h1><p>Đường dẫn có thể đã thay đổi hoặc nội dung không còn khả dụng.</p><Link className="btn btn-primary" to="/">Về trang chủ</Link></div>
    </main>
  );
}

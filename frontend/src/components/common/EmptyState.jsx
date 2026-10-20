import { FiInbox } from 'react-icons/fi';
import { Link } from 'react-router-dom';

export default function EmptyState({
  title = 'Chưa có dữ liệu',
  description = 'Nội dung sẽ xuất hiện tại đây.',
  actionLabel,
  actionTo = '/',
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon"><FiInbox /></div>
      <h3>{title}</h3>
      <p>{description}</p>
      {actionLabel && <Link className="btn btn-primary" to={actionTo}>{actionLabel}</Link>}
    </div>
  );
}

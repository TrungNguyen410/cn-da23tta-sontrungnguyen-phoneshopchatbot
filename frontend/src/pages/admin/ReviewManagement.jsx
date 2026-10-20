import { useEffect, useState } from 'react';
import { FiCheck, FiStar, FiTrash2, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { reviewApi } from '../../api/reviewApi';
import DataTable from '../../components/admin/DataTable';
import ConfirmModal from '../../components/common/ConfirmModal';
import Loading from '../../components/common/Loading';
import { formatDate } from '../../utils/formatCurrency';

export default function ReviewManagement() {
  const [reviews, setReviews] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const load = () => reviewApi.getAllAdmin().then(setReviews).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  const update = async (id, action) => {
    await reviewApi[action](id);
    toast.success(action === 'approve' ? 'Đã duyệt đánh giá' : 'Đã từ chối đánh giá');
    load();
  };
  const remove = async () => { await reviewApi.remove(deleteId); setDeleteId(null); toast.success('Đã xóa đánh giá'); load(); };
  const columns = [
    { key: 'userName', label: 'Khách hàng', render: (review) => <strong>{review.userName}</strong> },
    { key: 'rating', label: 'Đánh giá', render: (review) => <span className="table-rating">{review.rating} <FiStar /></span> },
    { key: 'comment', label: 'Nội dung', render: (review) => <p className="review-comment-cell">{review.comment}</p> },
    { key: 'images', label: 'Ảnh', render: (review) => <div className="review-admin-images">{review.images?.slice(0, 3).map((image) => <img key={image} src={image} alt="" />)}</div> },
    { key: 'createdAt', label: 'Ngày gửi', render: (review) => formatDate(review.createdAt) },
    { key: 'status', label: 'Trạng thái', render: (review) => <span className={`review-status ${review.status}`}>{review.status === 'approved' ? 'Đã duyệt' : review.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}</span> },
    { key: 'actions', label: 'Thao tác', render: (review) => <div className="review-admin-actions">{review.status !== 'approved' && <button className="approve" onClick={() => update(review.id, 'approve')}><FiCheck /></button>}{review.status !== 'rejected' && <button className="reject" onClick={() => update(review.id, 'reject')}><FiX /></button>}<button className="delete" onClick={() => setDeleteId(review.id)}><FiTrash2 /></button></div> },
  ];
  if (loading) return <Loading />;
  const visible = filter ? reviews.filter((review) => review.status === filter) : reviews;
  return <><div className="admin-page-toolbar"><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="">Tất cả trạng thái</option><option value="pending">Chờ duyệt</option><option value="approved">Đã duyệt</option><option value="rejected">Từ chối</option></select></div><div className="admin-table-card"><div className="admin-table-title"><div><h2>Danh sách đánh giá</h2><span>{visible.length} đánh giá</span></div></div><DataTable columns={columns} rows={visible} /></div><ConfirmModal open={Boolean(deleteId)} title="Xóa đánh giá?" message="Đánh giá sẽ không còn hiển thị trong hệ thống." onCancel={() => setDeleteId(null)} onConfirm={remove} /></>;
}

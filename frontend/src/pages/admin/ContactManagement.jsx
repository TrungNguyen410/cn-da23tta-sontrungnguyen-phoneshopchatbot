import { useEffect, useState } from 'react';
import { FiEye, FiTrash2, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { contactApi } from '../../api/contactApi';
import DataTable from '../../components/admin/DataTable';
import ConfirmModal from '../../components/common/ConfirmModal';
import Loading from '../../components/common/Loading';
import AccessibleDialog from '../../components/common/AccessibleDialog';
import { formatDate } from '../../utils/formatCurrency';

const statusLabel = {
  new: 'Mới',
  read: 'Đang xử lý',
  resolved: 'Đã giải quyết',
};

export default function ContactManagement() {
  const [contacts, setContacts] = useState([]);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => contactApi.getAllAdmin().then(setContacts).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const update = async (id, payload) => {
    const contact = await contactApi.update(id, payload);
    setContacts((current) => current.map((item) => item.id === id ? contact : item));
    setSelected(contact);
    window.dispatchEvent(new CustomEvent('contact-updated'));
    toast.success('Đã cập nhật yêu cầu liên hệ');
  };

  const remove = async () => {
    await contactApi.remove(deleteId);
    setDeleteId(null);
    setSelected(null);
    await load();
    window.dispatchEvent(new CustomEvent('contact-updated'));
    toast.success('Đã xóa yêu cầu liên hệ');
  };

  if (loading) return <Loading />;
  const visible = filter ? contacts.filter((item) => item.status === filter) : contacts;
  const columns = [
    { key: 'fullName', label: 'Khách hàng', render: (item) => <span><strong>{item.fullName}</strong><small className="table-subtext">{item.phone}</small></span> },
    { key: 'subject', label: 'Chủ đề', render: (item) => <strong>{item.subject}</strong> },
    { key: 'createdAt', label: 'Ngày gửi', render: (item) => formatDate(item.createdAt) },
    { key: 'status', label: 'Trạng thái', render: (item) => <span className={`contact-status ${item.status}`}>{statusLabel[item.status]}</span> },
    { key: 'actions', label: 'Thao tác', render: (item) => <div className="review-admin-actions"><button className="approve" aria-label="Xem liên hệ" onClick={() => { setSelected(item); if (item.status === 'new') update(item.id, { status: 'read' }); }}><FiEye /></button><button className="delete" aria-label="Xóa liên hệ" onClick={() => setDeleteId(item.id)}><FiTrash2 /></button></div> },
  ];

  return (
    <>
      <div className="admin-page-toolbar">
        <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="new">Mới</option>
          <option value="read">Đang xử lý</option>
          <option value="resolved">Đã giải quyết</option>
        </select>
      </div>
      <div className="admin-table-card">
        <div className="admin-table-title"><div><h2>Yêu cầu liên hệ</h2><span>{visible.length} yêu cầu · {contacts.filter((item) => item.status === 'new').length} chưa đọc</span></div></div>
        <DataTable columns={columns} rows={visible} emptyTitle="Chưa có yêu cầu liên hệ" />
      </div>

      {selected && (
        <AccessibleDialog
          open
          title={`Liên hệ: ${selected.subject}`}
          className="contact-detail-modal"
          onClose={() => setSelected(null)}
        >
            <button className="icon-button modal-close" aria-label="Đóng liên hệ" onClick={() => setSelected(null)}><FiX /></button>
            <span className={`contact-status ${selected.status}`}>{statusLabel[selected.status]}</span>
            <h2>{selected.subject}</h2>
            <div className="contact-customer-meta">
              <strong>{selected.fullName}</strong>
              <span>{selected.email}</span>
              <span>{selected.phone}</span>
              <small>Gửi lúc {formatDate(selected.createdAt, true)}</small>
            </div>
            <p className="contact-message">{selected.message}</p>
            <label className="form-field">
              <span>Ghi chú xử lý</span>
              <textarea
                rows="4"
                value={selected.adminNote || ''}
                onChange={(event) => setSelected({ ...selected, adminNote: event.target.value })}
              />
            </label>
            <div className="admin-modal-actions">
              <button className="btn btn-light" onClick={() => update(selected.id, { status: 'read', adminNote: selected.adminNote })}>Lưu ghi chú</button>
              <button className="btn btn-primary" onClick={() => update(selected.id, { status: 'resolved', adminNote: selected.adminNote })}>Đánh dấu đã giải quyết</button>
            </div>
        </AccessibleDialog>
      )}
      <ConfirmModal open={Boolean(deleteId)} title="Xóa yêu cầu liên hệ?" message="Yêu cầu này sẽ bị xóa khỏi hệ thống." onCancel={() => setDeleteId(null)} onConfirm={remove} />
    </>
  );
}

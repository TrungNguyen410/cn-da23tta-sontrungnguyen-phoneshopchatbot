import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-toastify';
import ConfirmModal from '../common/ConfirmModal';
import Loading from '../common/Loading';
import DataTable from './DataTable';
import ProductFormModal from './ProductFormModal';
import { formatCurrency } from '../../utils/formatCurrency';

export default function CatalogManagement({ api, kind = 'product' }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('');
  const [status, setStatus] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [mutationKey, setMutationKey] = useState('');

  const load = useCallback(
    () => api.getAllAdmin().then(setItems).finally(() => setLoading(false)),
    [api],
  );
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => items.filter((item) =>
    (!search || `${item.name} ${item.brand}`.toLowerCase().includes(search.toLowerCase())) &&
    (!brand || item.brand === brand) &&
    (!status || item.status === status)
  ), [brand, items, search, status]);
  const brands = [...new Set(items.map((item) => item.brand))].sort();

  const save = async (payload) => {
    if (mutationKey) return;
    setMutationKey(`save:${editing?.id || 'new'}`);
    try {
      if (editing) await api.update(editing.id, payload);
      else await api.create(payload);
      toast.success(editing ? 'Đã cập nhật dữ liệu' : 'Đã thêm dữ liệu mới');
      setFormOpen(false);
      setEditing(null);
      await load();
    } catch (error) {
      toast.error(error.friendlyMessage || error.message);
    } finally {
      setMutationKey('');
    }
  };
  const remove = async () => {
    if (mutationKey || !deleteId) return;
    setMutationKey(`delete:${deleteId}`);
    try {
      await api.remove(deleteId);
      setDeleteId(null);
      toast.success('Đã xóa dữ liệu');
      await load();
    } catch (error) {
      toast.error(error.friendlyMessage || error.message);
    } finally {
      setMutationKey('');
    }
  };

  const columns = [
    {
      key: 'product',
      label: kind === 'product' ? 'Sản phẩm' : 'Phụ kiện',
      render: (item) => <div className="table-product"><img src={item.image} alt="" /><span><strong>{item.name}</strong><small>#{item.id}</small></span></div>,
    },
    { key: 'brand', label: 'Thương hiệu' },
    { key: 'price', label: 'Giá bán', render: (item) => <strong>{formatCurrency(item.price)}</strong> },
    { key: 'stock', label: 'Tồn kho', render: (item) => <span className={item.stock < 10 ? 'stock-low' : ''}>{item.stock}</span> },
    { key: 'sold', label: 'Đã bán' },
    { key: 'status', label: 'Trạng thái', render: (item) => <span className={`status-badge ${item.status === 'active' ? 'status-completed' : 'status-cancelled'}`}>{item.status === 'active' ? 'Đang bán' : 'Ngừng bán'}</span> },
    {
      key: 'actions',
      label: 'Thao tác',
      className: 'table-actions-cell',
      render: (item) => <div className="table-actions"><button disabled={Boolean(mutationKey)} onClick={() => { setEditing(item); setFormOpen(true); }}><FiEdit2 /></button><button className="danger" disabled={Boolean(mutationKey)} onClick={() => setDeleteId(item.id)}><FiTrash2 /></button></div>,
    },
  ];

  if (loading) return <Loading />;
  return (
    <>
      <div className="admin-page-toolbar">
        <div className="admin-search"><FiSearch /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Tìm ${kind === 'product' ? 'sản phẩm' : 'phụ kiện'}...`} /></div>
        <select value={brand} onChange={(event) => setBrand(event.target.value)}><option value="">Tất cả thương hiệu</option>{brands.map((item) => <option key={item}>{item}</option>)}</select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Tất cả trạng thái</option><option value="active">Đang bán</option><option value="inactive">Ngừng bán</option></select>
        <button className="btn btn-primary" disabled={Boolean(mutationKey)} onClick={() => { setEditing(null); setFormOpen(true); }}><FiPlus /> Thêm mới</button>
      </div>
      <div className="admin-table-card"><div className="admin-table-title"><div><h2>Danh sách {kind === 'product' ? 'sản phẩm' : 'phụ kiện'}</h2><span>{filtered.length} mục hiển thị</span></div></div><DataTable columns={columns} rows={filtered} /></div>
      <ProductFormModal open={formOpen} item={editing} kind={kind} saving={mutationKey.startsWith('save:')} onClose={() => { setFormOpen(false); setEditing(null); }} onSubmit={save} />
      <ConfirmModal open={Boolean(deleteId)} title="Xóa dữ liệu này?" message="Thao tác sẽ xóa mục khỏi danh sách quản trị trong chế độ mock." onCancel={() => setDeleteId(null)} onConfirm={remove} busy={mutationKey === `delete:${deleteId}`} />
    </>
  );
}

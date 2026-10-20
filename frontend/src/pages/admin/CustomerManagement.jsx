import { useCallback, useEffect, useRef, useState } from 'react';
import { FiLock, FiSearch, FiUnlock } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { adminApi } from '../../api/adminApi';
import DataTable from '../../components/admin/DataTable';
import Loading from '../../components/common/Loading';
import Pagination from '../../components/common/Pagination';
import { formatCurrency, formatDate } from '../../utils/formatCurrency';

export default function CustomerManagement() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const requestId = useRef(0);
  const load = useCallback(() => {
    const currentRequest = ++requestId.current;
    return adminApi.getCustomers({ page, limit: 20, search: debouncedSearch })
      .then((response) => {
        if (currentRequest !== requestId.current) return;
        const totalPages = Number.isFinite(response.pagination.totalPages)
          ? Math.max(0, Math.trunc(response.pagination.totalPages))
          : 0;
        const lastPage = Math.max(totalPages, 1);
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setCustomers(response.items);
        setPagination({ ...response.pagination, totalPages });
      })
      .finally(() => {
        if (currentRequest === requestId.current) setLoading(false);
      });
  }, [debouncedSearch, page]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (search.trim() === debouncedSearch) return undefined;
    const timeout = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(timeout);
  }, [debouncedSearch, search]);
  const toggle = async (user) => {
    const status = user.status === 'active' ? 'locked' : 'active';
    await adminApi.updateCustomer(user.id, { status });
    toast.success(status === 'active' ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản');
    load();
  };
  const columns = [
    { key: 'customer', label: 'Khách hàng', render: (user) => <div className="table-user"><div>{user.fullName.charAt(0)}</div><span><strong>{user.fullName}</strong><small>{user.email}</small></span></div> },
    { key: 'phone', label: 'Số điện thoại' },
    { key: 'createdAt', label: 'Ngày tham gia', render: (user) => formatDate(user.createdAt) },
    { key: 'orderCount', label: 'Số đơn', render: (user) => <strong>{user.orderCount}</strong> },
    { key: 'totalSpent', label: 'Tổng chi tiêu', render: (user) => <strong>{formatCurrency(user.totalSpent)}</strong> },
    { key: 'status', label: 'Trạng thái', render: (user) => <span className={`status-badge ${user.status === 'active' ? 'status-completed' : 'status-cancelled'}`}>{user.status === 'active' ? 'Hoạt động' : 'Đã khóa'}</span> },
    { key: 'actions', label: 'Thao tác', render: (user) => <button className={`lock-button ${user.status === 'active' ? 'danger' : ''}`} onClick={() => toggle(user)}>{user.status === 'active' ? <><FiLock /> Khóa</> : <><FiUnlock /> Mở khóa</>}</button> },
  ];
  if (loading) return <Loading />;
  return <><div className="admin-page-toolbar"><div className="admin-search"><FiSearch /><input maxLength={100} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm khách hàng..." /></div></div><div className="admin-table-card"><div className="admin-table-title"><div><h2>Danh sách khách hàng</h2><span>{pagination.total} tài khoản</span></div></div><DataTable columns={columns} rows={customers} /><Pagination currentPage={page} totalPages={pagination.totalPages} onPageChange={setPage} /></div></>;
}

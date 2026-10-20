import { useCallback, useEffect, useRef, useState } from 'react';
import { FiEye, FiSearch, FiTruck } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { adminApi } from '../../api/adminApi';
import { orderApi } from '../../api/orderApi';
import { paymentApi } from '../../api/paymentApi';
import DataTable from '../../components/admin/DataTable';
import Loading from '../../components/common/Loading';
import Pagination from '../../components/common/Pagination';
import AccessibleDialog from '../../components/common/AccessibleDialog';
import { ORDER_STATUSES, PAYMENT_METHODS } from '../../utils/constants';
import { formatCurrency, formatDate } from '../../utils/formatCurrency';
import { getNextOrderStatuses, getOrderStatus } from '../../utils/orderStatus';

const paymentMethodLabel = (value) => PAYMENT_METHODS.find((method) => method.value === value)?.label || value;

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingForm, setTrackingForm] = useState({
    shippingProvider: '',
    trackingNumber: '',
    estimatedDelivery: '',
  });
  const [savingTracking, setSavingTracking] = useState(false);
  const [mutatingOrderId, setMutatingOrderId] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ reference: '', note: '' });
  const [reconcilingPayment, setReconcilingPayment] = useState(false);
  const requestId = useRef(0);
  const latestLoad = useRef(null);
  const ordersRef = useRef(orders);
  const paginationRef = useRef(pagination);
  const statusFilterRef = useRef(statusFilter);
  useEffect(() => { ordersRef.current = orders; }, [orders]);
  useEffect(() => { paginationRef.current = pagination; }, [pagination]);
  useEffect(() => { statusFilterRef.current = statusFilter; }, [statusFilter]);
  const load = useCallback(() => {
    const currentRequest = ++requestId.current;
    return adminApi.getOrders({ page, limit: 20, search: debouncedSearch, status: statusFilter })
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
        setOrders(response.items);
        setPagination({ ...response.pagination, totalPages });
      })
      .finally(() => {
        if (currentRequest === requestId.current) setLoading(false);
      });
  }, [debouncedSearch, page, statusFilter]);
  useEffect(() => { latestLoad.current = load; }, [load]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (search.trim() === debouncedSearch) return undefined;
    const timeout = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(timeout);
  }, [debouncedSearch, search]);
  const applyUpdatedOrder = (updated) => {
    const currentOrders = ordersRef.current;
    const orderIsVisible = currentOrders.some((order) => order.id === updated.id);
    if (!orderIsVisible) return;

    if (statusFilterRef.current && updated.status !== statusFilterRef.current) {
      const nextOrders = currentOrders.filter((order) => order.id !== updated.id);
      const currentPagination = paginationRef.current;
      const total = Math.max(0, currentPagination.total - 1);
      const totalPages = total === 0 ? 0 : Math.ceil(total / currentPagination.limit);
      const nextPagination = { ...currentPagination, total, totalPages };
      ordersRef.current = nextOrders;
      paginationRef.current = nextPagination;
      setOrders(nextOrders);
      setPagination(nextPagination);
      setPage((currentPage) => Math.min(currentPage, Math.max(totalPages, 1)));
      return;
    }

    const nextOrders = currentOrders.map((order) => (order.id === updated.id ? updated : order));
    ordersRef.current = nextOrders;
    setOrders(nextOrders);
  };
  const updateStatus = async (order, status) => {
    if (mutatingOrderId || status === order.status) return;
    setMutatingOrderId(order.id);
    try {
      const updated = await orderApi.updateStatus(order.id, status);
      applyUpdatedOrder(updated);
      setSelectedOrder((current) => (current?.id === order.id ? updated : current));
      try {
        await latestLoad.current();
        toast.success(`Đã cập nhật đơn ${order.orderNumber}`);
      } catch {
        toast.error(`Đã cập nhật đơn ${order.orderNumber}, nhưng không thể tải lại danh sách. Vui lòng làm mới trang.`);
      }
    } catch (error) {
      toast.error(error.friendlyMessage || error.message);
    } finally {
      setMutatingOrderId(null);
    }
  };
  const openOrder = (order) => {
    setSelectedOrder(order);
    setPaymentForm({ reference: order.paymentReference || '', note: '' });
    setTrackingForm({
      shippingProvider: order.shippingProvider || 'TechPhone Express',
      trackingNumber: order.trackingNumber || '',
      estimatedDelivery: order.estimatedDelivery?.slice(0, 10) || '',
    });
  };
  const reconcilePayment = async (status) => {
    if (reconcilingPayment) return;
    const payload = {
      status,
      reference: paymentForm.reference.trim(),
      note: paymentForm.note.trim(),
    };
    if (status === 'paid' && !payload.reference) {
      toast.error('Vui lòng nhập mã tham chiếu thanh toán');
      return;
    }
    setReconcilingPayment(true);
    try {
      const updated = await paymentApi.reconcileManualPayment(selectedOrder.id, payload);
      setSelectedOrder(updated);
      setOrders((current) => current.map((order) => (order.id === updated.id ? updated : order)));
      setPaymentForm({ reference: updated.paymentReference || '', note: '' });
      toast.success(`Đã đối soát thanh toán đơn ${updated.orderNumber}`);
    } catch (error) {
      toast.error(error.friendlyMessage || error.message);
    } finally {
      setReconcilingPayment(false);
    }
  };
  const saveTracking = async (event) => {
    event.preventDefault();
    setSavingTracking(true);
    try {
      const updated = await orderApi.updateShipping(selectedOrder.id, {
        ...trackingForm,
        estimatedDelivery: trackingForm.estimatedDelivery || null,
      });
      setSelectedOrder(updated);
      setOrders((current) => current.map((order) => (order.id === updated.id ? updated : order)));
      toast.success(`Đã cập nhật vận đơn ${updated.orderNumber}`);
    } catch (error) {
      toast.error(error.friendlyMessage || error.message);
    } finally {
      setSavingTracking(false);
    }
  };
  const columns = [
    { key: 'orderNumber', label: 'Mã đơn', render: (order) => <strong>{order.orderNumber}</strong> },
    { key: 'customer', label: 'Khách hàng', render: (order) => <span>{order.customer.fullName}<small className="table-subtext">{order.customer.phone}</small></span> },
    { key: 'createdAt', label: 'Ngày đặt', render: (order) => formatDate(order.createdAt, true) },
    { key: 'items', label: 'Sản phẩm', render: (order) => `${order.items.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm` },
    { key: 'total', label: 'Tổng tiền', render: (order) => <strong>{formatCurrency(order.total)}</strong> },
    { key: 'paymentMethod', label: 'Thanh toán', render: (order) => <span className="payment-method-badge">{paymentMethodLabel(order.paymentMethod)}</span> },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (order) => {
        const choices = [order.status, ...getNextOrderStatuses(order.status)];
        return (
          <select
            aria-label={`Trạng thái đơn ${order.orderNumber}`}
            className={`status-select ${getOrderStatus(order.status).className}`}
            value={order.status}
            disabled={mutatingOrderId === order.id}
            onChange={(event) => updateStatus(order, event.target.value)}
          >
            {choices.map((status) => (
              <option value={status} key={status}>{getOrderStatus(status).label}</option>
            ))}
          </select>
        );
      },
    },
    { key: 'actions', label: '', render: (order) => <button className="table-view-button" aria-label={`Xem đơn ${order.orderNumber}`} onClick={() => openOrder(order)}><FiEye /></button> },
  ];
  if (loading) return <Loading />;
  return (
    <>
      <div className="admin-page-toolbar"><div className="admin-search"><FiSearch /><input maxLength={100} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã đơn, khách hàng, số điện thoại..." /></div><select aria-label="Lọc trạng thái đơn hàng" value={statusFilter} onChange={(event) => { statusFilterRef.current = event.target.value; setPage(1); setStatusFilter(event.target.value); }}><option value="">Tất cả trạng thái</option>{ORDER_STATUSES.map((status) => <option value={status} key={status}>{getOrderStatus(status).label}</option>)}</select></div>
      <div className="admin-table-card"><div className="admin-table-title"><div><h2>Danh sách đơn hàng</h2><span>{pagination.total} đơn hàng</span></div></div><DataTable columns={columns} rows={orders} /><Pagination currentPage={page} totalPages={pagination.totalPages} onPageChange={setPage} /></div>
      {selectedOrder && (
        <AccessibleDialog
          open
          title={`Chi tiết đơn ${selectedOrder.orderNumber}`}
          className="order-detail-modal admin-order-modal"
          onClose={() => {
            if (!savingTracking) setSelectedOrder(null);
          }}
        >
          <button className="icon-button modal-close" aria-label="Đóng chi tiết đơn" onClick={() => setSelectedOrder(null)}>×</button>
          <span className="eyebrow">Chi tiết đơn hàng</span>
          <h2>{selectedOrder.orderNumber}</h2>
          <div className="admin-order-customer">
            <div><small>Khách hàng</small><strong>{selectedOrder.customer.fullName}</strong><span>{selectedOrder.customer.phone}</span></div>
            <div><small>Địa chỉ giao hàng</small><strong>{[selectedOrder.customer.address, selectedOrder.customer.ward, selectedOrder.customer.district, selectedOrder.customer.province].filter(Boolean).join(', ')}</strong></div>
            <div><small>Phương thức thanh toán</small><strong>{paymentMethodLabel(selectedOrder.paymentMethod)}</strong></div>
          </div>
          {selectedOrder.items.map((item) => (
            <div className="modal-order-item" key={item.id}>
              <img src={item.image} alt="" />
              <span><strong>{item.name}</strong><small>{formatCurrency(item.price)} × {item.quantity}</small></span>
              <b>{formatCurrency(item.price * item.quantity)}</b>
            </div>
          ))}
          {selectedOrder.paymentAudit?.confirmedAt && (
            <section className="admin-payment-audit" aria-label="Payment reconciliation audit">
              <h3>Lịch sử đối soát thanh toán</h3>
              <div><small>Mã tham chiếu</small><strong>{selectedOrder.paymentReference || '—'}</strong></div>
              <div><small>Người xác nhận</small><strong>{selectedOrder.paymentAudit.confirmedBy || '—'}</strong></div>
              <div><small>Thời gian</small><strong>{formatDate(selectedOrder.paymentAudit.confirmedAt, true)}</strong></div>
              <div><small>Ghi chú</small><strong>{selectedOrder.paymentAudit.note || '—'}</strong></div>
            </section>
          )}
          {['bank', 'momo'].includes(selectedOrder.paymentMethod)
            && ['pending', 'failed'].includes(selectedOrder.paymentStatus) && (
              <section className="admin-payment-reconciliation" aria-label="Manual payment reconciliation">
                <h3>Đối soát thanh toán</h3>
                <div className="form-grid">
                  <label className="form-field full">
                    <span>Mã tham chiếu thanh toán</span>
                    <input
                      aria-label="Payment reference"
                      maxLength={150}
                      value={paymentForm.reference}
                      onChange={(event) => setPaymentForm((current) => ({ ...current, reference: event.target.value }))}
                    />
                  </label>
                  <label className="form-field full">
                    <span>Ghi chú đối soát</span>
                    <textarea
                      aria-label="Reconciliation note"
                      maxLength={1000}
                      value={paymentForm.note}
                      onChange={(event) => setPaymentForm((current) => ({ ...current, note: event.target.value }))}
                    />
                  </label>
                </div>
                <div className="admin-payment-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    aria-label="Confirm paid payment"
                    disabled={reconcilingPayment}
                    onClick={() => reconcilePayment('paid')}
                  >Xác nhận đã thanh toán</button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    aria-label="Mark payment failed"
                    disabled={reconcilingPayment}
                    onClick={() => reconcilePayment('failed')}
                  >Đánh dấu thất bại</button>
                </div>
              </section>
            )}
          <form className="admin-tracking-form" onSubmit={saveTracking}>
            <h3><FiTruck /> Thông tin vận chuyển</h3>
            <div className="form-grid">
              <label className="form-field"><span>Đơn vị vận chuyển</span><input value={trackingForm.shippingProvider} onChange={(event) => setTrackingForm((current) => ({ ...current, shippingProvider: event.target.value }))} /></label>
              <label className="form-field"><span>Mã vận đơn</span><input value={trackingForm.trackingNumber} onChange={(event) => setTrackingForm((current) => ({ ...current, trackingNumber: event.target.value }))} /></label>
              <label className="form-field full"><span>Ngày giao dự kiến</span><input type="date" value={trackingForm.estimatedDelivery} onChange={(event) => setTrackingForm((current) => ({ ...current, estimatedDelivery: event.target.value }))} /></label>
            </div>
            <button className="btn btn-primary" disabled={savingTracking}>{savingTracking ? 'Đang lưu…' : 'Lưu vận đơn'}</button>
          </form>
          <div className="success-total"><span>Tổng thanh toán</span><strong>{formatCurrency(selectedOrder.total)}</strong></div>
        </AccessibleDialog>
      )}
    </>
  );
}

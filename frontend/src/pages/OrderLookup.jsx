import { useState } from 'react';
import { FiCheck, FiPackage, FiSearch } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { orderApi } from '../api/orderApi';
import { formatCurrency, formatDate } from '../utils/formatCurrency';
import { getOrderStatus, ORDER_TIMELINE } from '../utils/orderStatus';
import { isValidVietnamesePhone } from '../utils/validators';

export default function OrderLookup() {
  const [form, setForm] = useState({ orderNumber: '', phone: '' });
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.orderNumber.trim()) return toast.error('Vui lòng nhập mã đơn hàng');
    if (!isValidVietnamesePhone(form.phone)) return toast.error('Số điện thoại không hợp lệ');
    setLoading(true);
    try {
      setOrder(await orderApi.lookup(form.orderNumber.trim(), form.phone.trim()));
    } catch (error) {
      setOrder(null);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const currentIndex = order ? ORDER_TIMELINE.indexOf(order.status) : -1;
  const status = order ? getOrderStatus(order.status) : null;

  return (
    <main className="page-shell lookup-page">
      <div className="container">
        <div className="page-hero centered"><FiPackage /><span>Tra cứu nhanh chóng</span><h1>Đơn hàng của bạn đang ở đâu?</h1><p>Nhập mã đơn hàng và số điện thoại đã dùng khi đặt hàng.</p></div>
        <form className="lookup-form panel" onSubmit={submit}>
          <label><span>Mã đơn hàng</span><input value={form.orderNumber} onChange={(event) => setForm({ ...form, orderNumber: event.target.value.toUpperCase() })} placeholder="Ví dụ: TP260601" /></label>
          <label><span>Số điện thoại</span><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="0911111111" /></label>
          <button className="btn btn-primary" disabled={loading}><FiSearch /> {loading ? 'Đang tìm...' : 'Tra cứu đơn hàng'}</button>
          <small>Dùng thử: TP260601 · 0911111111</small>
        </form>
        {order && (
          <section className="lookup-result panel">
            <div className="lookup-head"><div><small>Mã đơn hàng</small><h2>{order.orderNumber}</h2><span>Đặt lúc {formatDate(order.createdAt, true)}</span></div><span className={`status-badge ${status.className}`}>{status.label}</span></div>
            {order.status === 'cancelled' ? <div className="cancelled-notice">Đơn hàng này đã được hủy.</div> : (
              <div className="order-timeline">{ORDER_TIMELINE.map((item, index) => <div className={index <= currentIndex ? 'active' : ''} key={item}><span>{index <= currentIndex ? <FiCheck /> : index + 1}</span><strong>{getOrderStatus(item).label}</strong></div>)}</div>
            )}
            <div className="lookup-details">
              <div><h3>Người nhận</h3><p>{order.customer.fullName}</p><p>{order.customer.phone}</p></div>
              <div><h3>Sản phẩm</h3>{order.items.map((item) => <div className="lookup-item" key={item.id}><img src={item.image} alt="" /><span>{item.name} × {item.quantity}</span><strong>{formatCurrency(item.price * item.quantity)}</strong></div>)}</div>
            </div>
            <div className="success-total"><span>Tổng thanh toán</span><strong>{formatCurrency(order.total)}</strong></div>
            {order.trackingNumber && <div className="order-shipping-note"><strong>{order.shippingProvider || 'Đơn vị giao hàng'}</strong><span>Mã vận đơn: <b>{order.trackingNumber}</b></span>{order.estimatedDelivery && <span>Dự kiến giao: {formatDate(order.estimatedDelivery, true)}</span>}</div>}
          </section>
        )}
      </div>
    </main>
  );
}

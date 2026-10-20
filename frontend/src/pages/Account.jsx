import { useCallback, useEffect, useState } from 'react';
import { FiEye, FiLock, FiLogOut, FiPackage, FiRefreshCcw, FiUser, FiXCircle } from 'react-icons/fi';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { accessoryApi } from '../api/accessoryApi';
import { orderApi } from '../api/orderApi';
import { productApi } from '../api/productApi';
import ConfirmModal from '../components/common/ConfirmModal';
import EmptyState from '../components/common/EmptyState';
import Loading from '../components/common/Loading';
import LoadError from '../components/common/LoadError';
import AccessibleDialog from '../components/common/AccessibleDialog';
import OrderLookupPanel from '../components/order/OrderLookupPanel';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { formatCurrency, formatDate } from '../utils/formatCurrency';
import { getOrderStatus } from '../utils/orderStatus';
import { isStrongEnoughPassword, validateRequired } from '../utils/validators';

const canSelfCancel = (order) =>
  ['pending', 'confirmed'].includes(order.status)
  && !['paid', 'refund_required', 'refunded'].includes(order.paymentStatus);

export default function Account() {
  const [searchParams] = useSearchParams();
  const { user, updateProfile, changePassword, logout } = useAuth();
  const { addToCart } = useCart();
  const [tab, setTab] = useState(searchParams.get('tab') || 'profile');
  const [profile, setProfile] = useState({ fullName: user.fullName, phone: user.phone, address: user.address || '' });
  const [profileErrors, setProfileErrors] = useState({});
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancelOrderId, setCancelOrderId] = useState(null);
  const [reorderingId, setReorderingId] = useState(null);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    if (['profile', 'orders', 'password'].includes(requestedTab)) setTab(requestedTab);
  }, [searchParams]);

  const loadOrders = useCallback(
    () => {
      setLoadingOrders(true);
      setOrdersError('');
      return orderApi.getMyOrders(user.id)
        .then(setOrders)
        .catch((error) => setOrdersError(error.friendlyMessage || error.message))
        .finally(() => setLoadingOrders(false));
    },
    [user.id],
  );
  useEffect(() => { loadOrders(); }, [loadOrders]);

  const saveProfile = async (event) => {
    event.preventDefault();
    const nextErrors = validateRequired({
      fullName: profile.fullName,
    });
    setProfileErrors(nextErrors);
    if (Object.keys(nextErrors).length) return toast.error('Vui lòng kiểm tra lại thông tin cá nhân');
    try {
      await updateProfile({
        fullName: profile.fullName.trim(),
        address: profile.address.trim(),
      });
      toast.success('Đã cập nhật thông tin cá nhân');
    } catch (error) {
      toast.error(error.friendlyMessage || error.message);
    }
  };
  const updateProfileField = (key, value) => {
    setProfile((current) => ({ ...current, [key]: value }));
    setProfileErrors((current) => ({ ...current, [key]: '' }));
  };
  const savePassword = async (event) => {
    event.preventDefault();
    if (!isStrongEnoughPassword(passwords.newPassword)) return toast.error('Mật khẩu mới cần ít nhất 6 ký tự');
    if (passwords.newPassword !== passwords.confirmPassword) return toast.error('Mật khẩu xác nhận không khớp');
    try {
      await changePassword(passwords);
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Đổi mật khẩu thành công');
    } catch (error) {
      toast.error(error.message);
    }
  };
  const cancelOrder = async () => {
    try {
      await orderApi.cancel(cancelOrderId);
      setCancelOrderId(null);
      await loadOrders();
      toast.success('Đã hủy đơn hàng');
    } catch (error) {
      toast.error(error.friendlyMessage || error.message);
    }
  };
  const reorder = async (order) => {
    if (reorderingId) return;
    setReorderingId(order.id);
    try {
      const resolved = await Promise.all(order.items.map(async (item) => {
        const type = item.type === 'accessory' || item.accessoryId ? 'accessory' : 'product';
        const id = type === 'accessory'
          ? item.accessoryId || item.id
          : item.productId || item.id;
        try {
          const current = type === 'accessory'
            ? await accessoryApi.getById(id)
            : await productApi.getById(id);
          return { current, historical: item, type };
        } catch {
          return { current: null, historical: item, type };
        }
      }));
      const unavailable = [];
      let added = 0;
      resolved.forEach(({ current, historical, type }) => {
        if (!current || current.status !== 'active' || Number(current.stock) <= 0) {
          unavailable.push(historical.name);
          return;
        }
        const quantity = Math.min(Number(historical.quantity) || 1, Number(current.stock));
        addToCart(current, quantity, type);
        added += 1;
      });
      if (added) toast.success('Đã thêm lại sản phẩm còn hàng vào giỏ hàng');
      if (unavailable.length) {
        toast.error(`Không thể thêm: ${unavailable.join(', ')}`);
      }
    } catch (error) {
      toast.error(error.friendlyMessage || error.message);
    } finally {
      setReorderingId(null);
    }
  };

  return (
    <main className="page-shell account-page">
      <div className="container">
        <div className="page-title-row"><div><span className="eyebrow">Khu vực thành viên</span><h1>Tài khoản của tôi</h1></div></div>
        <div className="account-layout">
          <aside className="account-sidebar panel">
            <div className="account-user"><div>{(user.fullName || user.phone || '?').charAt(0)}</div><span><strong>{user.fullName}</strong><small>{user.phone}</small></span></div>
            <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}><FiUser /> Thông tin cá nhân</button>
            <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}><FiPackage /> Đơn hàng của tôi</button>
            <button className={tab === 'password' ? 'active' : ''} onClick={() => setTab('password')}><FiLock /> Đổi mật khẩu</button>
            <button className="logout" onClick={logout}><FiLogOut /> Đăng xuất</button>
          </aside>
          <section className="account-content panel">
            {tab === 'profile' && (
              <form onSubmit={saveProfile}>
                <div className="content-heading"><h2>Thông tin cá nhân</h2><p>Cập nhật thông tin dùng cho đơn hàng và liên hệ.</p></div>
                <div className="form-grid">
                  <label className="form-field"><span>Họ và tên *</span><input aria-invalid={Boolean(profileErrors.fullName)} aria-describedby={profileErrors.fullName ? 'profile-fullName-error' : undefined} value={profile.fullName} onChange={(event) => updateProfileField('fullName', event.target.value)} />{profileErrors.fullName && <small id="profile-fullName-error">{profileErrors.fullName}</small>}</label>
                  <label className="form-field"><span>Số điện thoại đăng nhập</span><input value={profile.phone} readOnly /><small>Đã xác minh qua SMS</small></label>
                  <label className="form-field full"><span>Địa chỉ</span><textarea rows="3" value={profile.address} onChange={(event) => updateProfileField('address', event.target.value)} /></label>
                </div>
                <button className="btn btn-primary">Lưu thay đổi</button>
              </form>
            )}
            {tab === 'orders' && (
              <div>
                <div className="content-heading"><h2>Đơn hàng của tôi</h2><p>Theo dõi trạng thái và xem lại lịch sử mua sắm.</p></div>
                <OrderLookupPanel initialPhone={user.phone} />
                {loadingOrders ? <Loading /> : ordersError ? (
                  <LoadError message={ordersError} onRetry={loadOrders} />
                ) : orders.length === 0 ? <EmptyState title="Bạn chưa có đơn hàng" actionLabel="Mua sắm ngay" actionTo="/products" /> : (
                  <div className="account-orders">
                    {orders.map((order) => {
                      const status = getOrderStatus(order.status);
                      return (
                        <article key={order.id}>
                           <div className="order-card-head"><span><small>Mã đơn</small><strong>{order.orderNumber}</strong></span><span><small>Ngày đặt</small><strong>{formatDate(order.createdAt)}</strong></span><span className={`status-badge ${status.className}`}>{status.label}</span></div>
                           <div className="order-preview"><img src={order.items[0].image} alt="" /><div><strong>{order.items[0].name}</strong><small>{order.items.length > 1 ? `và ${order.items.length - 1} sản phẩm khác` : `${order.items[0].quantity} sản phẩm`}</small></div><b>{formatCurrency(order.total)}</b></div>
                           {order.trackingNumber && <div className="order-shipping-note"><strong>{order.shippingProvider || 'Đơn vị giao hàng'}</strong><span>Mã vận đơn: <b>{order.trackingNumber}</b></span>{order.estimatedDelivery && <span>Dự kiến giao: {formatDate(order.estimatedDelivery, true)}</span>}</div>}
                           <div className="order-card-actions"><button onClick={() => setSelectedOrder(order)}><FiEye /> Chi tiết</button><button disabled={reorderingId === order.id} onClick={() => reorder(order)}><FiRefreshCcw /> {reorderingId === order.id ? 'Đang thêm…' : 'Đặt lại'}</button>{canSelfCancel(order) && <button className="danger" onClick={() => setCancelOrderId(order.id)}><FiXCircle /> Hủy đơn</button>}</div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {tab === 'password' && (
              <form onSubmit={savePassword}>
                <div className="content-heading"><h2>Đổi mật khẩu</h2><p>Sử dụng mật khẩu có ít nhất 6 ký tự để bảo vệ tài khoản.</p></div>
                <div className="password-form">
                  <label className="form-field"><span>Mật khẩu hiện tại</span><input type="password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} required /></label>
                  <label className="form-field"><span>Mật khẩu mới</span><input type="password" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} required /></label>
                  <label className="form-field"><span>Xác nhận mật khẩu mới</span><input type="password" value={passwords.confirmPassword} onChange={(event) => setPasswords({ ...passwords, confirmPassword: event.target.value })} required /></label>
                </div>
                <button className="btn btn-primary">Cập nhật mật khẩu</button>
              </form>
            )}
          </section>
        </div>
      </div>
      {selectedOrder && (
        <AccessibleDialog
          open
          title={`Chi tiết đơn ${selectedOrder.orderNumber}`}
          className="order-detail-modal"
          onClose={() => setSelectedOrder(null)}
        >
            <button className="icon-button modal-close" aria-label="Đóng chi tiết đơn" onClick={() => setSelectedOrder(null)}>×</button>
             <h2>Chi tiết đơn {selectedOrder.orderNumber}</h2>
             {selectedOrder.items.map((item) => <div className="modal-order-item" key={item.id}><img src={item.image} alt={item.name} /><span><strong>{item.name}</strong><small>{formatCurrency(item.price)} × {item.quantity}</small></span><b>{formatCurrency(item.price * item.quantity)}</b></div>)}
             {selectedOrder.trackingNumber && <div className="order-shipping-note"><strong>{selectedOrder.shippingProvider || 'Đơn vị giao hàng'}</strong><span>Mã vận đơn: <b>{selectedOrder.trackingNumber}</b></span>{selectedOrder.estimatedDelivery && <span>Dự kiến giao: {formatDate(selectedOrder.estimatedDelivery, true)}</span>}</div>}
             <div className="success-total"><span>Tổng thanh toán</span><strong>{formatCurrency(selectedOrder.total)}</strong></div>
        </AccessibleDialog>
      )}
      <ConfirmModal open={Boolean(cancelOrderId)} title="Hủy đơn hàng?" message="Đơn hàng sẽ được chuyển sang trạng thái đã hủy và không thể khôi phục." onCancel={() => setCancelOrderId(null)} onConfirm={cancelOrder} />
    </main>
  );
}

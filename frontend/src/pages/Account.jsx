import { useCallback, useEffect, useState } from 'react';
import { FiEye, FiGift, FiLock, FiLogOut, FiPackage, FiRefreshCcw, FiUser, FiXCircle } from 'react-icons/fi';
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
import MyVouchers from '../components/order/MyVouchers';
import OrderLookupPanel from '../components/order/OrderLookupPanel';
import ShippingAddressFields from '../components/order/ShippingAddressFields';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { useWards } from '../hooks/useWards';
import { formatCurrency, formatDate } from '../utils/formatCurrency';
import { getOrderStatus } from '../utils/orderStatus';
import { emptyShippingAddress, pickShippingAddress, validateShippingAddress } from '../utils/shippingAddress';
import { matchWard } from '../utils/wards';
import { isStrongEnoughPassword, validateRequired } from '../utils/validators';

// Customers may cancel only before the shop confirms the order (same rule as the backend).
// Google/Facebook accounts have no login phone and no password.
const SOCIAL_PROVIDER_NAMES = { google: 'Google', facebook: 'Facebook' };
const accountTabs = (socialProvider) => (
  socialProvider ? ['profile', 'orders', 'vouchers'] : ['profile', 'orders', 'vouchers', 'password']
);

const canSelfCancel = (order) =>
  order.status === 'pending'
  && !['paid', 'refund_required', 'refunded'].includes(order.paymentStatus);

export default function Account() {
  const [searchParams] = useSearchParams();
  const { user, updateProfile, changePassword, logout } = useAuth();
  const { addToCart } = useCart();
  const socialProvider = SOCIAL_PROVIDER_NAMES[user.authProvider];
  const [tab, setTab] = useState(() => {
    const requestedTab = searchParams.get('tab');
    return accountTabs(socialProvider).includes(requestedTab) ? requestedTab : 'profile';
  });
  const [profile, setProfile] = useState({ fullName: user.fullName, phone: user.phone });
  const [profileErrors, setProfileErrors] = useState({});
  const [shippingAddress, setShippingAddress] = useState(() => (
    user.shippingAddress ? pickShippingAddress(user.shippingAddress) : emptyShippingAddress(user)
  ));
  const [addressErrors, setAddressErrors] = useState({});
  const [savingAddress, setSavingAddress] = useState(false);
  const { wards, ready: wardsReady, failed: wardsFailed } = useWards(shippingAddress.province);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancelOrderId, setCancelOrderId] = useState(null);
  const [reorderingId, setReorderingId] = useState(null);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    if (accountTabs(socialProvider).includes(requestedTab)) setTab(requestedTab);
  }, [searchParams, socialProvider]);

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
      await updateProfile({ fullName: profile.fullName.trim() });
      toast.success('Đã cập nhật thông tin cá nhân');
    } catch (error) {
      toast.error(error.friendlyMessage || error.message);
    }
  };
  const updateProfileField = (key, value) => {
    setProfile((current) => ({ ...current, [key]: value }));
    setProfileErrors((current) => ({ ...current, [key]: '' }));
  };
  const updateAddressField = (key, value) => {
    setShippingAddress((current) => ({ ...current, [key]: value }));
    setAddressErrors((current) => ({ ...current, [key]: '' }));
  };
  const saveShippingAddress = async (event) => {
    event.preventDefault();
    const nextErrors = validateShippingAddress(shippingAddress, { wards, wardsReady });
    setAddressErrors(nextErrors);
    if (Object.keys(nextErrors).length) return toast.error('Vui lòng kiểm tra lại địa chỉ nhận hàng');
    const address = pickShippingAddress({
      ...shippingAddress,
      ward: (wardsReady && matchWard(wards, shippingAddress.ward)) || shippingAddress.ward,
    });
    setSavingAddress(true);
    try {
      await updateProfile({ shippingAddress: address });
      setShippingAddress(address);
      toast.success('Đã lưu địa chỉ nhận hàng mặc định');
    } catch (error) {
      toast.error(error.friendlyMessage || error.message);
    } finally {
      setSavingAddress(false);
    }
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
            <div className="account-user"><div>{(user.fullName || user.phone || '?').charAt(0)}</div><span><strong>{user.fullName}</strong><small>{user.phone || user.email || `Tài khoản ${socialProvider}`}</small></span></div>
            <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}><FiUser /> Thông tin cá nhân</button>
            <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}><FiPackage /> Đơn hàng của tôi</button>
            <button className={tab === 'vouchers' ? 'active' : ''} onClick={() => setTab('vouchers')}><FiGift /> Voucher của tôi</button>
            {!socialProvider && <button className={tab === 'password' ? 'active' : ''} onClick={() => setTab('password')}><FiLock /> Đổi mật khẩu</button>}
            <button className="logout" onClick={logout}><FiLogOut /> Đăng xuất</button>
          </aside>
          <section className="account-content panel">
            {tab === 'profile' && (
              <form onSubmit={saveProfile}>
                <div className="content-heading"><h2>Thông tin cá nhân</h2><p>Cập nhật thông tin dùng cho đơn hàng và liên hệ.</p></div>
                <div className="form-grid">
                  <label className="form-field"><span>Họ và tên *</span><input aria-invalid={Boolean(profileErrors.fullName)} aria-describedby={profileErrors.fullName ? 'profile-fullName-error' : undefined} value={profile.fullName} onChange={(event) => updateProfileField('fullName', event.target.value)} />{profileErrors.fullName && <small id="profile-fullName-error">{profileErrors.fullName}</small>}</label>
                  {socialProvider ? (
                    <label className="form-field"><span>Đăng nhập bằng</span><input value={user.email ? `${socialProvider} · ${user.email}` : socialProvider} readOnly /><small>Số điện thoại nhận hàng nhập ở địa chỉ bên dưới hoặc khi đặt hàng</small></label>
                  ) : (
                    <label className="form-field"><span>Số điện thoại đăng nhập</span><input value={profile.phone || ''} readOnly /><small>Dùng để đăng nhập, không thay đổi được</small></label>
                  )}
                </div>
                <button className="btn btn-primary">Lưu thay đổi</button>
              </form>
            )}
            {tab === 'profile' && (
              <form className="account-address-form" onSubmit={saveShippingAddress}>
                <div className="content-heading"><h2>Địa chỉ nhận hàng mặc định</h2><p>Tự điền sẵn khi thanh toán. Địa chỉ theo đơn vị hành chính mới (tỉnh/thành, phường/xã), không còn quận/huyện.</p></div>
                <ShippingAddressFields
                  idPrefix="profile-address"
                  value={shippingAddress}
                  errors={addressErrors}
                  onChange={updateAddressField}
                  wards={wards}
                  wardsFailed={wardsFailed}
                />
                <button className="btn btn-primary" disabled={savingAddress}>{savingAddress ? 'Đang lưu…' : 'Lưu địa chỉ'}</button>
              </form>
            )}
            {tab === 'orders' && (
              <div>
                <div className="content-heading"><h2>Đơn hàng của tôi</h2><p>Theo dõi trạng thái và xem lại lịch sử mua sắm.</p></div>
                <OrderLookupPanel initialPhone={user.phone || user.shippingAddress?.phone || ''} />
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
                           {order.status === 'confirmed' && <p className="order-cancel-note">Đơn đã được cửa hàng xác nhận nên không thể tự hủy. Cần hỗ trợ, vui lòng liên hệ cửa hàng.</p>}
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {tab === 'vouchers' && (
              <div>
                <div className="content-heading"><h2>Voucher của tôi</h2><p>Ưu đãi riêng cửa hàng tặng cho bạn. Mỗi mã dùng một lần, nhập ở bước giỏ hàng.</p></div>
                <MyVouchers />
              </div>
            )}
            {tab === 'password' && !socialProvider && (
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

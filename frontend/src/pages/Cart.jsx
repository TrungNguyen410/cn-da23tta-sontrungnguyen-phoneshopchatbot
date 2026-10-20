import { useState } from 'react';
import { FiChevronRight, FiTrash2 } from 'react-icons/fi';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import CartItem from '../components/cart/CartItem';
import CartSummary from '../components/cart/CartSummary';
import EmptyState from '../components/common/EmptyState';
import ConfirmModal from '../components/common/ConfirmModal';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';

export default function Cart() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const cart = useCart();
  const [confirmClear, setConfirmClear] = useState(false);
  const [removeId, setRemoveId] = useState(null);
  const shippingVoucherPending = cart.voucher?.type === 'shipping';

  if (cart.cartItems.length === 0) {
    return (
      <main className="page-shell">
        <div className="container narrow-page">
          <EmptyState title="Giỏ hàng đang trống" description="Thêm sản phẩm bạn yêu thích để tiếp tục mua sắm." actionLabel="Khám phá sản phẩm" actionTo="/products" />
        </div>
      </main>
    );
  }

  const checkout = () => {
    if (!isAuthenticated) {
      toast.info('Vui lòng đăng nhập để tiếp tục thanh toán');
      return navigate('/login', { state: { from: location } });
    }
    navigate('/checkout');
  };

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="breadcrumbs"><Link to="/">Trang chủ</Link><FiChevronRight /><span>Giỏ hàng</span></nav>
        <div className="page-title-row">
          <div><span className="eyebrow">Sản phẩm đã chọn</span><h1>Giỏ hàng của bạn</h1></div>
          <button className="text-danger-button" onClick={() => setConfirmClear(true)}><FiTrash2 /> Xóa toàn bộ</button>
        </div>
        <div className="cart-layout">
          <section className="cart-items panel">
            {cart.cartItems.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onIncrease={() => cart.increaseQuantity(item.id)}
                onDecrease={() => cart.decreaseQuantity(item.id)}
                onRemove={() => setRemoveId(item.id)}
              />
            ))}
          </section>
          <CartSummary
            subtotal={cart.subtotal}
            discount={shippingVoucherPending ? 0 : cart.discount}
            shippingVoucherPending={shippingVoucherPending}
            onCheckout={checkout}
          />
        </div>
      </div>
      <ConfirmModal
        open={confirmClear}
        title="Xóa toàn bộ giỏ hàng?"
        message="Tất cả sản phẩm và mã giảm giá đã áp dụng sẽ bị xóa."
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => { cart.clearCart(); setConfirmClear(false); toast.success('Đã xóa giỏ hàng'); }}
      />
      <ConfirmModal
        open={Boolean(removeId)}
        title="Xóa sản phẩm?"
        message="Sản phẩm sẽ được xóa khỏi giỏ hàng của bạn."
        onCancel={() => setRemoveId(null)}
        onConfirm={() => { cart.removeFromCart(removeId); setRemoveId(null); toast.success('Đã xóa sản phẩm'); }}
      />
    </main>
  );
}

import { FiArrowRight, FiShield } from 'react-icons/fi';
import { formatCurrency } from '../../utils/formatCurrency';
import VoucherBox from './VoucherBox';

export default function CartSummary({ subtotal, discount, shippingVoucherPending = false, onCheckout, checkoutLabel = 'Tiến hành thanh toán' }) {
  return (
    <aside className="cart-summary panel">
      <h3>Tóm tắt đơn hàng</h3>
      <VoucherBox />
      <div className="summary-lines">
        <div><span>Tạm tính</span><strong>{formatCurrency(subtotal)}</strong></div>
        <div><span>Phí vận chuyển</span><strong>Tính theo tỉnh/thành ở bước thanh toán</strong></div>
        {shippingVoucherPending ? (
          <div><span>Ưu đãi vận chuyển</span><strong>Áp dụng khi thanh toán</strong></div>
        ) : <div className="discount-line"><span>Giảm giá</span><strong>-{formatCurrency(discount)}</strong></div>}
      </div>
      <div className="summary-total"><span>Tạm tính sau giảm giá</span><strong>{formatCurrency(Math.max(0, subtotal - discount))}</strong></div>
      <button className="btn btn-primary checkout-button" onClick={onCheckout}>
        {checkoutLabel} <FiArrowRight />
      </button>
      <p className="secure-note"><FiShield /> Thanh toán an toàn và bảo mật</p>
    </aside>
  );
}

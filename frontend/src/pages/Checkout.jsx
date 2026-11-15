import { useEffect, useMemo, useRef, useState } from 'react';
import { FiCheckCircle, FiCreditCard, FiEdit2, FiMapPin, FiPackage, FiUser } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { orderApi } from '../api/orderApi';
import { paymentApi } from '../api/paymentApi';
import EmptyState from '../components/common/EmptyState';
import ShippingAddressFields from '../components/order/ShippingAddressFields';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { useWards } from '../hooks/useWards';
import { PAYMENT_METHODS } from '../utils/constants';
import { calculateVoucherDiscount } from '../utils/checkoutPricing';
import { formatCurrency } from '../utils/formatCurrency';
import { getShippingQuote } from '../utils/shipping';
import {
  emptyShippingAddress,
  formatShippingAddress,
  isUsableSavedAddress,
  pickShippingAddress,
  validateShippingAddress,
} from '../utils/shippingAddress';
import { matchWard } from '../utils/wards';
import { trackEvent } from '../utils/analytics';

const paymentHint = (method) => {
  if (method === 'cod') return 'Thanh toán trực tiếp cho nhân viên giao hàng';
  if (method === 'bank') return 'Đặt hàng rồi quét mã VietQR theo mã đơn; thanh toán được xác nhận tự động';
  if (method === 'momo') return 'Quét mã MoMo và xác nhận thanh toán trước khi đặt hàng';
  return 'Thanh toán an toàn trên cổng VNPay; PhoneShopAI không thu thập thông tin thẻ';
};
const PAYMENT_CONFIRM_METHODS = ['momo'];
const providerNameFor = (method) => (method === 'card' ? 'vnpay' : method);
const createCheckoutKey = () =>
  `checkout-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
const readPendingCheckout = () => {
  try {
    const pending = JSON.parse(sessionStorage.getItem('techphone_pending_payment') || 'null');
    return typeof pending?.checkoutKey === 'string' && pending.checkoutKey.startsWith('checkout-')
      ? pending
      : null;
  } catch {
    return null;
  }
};

export default function Checkout() {
  const navigate = useNavigate();
  const { user, updateLocalUser } = useAuth();
  const cart = useCart();
  const [pendingCheckout] = useState(readPendingCheckout);
  const retryingVnpay = Boolean(pendingCheckout);
  // A complete saved address skips the form; "Giao đến địa chỉ khác" opens it again.
  const [savedAddress] = useState(() => (
    isUsableSavedAddress(user?.shippingAddress) ? pickShippingAddress(user.shippingAddress) : null
  ));
  const [useSavedAddress, setUseSavedAddress] = useState(Boolean(savedAddress));
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [form, setForm] = useState(() => ({
    ...(savedAddress || emptyShippingAddress(user || {})),
    note: '',
    paymentMethod: retryingVnpay ? 'card' : 'cod',
  }));
  const { wards, ready: wardsReady, failed: wardsFailed } = useWards(form.province);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [paymentConfirmStep, setPaymentConfirmStep] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState({
    providers: { cod: { enabled: true } },
  });
  const [paymentReference] = useState(() => `TP${Date.now().toString().slice(-8)}`);
  const paymentConfirmRef = useRef(null);
  const checkoutTrackedRef = useRef(false);
  const [initialCheckoutKey] = useState(
    () => pendingCheckout?.checkoutKey || createCheckoutKey(),
  );
  const idempotencyKeyRef = useRef(initialCheckoutKey);
  const submissionInFlightRef = useRef(false);

  useEffect(() => {
    let active = true;
    paymentApi.getConfig()
      .then((config) => {
        if (active) setPaymentConfig(config);
      })
      .catch(() => {
        if (active) setPaymentConfig({ providers: { cod: { enabled: true } } });
      });
    return () => { active = false; };
  }, []);

  const transferContent = useMemo(
    () => `${paymentReference} ${form.phone || 'PHONESHOPAI'}`.trim().toUpperCase(),
    [form.phone, paymentReference],
  );
  const shipping = useMemo(
    () => getShippingQuote({ province: form.province, subtotal: cart.subtotal }),
    [cart.subtotal, form.province],
  );
  const checkoutDiscount = useMemo(
    () => calculateVoucherDiscount(cart.voucher, cart.subtotal, shipping.fee),
    [cart.subtotal, cart.voucher, shipping.fee],
  );
  const orderTotal = Math.max(0, cart.subtotal + shipping.fee - checkoutDiscount);
  const momoDisplay = paymentConfig.providers?.momo?.display || {};

  useEffect(() => {
    if (checkoutTrackedRef.current || !cart.cartItems.length) return;
    checkoutTrackedRef.current = true;
    trackEvent('begin_checkout', {
      item_count: cart.cartCount,
      value: orderTotal,
      currency: 'VND',
    });
  }, [cart.cartCount, cart.cartItems.length, orderTotal]);

  const momoQrUrl = useMemo(
    () => `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`MOMO|${momoDisplay.phone || ''}|${orderTotal}|${transferContent}`)}`,
    [momoDisplay.phone, orderTotal, transferContent],
  );

  if (cart.cartItems.length === 0) {
    return (
      <main className="page-shell">
        <div className="container narrow-page">
          <EmptyState title="Không có sản phẩm để thanh toán" actionLabel="Tiếp tục mua sắm" actionTo="/products" />
        </div>
      </main>
    );
  }

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
    if (key === 'paymentMethod') setPaymentConfirmStep(false);
  };
  const showAddressForm = () => {
    setUseSavedAddress(false);
    setSaveAsDefault(false);
    setErrors({});
    setForm((current) => ({ ...current, address: '', province: '', ward: '' }));
  };
  const restoreSavedAddress = () => {
    setUseSavedAddress(true);
    setSaveAsDefault(false);
    setErrors({});
    setForm((current) => ({ ...current, ...savedAddress }));
  };

  const validateCheckout = () => {
    const nextErrors = validateShippingAddress(form, { wards, wardsReady });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      // A saved address that no longer validates is reopened so the customer can fix it.
      if (useSavedAddress) setUseSavedAddress(false);
      toast.error('Vui lòng kiểm tra lại thông tin nhận hàng');
      return false;
    }
    return true;
  };
  // The first order saves the address; afterwards only a new address with "save as default" ticked does.
  const shouldSaveAddress = !useSavedAddress && (!savedAddress || saveAsDefault);

  const checkoutItems = cart.cartItems.map((item) => {
    const type = item.type === 'accessory' || item.accessoryId ? 'accessory' : 'product';
    const id = type === 'accessory'
      ? item.accessoryId || item.productId || item.id
      : item.productId || item.id;
    return {
      id,
      ...(type === 'accessory' ? { accessoryId: id } : { productId: id }),
      type,
      quantity: item.quantity,
    };
  });

  const receiver = () => pickShippingAddress({
    ...form,
    ward: (wardsReady && matchWard(wards, form.ward)) || form.ward,
  });
  const orderPayload = () => ({
    items: checkoutItems,
    customer: receiver(),
    saveAddress: shouldSaveAddress,
    note: [
      form.note.trim(),
      form.paymentMethod === 'momo' ? `Ma giao dich MoMo: ${transferContent}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    paymentMethod: form.paymentMethod,
    voucherCode: cart.voucher?.code || null,
  });

  const createOrder = async () => {
    if (submissionInFlightRef.current) return;
    submissionInFlightRef.current = true;
    setSubmitting(true);
    try {
      const payload = orderPayload();
      const order = await orderApi.create(payload, idempotencyKeyRef.current);
      if (payload.saveAddress) updateLocalUser?.({ shippingAddress: payload.customer });
      cart.clearCart();
      navigate(`/order-success/${order.id}`, { state: { order }, replace: true });
    } catch (error) {
      toast.error(error.friendlyMessage || error.message);
    } finally {
      submissionInFlightRef.current = false;
      setSubmitting(false);
    }
  };

  const startVnpayCheckout = async () => {
    if (submissionInFlightRef.current) return;
    submissionInFlightRef.current = true;
    setSubmitting(true);
    try {
      const payload = { ...orderPayload(), paymentMethod: 'card' };
      const result = await paymentApi.createVnpayCheckout(payload, idempotencyKeyRef.current);
      if (payload.saveAddress) updateLocalUser?.({ shippingAddress: payload.customer });
      try {
        sessionStorage.setItem('techphone_pending_payment', JSON.stringify({
          orderId: result.order.id,
          orderNumber: result.order.orderNumber,
          phone: result.order.customer.phone,
          reference: result.transaction.reference,
          checkoutKey: idempotencyKeyRef.current,
          paymentMethod: 'card',
          ...(result.resultProof ? { resultProof: result.resultProof } : {}),
          createdAt: Date.now(),
        }));
      } catch {
        // Payment can continue when browser storage is unavailable.
      }
      if (result.paymentUrl.startsWith('/')) navigate(result.paymentUrl);
      else window.location.assign(result.paymentUrl);
    } catch (error) {
      toast.error(error.friendlyMessage || error.message);
      submissionInFlightRef.current = false;
      setSubmitting(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!validateCheckout()) return;

    if (form.paymentMethod === 'card') {
      await startVnpayCheckout();
      return;
    }

    if (PAYMENT_CONFIRM_METHODS.includes(form.paymentMethod) && !paymentConfirmStep) {
      setPaymentConfirmStep(true);
      toast.info('Hoàn tất thanh toán và bấm "Tôi đã thanh toán" để tạo đơn hàng.');
      requestAnimationFrame(() => paymentConfirmRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }

    await createOrder();
  };

  return (
    <main className="page-shell checkout-page">
      <div className="container">
        <div className="page-hero small">
          <div><span>Chỉ còn một bước</span><h1>Hoàn tất đơn hàng</h1></div>
          <p>Kiểm tra thông tin trước khi xác nhận đặt hàng.</p>
        </div>
        <form className="checkout-layout" onSubmit={submit}>
          <div className="checkout-main">
            <section className="panel checkout-section">
              <h2><FiUser /> Thông tin người nhận</h2>
              {useSavedAddress ? (
                <div className="saved-address-card">
                  <FiMapPin aria-hidden="true" />
                  <div>
                    <small>Giao đến địa chỉ đã lưu</small>
                    <strong>{form.fullName} · {form.phone}</strong>
                    <p>{formatShippingAddress(form)}</p>
                    <span>{form.email}</span>
                  </div>
                  <button type="button" className="btn btn-outline" onClick={showAddressForm}>
                    <FiEdit2 /> Giao đến địa chỉ khác
                  </button>
                </div>
              ) : (
                <>
                  {savedAddress && (
                    <div className="address-switch">
                      <span>Đơn này giao đến địa chỉ mới</span>
                      <button type="button" onClick={restoreSavedAddress}>Dùng địa chỉ đã lưu</button>
                    </div>
                  )}
                  <ShippingAddressFields
                    idPrefix="checkout"
                    value={form}
                    errors={errors}
                    onChange={update}
                    wards={wards}
                    wardsFailed={wardsFailed}
                  />
                  {savedAddress ? (
                    <label className="save-address-option">
                      <input type="checkbox" checked={saveAsDefault} onChange={(event) => setSaveAsDefault(event.target.checked)} />
                      <span>Lưu làm địa chỉ mặc định cho lần mua sau</span>
                    </label>
                  ) : (
                    <p className="checkout-address-note"><FiCheckCircle /> Địa chỉ này sẽ được lưu vào tài khoản để lần sau không phải nhập lại</p>
                  )}
                </>
              )}
              <div className="form-grid checkout-note-grid">
                <label className="form-field full">
                  <span>Ghi chú đơn hàng</span>
                  <textarea
                    rows="3"
                    value={form.note}
                    onChange={(event) => update('note', event.target.value)}
                    placeholder="Ví dụ: giao giờ hành chính"
                  />
                </label>
              </div>
            </section>

            <section className="panel checkout-section">
              <h2><FiCreditCard /> Phương thức thanh toán</h2>
              <div className="payment-options">
                {PAYMENT_METHODS.filter(
                  (method) => paymentConfig.providers?.[providerNameFor(method.value)]?.enabled,
                ).map((method) => (
                  <label className={form.paymentMethod === method.value ? 'active' : ''} key={method.value}>
                    <input
                      type="radio"
                      name="payment"
                      value={method.value}
                      checked={form.paymentMethod === method.value}
                      disabled={retryingVnpay && method.value !== 'card'}
                      onChange={(event) => update('paymentMethod', event.target.value)}
                    />
                    <span><strong>{method.label}</strong><small>{paymentHint(method.value)}</small></span>
                  </label>
                ))}
              </div>
            </section>

            {paymentConfirmStep && form.paymentMethod === 'momo' && <section className="panel checkout-section bank-transfer-section" ref={paymentConfirmRef}><h2><FiCreditCard /> Thanh toán qua MoMo</h2><div className="bank-transfer-grid"><div className="bank-qr-card"><img src={momoQrUrl} alt="Mã QR thanh toán MoMo" /></div><div className="bank-transfer-info"><span>Quét mã trong ứng dụng MoMo</span><div><small>Số điện thoại nhận</small><strong>{momoDisplay.phone}</strong></div><div><small>Chủ tài khoản</small><strong>{momoDisplay.accountName}</strong></div><div><small>Số tiền</small><strong>{formatCurrency(orderTotal)}</strong></div><div><small>Nội dung</small><strong>{transferContent}</strong></div></div></div><p className="bank-transfer-note">Sau khi thanh toán qua MoMo, bấm <strong>Tôi đã thanh toán</strong> để hoàn tất đơn hàng.</p></section>}
          </div>

          <aside className="panel checkout-order">
            <h2><FiPackage /> Đơn hàng ({cart.cartCount})</h2>
            <div className="checkout-items">
              {cart.cartItems.map((item) => (
                <div key={item.id}>
                  <img src={item.image} alt={item.name} />
                  <span><strong>{item.name}</strong><small>Số lượng: {item.quantity}</small></span>
                  <b>{formatCurrency(item.price * item.quantity)}</b>
                </div>
              ))}
            </div>
            <div className="summary-lines">
              <div><span>Tạm tính</span><strong>{formatCurrency(cart.subtotal)}</strong></div>
              <div><span>Phí vận chuyển</span><strong>{shipping.fee ? formatCurrency(shipping.fee) : 'Miễn phí'}</strong></div>
              <div><span>Dự kiến giao</span><strong>{shipping.eta}</strong></div>
              <div className="discount-line"><span>Giảm giá</span><strong>-{formatCurrency(checkoutDiscount)}</strong></div>
            </div>
            <div className="summary-total"><span>Tổng thanh toán</span><strong>{formatCurrency(orderTotal)}</strong></div>
            <button className="btn btn-primary checkout-button" disabled={submitting}>
              {submitting
                ? form.paymentMethod === 'card' ? 'Đang mở VNPay…' : 'Đang tạo đơn hàng...'
                : paymentConfirmStep
                  ? 'Tôi đã thanh toán'
                  : form.paymentMethod === 'card'
                    ? 'Thanh toán qua VNPay'
                  : PAYMENT_CONFIRM_METHODS.includes(form.paymentMethod)
                    ? 'Tiếp tục thanh toán'
                    : 'Xác nhận đặt hàng'}
            </button>
            {paymentConfirmStep && (
              <>
                <button type="button" className="bank-edit-button" onClick={() => setPaymentConfirmStep(false)}>
                  Quay lại sửa thông tin
                </button>
                <p className="checkout-address-note">
                  <FiCheckCircle /> Chưa tạo đơn hàng cho tới khi bạn xác nhận đã thanh toán
                </p>
              </>
            )}
            <p className="checkout-address-note"><FiMapPin /> Giao đến địa chỉ bạn đã cung cấp</p>
          </aside>
        </form>
      </div>
    </main>
  );
}

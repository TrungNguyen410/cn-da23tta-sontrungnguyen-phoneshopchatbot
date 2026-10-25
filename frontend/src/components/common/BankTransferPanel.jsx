import { useEffect, useState } from 'react';
import { FiCheckCircle, FiCreditCard, FiLoader } from 'react-icons/fi';
import { orderApi } from '../../api/orderApi';
import { paymentApi } from '../../api/paymentApi';
import { formatCurrency } from '../../utils/formatCurrency';

const POLL_INTERVAL_MS = 5000;

export const buildVietQrUrl = (display, amount, content) => {
  const params = new URLSearchParams({
    amount: String(amount),
    addInfo: content,
    accountName: display.accountName || '',
  });
  return `https://img.vietqr.io/image/${display.bankBin}-${display.accountNumber}-compact2.png?${params.toString()}`;
};

export default function BankTransferPanel({ order, onPaid }) {
  const [bank, setBank] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus || 'pending');

  useEffect(() => {
    let active = true;
    paymentApi.getConfig()
      .then((config) => {
        if (active) setBank(config.providers?.bank?.enabled ? config.providers.bank : null);
      })
      .catch(() => {
        if (active) setBank(null);
      });
    return () => { active = false; };
  }, []);

  const waiting = paymentStatus === 'pending' || paymentStatus === 'failed';

  useEffect(() => {
    if (!bank?.autoConfirm || !waiting) return undefined;
    const timer = setInterval(() => {
      orderApi.getById(order.id)
        .then((latest) => {
          if (latest?.paymentStatus && latest.paymentStatus !== paymentStatus) {
            setPaymentStatus(latest.paymentStatus);
            if (latest.paymentStatus === 'paid') onPaid?.(latest);
          }
        })
        .catch(() => {});
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [bank?.autoConfirm, onPaid, order.id, paymentStatus, waiting]);

  if (!bank?.display) return null;

  if (paymentStatus === 'paid') {
    return (
      <section className="panel checkout-section bank-transfer-section bank-transfer-paid" role="status">
        <h2><FiCheckCircle /> Đã nhận thanh toán</h2>
        <p className="bank-transfer-note">
          PhoneShopAI đã nhận {formatCurrency(order.total)} cho đơn <strong>{order.orderNumber}</strong>.
          Đơn hàng đã được xác nhận tự động.
        </p>
      </section>
    );
  }

  const { display } = bank;
  return (
    <section className="panel checkout-section bank-transfer-section">
      <h2><FiCreditCard /> Thanh toán chuyển khoản</h2>
      <div className="bank-transfer-grid">
        <div className="bank-qr-card">
          <img src={buildVietQrUrl(display, order.total, order.orderNumber)} alt="Mã QR chuyển khoản PhoneShopAI" />
        </div>
        <div className="bank-transfer-info">
          <span>Quét QR hoặc chuyển khoản thủ công</span>
          <h3>{display.bankName}</h3>
          <div><small>Số tài khoản</small><strong>{display.accountNumber}</strong></div>
          <div><small>Chủ tài khoản</small><strong>{display.accountName}</strong></div>
          <div><small>Số tiền</small><strong>{formatCurrency(order.total)}</strong></div>
          <div><small>Nội dung chuyển khoản</small><strong>{order.orderNumber}</strong></div>
        </div>
      </div>
      <p className="bank-transfer-note">
        {bank.autoConfirm ? (
          <><FiLoader className="spin" /> Đang chờ thanh toán. Hệ thống sẽ <strong>tự động xác nhận</strong> trong vài giây sau khi nhận được tiền — vui lòng giữ đúng nội dung chuyển khoản.</>
        ) : (
          <>Vui lòng ghi đúng nội dung chuyển khoản. Nhân viên PhoneShopAI sẽ đối soát và xác nhận thanh toán.</>
        )}
      </p>
    </section>
  );
}

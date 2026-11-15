import { useCallback, useEffect, useState } from 'react';
import { FiCopy, FiGift } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { voucherApi } from '../../api/voucherApi';
import EmptyState from '../common/EmptyState';
import LoadError from '../common/LoadError';
import Loading from '../common/Loading';
import { describeVoucher, VOUCHER_STATUS } from '../../utils/voucherText';

const formatDay = (value) => new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('vi-VN');

// Gift vouchers the shop assigned to this account (one use each, only this account can redeem them).
export default function MyVouchers() {
  const [vouchers, setVouchers] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    return voucherApi.mine()
      .then(setVouchers)
      .catch((loadError) => setError(loadError.friendlyMessage || loadError.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  const copy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Đã sao chép mã ${code}, dán vào ô mã giảm giá ở giỏ hàng`);
    } catch {
      toast.error('Không sao chép được, hãy chọn và sao chép mã thủ công');
    }
  };

  if (error) return <LoadError message={error} onRetry={load} />;
  if (!vouchers) return <Loading />;
  if (!vouchers.length) {
    return <EmptyState title="Bạn chưa có voucher riêng" description="Cửa hàng sẽ gửi voucher tri ân vào đây cho khách hàng thân thiết." actionLabel="Mua sắm ngay" actionTo="/products" />;
  }

  return (
    <ul className="my-vouchers">
      {vouchers.map((voucher) => {
        const status = VOUCHER_STATUS[voucher.status] || VOUCHER_STATUS.inactive;
        const usable = voucher.status === 'available';
        return (
          <li key={voucher.id} className={usable ? '' : 'is-muted'}>
            <FiGift aria-hidden="true" />
            <div>
              <strong className="voucher-code">{voucher.code}</strong>
              <p>{describeVoucher(voucher)}</p>
              <small>{voucher.note ? `${voucher.note} · ` : ''}Hạn dùng đến {formatDay(voucher.endDate)}</small>
            </div>
            <span className={`status-badge ${status.className}`}>{status.label}</span>
            {usable && <button type="button" className="btn btn-outline" onClick={() => copy(voucher.code)}><FiCopy /> Sao chép mã</button>}
          </li>
        );
      })}
    </ul>
  );
}

import { useState } from 'react';
import { FiTag, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useCart } from '../../hooks/useCart';

export default function VoucherBox() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { voucher, applyVoucher, removeVoucher } = useCart();

  const apply = async (event) => {
    event.preventDefault();
    if (!code.trim()) return toast.error('Vui lòng nhập mã giảm giá');
    setLoading(true);
    try {
      const applied = await applyVoucher(code);
      toast.success(`Áp dụng mã ${applied.code} thành công`);
      setCode('');
    } catch (error) {
      toast.error(error.friendlyMessage || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="voucher-box">
      <div className="voucher-title"><FiTag /> Mã giảm giá</div>
      {voucher ? (
        <div className="applied-voucher">
          <div><strong>{voucher.code}</strong><span>Đã áp dụng cho đơn hàng</span></div>
          <button onClick={removeVoucher}><FiX /></button>
        </div>
      ) : (
        <form onSubmit={apply}>
          <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Nhập mã ưu đãi" />
          <button disabled={loading}>{loading ? 'Đang kiểm tra' : 'Áp dụng'}</button>
        </form>
      )}
      <small>Thử: TECH10, GIAM200K hoặc FREESHIP</small>
    </div>
  );
}

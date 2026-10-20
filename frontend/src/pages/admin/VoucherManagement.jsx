import { voucherApi } from '../../api/voucherApi';
import SimpleCrudPage from '../../components/admin/SimpleCrudPage';
import { formatCurrency } from '../../utils/formatCurrency';

export default function VoucherManagement() {
  return <SimpleCrudPage api={voucherApi} title="Danh sách voucher" singular="Voucher" createDefaults={{ code: '', type: 'percent', value: 10, minOrder: 0, maxDiscount: 0, quantity: 100, startDate: '2026-01-01', endDate: '2026-12-31', active: true }} fields={[
    { key: 'code', label: 'Mã voucher', required: true },
    { key: 'type', label: 'Loại giảm', type: 'select', options: [{ value: 'percent', label: 'Phần trăm' }, { value: 'fixed', label: 'Số tiền cố định' }, { value: 'shipping', label: 'Phí vận chuyển' }] },
    { key: 'value', label: 'Giá trị', type: 'number', required: true },
    { key: 'minOrder', label: 'Đơn tối thiểu', type: 'number', required: true },
    { key: 'maxDiscount', label: 'Giảm tối đa', type: 'number', required: true },
    { key: 'quantity', label: 'Số lượng', type: 'number', required: true },
    { key: 'startDate', label: 'Ngày bắt đầu', type: 'date', required: true },
    { key: 'endDate', label: 'Ngày kết thúc', type: 'date', required: true },
    { key: 'active', label: 'Đang hoạt động', type: 'checkbox' },
  ]} columns={[
    { key: 'code', label: 'Mã', render: (item) => <strong className="voucher-code">{item.code}</strong> },
    { key: 'type', label: 'Loại', render: (item) => item.type === 'percent' ? 'Phần trăm' : item.type === 'fixed' ? 'Cố định' : 'Phí vận chuyển' },
    { key: 'value', label: 'Giá trị', render: (item) => item.type === 'percent' ? `${item.value}%` : formatCurrency(item.value) },
    { key: 'minOrder', label: 'Đơn tối thiểu', render: (item) => formatCurrency(item.minOrder) },
    { key: 'quantity', label: 'Số lượng' },
    { key: 'active', label: 'Trạng thái', render: (item) => <span className={`status-badge ${item.active ? 'status-completed' : 'status-cancelled'}`}>{item.active ? 'Hoạt động' : 'Tạm dừng'}</span> },
  ]} />;
}

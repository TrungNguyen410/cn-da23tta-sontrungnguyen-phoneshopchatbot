import { useEffect, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  CategoryScale,
  Chart as ChartJS,
  ArcElement,
  BarElement,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { FiDollarSign, FiPackage, FiSmartphone, FiUsers } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import DataTable from '../../components/admin/DataTable';
import StatCard from '../../components/admin/StatCard';
import Loading from '../../components/common/Loading';
import { formatCurrency, formatDate } from '../../utils/formatCurrency';
import { getOrderStatus } from '../../utils/orderStatus';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const readChartColors = () => {
  const styles = getComputedStyle(document.documentElement);
  const token = (name) => styles.getPropertyValue(name).trim();
  return {
    accent: token('--color-accent'),
    danger: token('--color-danger'),
    rule: token('--color-rule-soft'),
    success: token('--color-success'),
    violet: token('--color-violet'),
    warning: token('--color-warning'),
  };
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { adminApi.getDashboard().then(setData); }, []);
  if (!data) return <Loading />;
  const chartColors = readChartColors();

  const orderColumns = [
    { key: 'orderNumber', label: 'Mã đơn', render: (order) => <strong>{order.orderNumber}</strong> },
    { key: 'customer', label: 'Khách hàng', render: (order) => <span>{order.customer.fullName}<small className="table-subtext">{order.customer.phone}</small></span> },
    { key: 'createdAt', label: 'Ngày đặt', render: (order) => formatDate(order.createdAt) },
    { key: 'total', label: 'Tổng tiền', render: (order) => <strong>{formatCurrency(order.total)}</strong> },
    { key: 'status', label: 'Trạng thái', render: (order) => { const status = getOrderStatus(order.status); return <span className={`status-badge ${status.className}`}>{status.label}</span>; } },
  ];
  const revenueData = {
    labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
    datasets: [{ label: 'Doanh thu (triệu đồng)', data: data.monthlyRevenue, backgroundColor: chartColors.accent, borderRadius: 7 }],
  };
  const statusData = {
    labels: data.orderStatus.map((item) => getOrderStatus(item.status).label),
    datasets: [{
      data: data.orderStatus.map((item) => item.count),
      backgroundColor: [
        chartColors.warning,
        chartColors.accent,
        chartColors.violet,
        chartColors.success,
        chartColors.danger,
      ],
      borderWidth: 0,
    }],
  };

  return (
    <>
      <div className="dashboard-welcome"><div><span>Cập nhật hôm nay</span><h2>Chào buổi sáng, Admin</h2><p>Đây là tình hình hoạt động mới nhất của cửa hàng.</p></div><Link className="btn btn-primary" to="/admin/products">Quản lý sản phẩm</Link></div>
      <section className="stat-grid">
        <StatCard label="Tổng sản phẩm" value={data.stats.products} change="Đang được quản lý" icon={FiSmartphone} color="blue" />
        <StatCard label="Tổng đơn hàng" value={data.stats.orders} change="Đơn hàng trong hệ thống" icon={FiPackage} color="violet" />
        <StatCard label="Khách hàng" value={data.stats.customers} change="Tài khoản khách hàng" icon={FiUsers} color="green" />
        <StatCard label="Tổng doanh thu" value={formatCurrency(data.stats.revenue)} change="Theo dữ liệu đơn hàng" icon={FiDollarSign} color="orange" />
      </section>
      <section className="chart-grid">
        <div className="admin-card chart-card"><div className="card-heading"><div><h2>Doanh thu theo tháng</h2><span>Đơn vị: triệu đồng</span></div></div><Bar data={revenueData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: chartColors.rule } }, x: { grid: { display: false } } } }} /></div>
        <div className="admin-card chart-card"><div className="card-heading"><div><h2>Trạng thái đơn hàng</h2><span>Phân bổ hiện tại</span></div></div><Doughnut data={statusData} options={{ responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } } }} /></div>
      </section>
      <section className="dashboard-bottom-grid">
        <div className="admin-table-card"><div className="admin-table-title"><div><h2>Đơn hàng gần đây</h2><span>Các đơn mới nhất</span></div><Link to="/admin/orders">Xem tất cả</Link></div><DataTable columns={orderColumns} rows={data.recentOrders} /></div>
        <div className="admin-card top-products"><div className="card-heading"><div><h2>Sản phẩm bán chạy</h2><span>Top theo số lượng bán</span></div></div>{data.topProducts.map((product, index) => <div key={product.id}><b>{index + 1}</b><img src={product.image} alt="" /><span><strong>{product.name}</strong><small>Đã bán {product.sold}</small></span><strong>{formatCurrency(product.price)}</strong></div>)}</div>
      </section>
    </>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  CategoryScale,
  Chart as ChartJS,
  ArcElement,
  BarElement,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { FiAlertTriangle, FiDollarSign, FiGift, FiPackage, FiSmartphone, FiUsers } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { adminApi } from '../../api/adminApi';
import DataTable from '../../components/admin/DataTable';
import GiftVoucherDialog from '../../components/admin/GiftVoucherDialog';
import RevenueChart from '../../components/admin/RevenueChart';
import StatCard from '../../components/admin/StatCard';
import Phone3D from '../../components/common/Phone3D';
import Loading from '../../components/common/Loading';
import LoadError from '../../components/common/LoadError';
import { useAuth } from '../../hooks/useAuth';
import { toCanvasColor } from '../../utils/canvasColor';
import { formatCurrency, formatDate } from '../../utils/formatCurrency';
import { getOrderStatus } from '../../utils/orderStatus';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler, ArcElement, Tooltip, Legend);

// Tokens use the OKLCH color space; Chart.js needs them converted before it derives hover colors.
const readChartColors = () => {
  const styles = getComputedStyle(document.documentElement);
  const token = (name) => styles.getPropertyValue(name).trim();
  ChartJS.defaults.color = toCanvasColor(token('--color-ink-muted'));
  ChartJS.defaults.borderColor = toCanvasColor(token('--color-rule-soft'));
  ChartJS.defaults.font.family = token('--font-body');
  return {
    accent: toCanvasColor(token('--color-accent')),
    accentHover: toCanvasColor(token('--color-gold-bright')),
    danger: toCanvasColor(token('--color-danger')),
    rule: toCanvasColor(token('--color-rule-soft')),
    success: toCanvasColor(token('--color-success')),
    violet: toCanvasColor(token('--color-violet')),
    warning: toCanvasColor(token('--color-warning')),
  };
};

// Charts are drawn once on canvas, so wait for the web font before the first draw.
const fontsAreLoaded = () => typeof document === 'undefined' || !document.fonts || document.fonts.status === 'loaded';

const greetingFor = (hour) => {
  if (hour < 11) return 'Chào buổi sáng';
  if (hour < 14) return 'Chào buổi trưa';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
};

const vietnamToday = () => {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1, day: now.getUTCDate() };
};
// The daily chart stops at today for the current month (future days would sit at 0)
// and stays empty for a month that has not started yet.
const daysToShow = (revenue, today) => {
  if (revenue.year === today.year && revenue.month === today.month) return Math.min(today.day, revenue.daily.length);
  const isFuture = revenue.year > today.year || (revenue.year === today.year && revenue.month > today.month);
  return isFuture ? 0 : revenue.daily.length;
};
const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);
const typeLabel = (type) => (type === 'accessory' ? 'Phụ kiện' : 'Điện thoại');
const managePath = (type) => (type === 'accessory' ? '/admin/accessories' : '/admin/products');

export default function Dashboard() {
  const { user } = useAuth();
  const [today] = useState(vietnamToday);
  const [period, setPeriod] = useState(() => ({ year: today.year, month: today.month }));
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [giftCustomer, setGiftCustomer] = useState(null);
  const [fontsReady, setFontsReady] = useState(fontsAreLoaded);
  const [reloadKey, setReloadKey] = useState(0);
  const firstPeriodRef = useRef(true);

  // The full dashboard loads once for today's period (filters only appear after it loads).
  useEffect(() => {
    let active = true;
    setLoadError('');
    adminApi.getDashboard({ year: today.year, month: today.month })
      .then((dashboard) => { if (active) setData(dashboard); })
      .catch((error) => { if (active) setLoadError(error.friendlyMessage || error.message); });
    return () => { active = false; };
  }, [reloadKey, today]);

  // Changing the year/month only refetches revenue; the previous charts stay visible meanwhile.
  useEffect(() => {
    if (firstPeriodRef.current) {
      firstPeriodRef.current = false;
      return undefined;
    }
    let active = true;
    setRefreshing(true);
    adminApi.getRevenue(period)
      .then((revenue) => {
        if (!active) return;
        setData((current) => (current ? {
          ...current,
          revenue,
          stats: { ...current.stats, revenue: revenue.monthly.reduce((sum, total) => sum + total, 0) },
        } : current));
      })
      .catch((error) => { if (active) toast.error(error.friendlyMessage || error.message); })
      .finally(() => { if (active) setRefreshing(false); });
    return () => { active = false; };
  }, [period]);

  useEffect(() => {
    if (fontsReady) return undefined;
    let active = true;
    const markReady = () => { if (active) setFontsReady(true); };
    document.fonts.ready.then(markReady, markReady);
    return () => { active = false; };
  }, [fontsReady]);
  const chartColors = useMemo(() => (fontsReady ? readChartColors() : null), [fontsReady]);

  if (loadError && !data) return <LoadError message={loadError} onRetry={() => setReloadKey((key) => key + 1)} />;
  if (!data || !chartColors) return <Loading />;

  const { revenue, lowStock } = data;
  const years = Array.from({ length: 10 }, (_, index) => today.year - index);
  const dailyValues = revenue.daily.slice(0, daysToShow(revenue, today));
  const dailyLabels = dailyValues.map((_, index) => String(index + 1));
  const isCurrentMonth = revenue.year === today.year && revenue.month === today.month;

  const orderColumns = [
    { key: 'orderNumber', label: 'Mã đơn', render: (order) => <strong>{order.orderNumber}</strong> },
    { key: 'customer', label: 'Khách hàng', render: (order) => <span>{order.customer.fullName}<small className="table-subtext">{order.customer.phone}</small></span> },
    { key: 'createdAt', label: 'Ngày đặt', render: (order) => formatDate(order.createdAt) },
    { key: 'total', label: 'Tổng tiền', render: (order) => <strong>{formatCurrency(order.total)}</strong> },
    { key: 'status', label: 'Trạng thái', render: (order) => { const status = getOrderStatus(order.status); return <span className={`status-badge ${status.className}`}>{status.label}</span>; } },
  ];
  const customerColumns = [
    { key: 'rank', label: '#', render: (customer) => <b className="rank-badge">{data.topCustomers.indexOf(customer) + 1}</b> },
    { key: 'fullName', label: 'Khách hàng', render: (customer) => <span>{customer.fullName}<small className="table-subtext">{customer.phone}</small></span> },
    { key: 'orderCount', label: 'Đơn đã giao', render: (customer) => customer.orderCount },
    { key: 'totalSpent', label: 'Tổng chi tiêu', render: (customer) => <strong>{formatCurrency(customer.totalSpent)}</strong> },
    { key: 'lastOrderAt', label: 'Mua gần nhất', render: (customer) => formatDate(customer.lastOrderAt) },
    {
      key: 'actions',
      label: 'Ưu đãi',
      className: 'table-actions-cell',
      render: (customer) => <button type="button" className="gift-button" onClick={() => setGiftCustomer(customer)}><FiGift /> Tặng voucher</button>,
    },
  ];
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
      <div className="dashboard-welcome">
        <div>
          <span>Cập nhật hôm nay</span>
          <h2>{greetingFor(new Date().getHours())}, {user?.fullName || 'Admin'}</h2>
          <p>Đây là tình hình hoạt động mới nhất của cửa hàng.</p>
          <div className="dashboard-welcome-actions">
            <Link className="btn btn-success" to="/admin/orders">Xử lý đơn hàng</Link>
            <Link className="btn btn-light" to="/admin/products">Quản lý sản phẩm</Link>
          </div>
        </div>
        <div className="dashboard-welcome-phones" aria-hidden="true">
          <Phone3D tone="blue" ry={150} rx={8} rz={-6} layers={7} />
          <Phone3D tone="lime" ry={-24} rx={10} rz={10} layers={7} />
        </div>
      </div>
      <section className="stat-grid">
        <StatCard label="Tổng sản phẩm" value={data.stats.products} change="Đang được quản lý" icon={FiSmartphone} color="blue" />
        <StatCard label="Tổng đơn hàng" value={data.stats.orders} change="Đơn hàng trong hệ thống" icon={FiPackage} color="violet" />
        <StatCard label="Khách hàng" value={data.stats.customers} change="Tài khoản khách hàng" icon={FiUsers} color="green" />
        <StatCard label={`Doanh thu năm ${revenue.year}`} value={formatCurrency(data.stats.revenue)} change="Đơn đã giao / hoàn thành" icon={FiDollarSign} color="orange" />
      </section>

      {lowStock.total > 0 && (
        <a className="low-stock-alert" href="#low-stock">
          <FiAlertTriangle aria-hidden="true" />
          <span><strong>Cảnh báo tồn kho:</strong> {lowStock.total} mặt hàng còn từ {lowStock.threshold} sản phẩm trở xuống{lowStock.outOfStock > 0 ? `, trong đó ${lowStock.outOfStock} mặt hàng đã hết` : ''}.</span>
          <b>Xem danh sách</b>
        </a>
      )}

      <section className={`revenue-section${refreshing ? ' is-refreshing' : ''}`} aria-busy={refreshing}>
        <div className="revenue-filters">
          <h2>Doanh thu</h2>
          <label><span>Năm</span>
            <select value={period.year} onChange={(event) => setPeriod((current) => ({ ...current, year: Number(event.target.value) }))}>
              {years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label><span>Tháng</span>
            <select value={period.month} onChange={(event) => setPeriod((current) => ({ ...current, month: Number(event.target.value) }))}>
              {MONTHS.map((month) => <option key={month} value={month}>Tháng {month}</option>)}
            </select>
          </label>
          <small>Chỉ tính đơn đã giao hoặc hoàn thành, theo giờ Việt Nam</small>
        </div>
        <div className="revenue-grid">
          <RevenueChart
            title="Theo năm"
            subtitle={`${revenue.yearly[0].year} – ${revenue.year}`}
            labels={revenue.yearly.map((entry) => String(entry.year))}
            values={revenue.yearly.map((entry) => entry.total)}
            tooltipTitle={(index) => `Năm ${revenue.yearly[index].year}`}
            tableLabel="Năm"
            colors={chartColors}
          />
          <RevenueChart
            title="Theo tháng"
            subtitle={`12 tháng năm ${revenue.year}`}
            labels={MONTHS.map((month) => `T${month}`)}
            values={revenue.monthly}
            tooltipTitle={(index) => `Tháng ${index + 1}/${revenue.year}`}
            tableLabel="Tháng"
            colors={chartColors}
          />
          <RevenueChart
            title="Theo ngày"
            subtitle={isCurrentMonth
              ? `Từ 1/${revenue.month} đến hôm nay ${today.day}/${revenue.month}/${revenue.year}`
              : `Tháng ${revenue.month}/${revenue.year}`}
            labels={dailyLabels}
            values={dailyValues}
            tooltipTitle={(index) => `Ngày ${index + 1}/${revenue.month}/${revenue.year}`}
            tableLabel="Ngày"
            variant="area"
            colors={chartColors}
          />
        </div>
      </section>

      <section className="chart-grid">
        <div className="admin-table-card top-customers">
          <div className="admin-table-title"><div><h2>Khách hàng mua nhiều nhất</h2><span>Top 10 theo tổng chi tiêu đơn đã giao · tặng voucher riêng để tri ân</span></div><Link to="/admin/customers">Tất cả khách hàng</Link></div>
          <DataTable columns={customerColumns} rows={data.topCustomers} emptyTitle="Chưa có khách hàng nào có đơn đã giao" />
        </div>
        <div className="admin-card chart-card"><div className="card-heading"><div><h2>Trạng thái đơn hàng</h2><span>Phân bổ hiện tại</span></div></div><Doughnut data={statusData} options={{ responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } } }} /></div>
      </section>

      <section className="dashboard-bottom-grid">
        <div className="admin-table-card"><div className="admin-table-title"><div><h2>Đơn hàng gần đây</h2><span>Các đơn mới nhất</span></div><Link to="/admin/orders">Xem tất cả</Link></div><DataTable columns={orderColumns} rows={data.recentOrders} /></div>
        <div className="dashboard-side-stack">
          <div className="admin-card top-products">
            <div className="card-heading"><div><h2>Sản phẩm bán chạy</h2><span>Điện thoại và phụ kiện, theo số lượng đã bán</span></div></div>
            {data.topProducts.length === 0 && <p className="dashboard-empty">Chưa có sản phẩm nào được bán.</p>}
            {data.topProducts.map((product, index) => <div key={`${product.type}-${product.id}`}><b>{index + 1}</b><img src={product.image} alt="" /><span><strong>{product.name}</strong><small>{typeLabel(product.type)} · đã bán {product.sold}</small></span><strong>{formatCurrency(product.price)}</strong></div>)}
          </div>
          <div className="admin-card low-stock-card" id="low-stock">
            <div className="card-heading"><div><h2>Sắp hết hàng</h2><span>Đang bán, còn từ {lowStock.threshold} sản phẩm trở xuống</span></div>{lowStock.total > 0 && <b className="low-stock-count">{lowStock.total}</b>}</div>
            {lowStock.items.length === 0 ? (
              <p className="dashboard-empty">Tất cả mặt hàng đang bán đều còn trên {lowStock.threshold} sản phẩm.</p>
            ) : (
              <ul>
                {lowStock.items.map((item) => (
                  <li key={`${item.type}-${item.id}`}>
                    <img src={item.image} alt="" />
                    <Link to={managePath(item.type)} title={`Nhập thêm ${item.name}`}>
                      <strong>{item.name}</strong><small>{typeLabel(item.type)} · bấm để nhập hàng</small>
                    </Link>
                    <span className={`stock-pill ${item.stock === 0 ? 'is-out' : 'is-low'}`}>
                      <FiAlertTriangle aria-hidden="true" />{item.stock === 0 ? 'Hết hàng' : `Còn ${item.stock}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {lowStock.total > lowStock.items.length && <small className="low-stock-more">Và {lowStock.total - lowStock.items.length} mặt hàng khác</small>}
          </div>
        </div>
      </section>

      {giftCustomer && <GiftVoucherDialog customer={giftCustomer} onClose={() => setGiftCustomer(null)} />}
    </>
  );
}

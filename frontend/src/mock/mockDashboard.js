import { LOW_STOCK_THRESHOLD } from '../utils/stock';

// Mock-mode counterpart of backend dashboardService: same response shape, computed from local data.
const YEARS_SHOWN = 5;
const TOP_PRODUCTS = 5;
const TOP_CUSTOMERS = 10;
const LOW_STOCK_SHOWN = 20;
const REVENUE_STATUSES = ['delivered', 'completed'];
const STATUS_KEYS = ['pending', 'confirmed', 'shipping', 'completed', 'cancelled'];
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

// Calendar parts in Vietnam time (UTC+7, no daylight saving), as the backend groups revenue.
const vietnamParts = (value) => {
  const date = new Date(new Date(value).getTime() + VIETNAM_OFFSET_MS);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
};
const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const summary = (type) => (item) => ({
  id: item.id,
  name: item.name,
  image: item.image || '',
  price: item.price,
  sold: Number(item.sold || 0),
  stock: Number(item.stock || 0),
  type,
});

export function buildRevenue(orders = [], { year, month, now = new Date() } = {}) {
  const today = vietnamParts(now);
  const selectedYear = Number(year) || today.year;
  const selectedMonth = Number(month) || today.month;
  const firstYear = selectedYear - YEARS_SHOWN + 1;
  const yearly = Array.from({ length: YEARS_SHOWN }, (_, index) => ({ year: firstYear + index, total: 0 }));
  const monthly = Array(12).fill(0);
  const daily = Array(daysInMonth(selectedYear, selectedMonth)).fill(0);

  orders
    .filter((order) => REVENUE_STATUSES.includes(order.status))
    .forEach((order) => {
      const parts = vietnamParts(order.createdAt);
      const total = Number(order.total || 0);
      const yearEntry = yearly.find((entry) => entry.year === parts.year);
      if (yearEntry) yearEntry.total += total;
      if (parts.year !== selectedYear) return;
      monthly[parts.month - 1] += total;
      if (parts.month === selectedMonth) daily[parts.day - 1] += total;
    });

  return { year: selectedYear, month: selectedMonth, yearly, monthly, daily };
}

export function buildDashboard({ products = [], accessories = [], orders = [], users = [], year, month, now } = {}) {
  const revenue = buildRevenue(orders, { year, month, now });
  const customers = users.filter((user) => user.role === 'customer');
  const customersById = new Map(customers.map((user) => [user.id, user]));

  const spending = new Map();
  orders
    .filter((order) => order.userId && REVENUE_STATUSES.includes(order.status) && customersById.has(order.userId))
    .forEach((order) => {
      const entry = spending.get(order.userId) || { orderCount: 0, totalSpent: 0, lastOrderAt: order.createdAt };
      entry.orderCount += 1;
      entry.totalSpent += Number(order.total || 0);
      if (new Date(order.createdAt) > new Date(entry.lastOrderAt)) entry.lastOrderAt = order.createdAt;
      spending.set(order.userId, entry);
    });
  const topCustomers = [...spending.entries()]
    .sort(([, left], [, right]) => right.totalSpent - left.totalSpent || right.orderCount - left.orderCount)
    .slice(0, TOP_CUSTOMERS)
    .map(([id, entry]) => {
      const user = customersById.get(id);
      return { id, fullName: user.fullName, phone: user.phone, email: user.email || '', ...entry };
    });

  const catalog = [...products.map(summary('product')), ...accessories.map(summary('accessory'))];
  const activeCatalog = [
    ...products.filter((item) => item.status === 'active').map(summary('product')),
    ...accessories.filter((item) => item.status === 'active').map(summary('accessory')),
  ];
  const lowStockItems = activeCatalog
    .filter((item) => item.stock <= LOW_STOCK_THRESHOLD)
    .sort((left, right) => left.stock - right.stock || left.name.localeCompare(right.name, 'vi'));

  return {
    stats: {
      products: products.length,
      orders: orders.length,
      customers: customers.length,
      revenue: revenue.monthly.reduce((sum, total) => sum + total, 0),
    },
    revenue,
    recentOrders: [...orders].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)).slice(0, 5),
    topProducts: catalog.filter((item) => item.sold > 0).sort((left, right) => right.sold - left.sold).slice(0, TOP_PRODUCTS),
    topCustomers,
    lowStock: {
      threshold: LOW_STOCK_THRESHOLD,
      total: lowStockItems.length,
      outOfStock: lowStockItems.filter((item) => item.stock === 0).length,
      items: lowStockItems.slice(0, LOW_STOCK_SHOWN),
    },
    orderStatus: STATUS_KEYS.map((status) => ({
      status,
      count: orders.filter((order) => (
        status === 'completed' ? REVENUE_STATUSES.includes(order.status) : order.status === status
      )).length,
    })),
  };
}

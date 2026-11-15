const accessoryRepository = require('../repositories/accessoryRepository');
const orderRepository = require('../repositories/orderRepository');
const productRepository = require('../repositories/productRepository');
const userRepository = require('../repositories/userRepository');

const MIN_YEAR = 1970;
const MAX_YEAR = 9999;
const YEARS_SHOWN = 5;
const TOP_PRODUCTS = 5;
const TOP_CUSTOMERS = 10;
const LOW_STOCK_THRESHOLD = 10;
const LOW_STOCK_SHOWN = 20;
const statusKeys = ['pending', 'confirmed', 'shipping', 'completed', 'cancelled'];

// "Today" for the dashboard is Vietnam time, matching how revenue is grouped.
const vietnamToday = () => {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
};
const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const fillSeries = (rows, length, firstKey = 1) => {
  const totals = new Map(rows.map((row) => [row._id, row.total]));
  return Array.from({ length }, (_, index) => totals.get(index + firstKey) || 0);
};
const catalogSummary = (type) => (item) => ({
  id: item.id,
  name: item.name,
  image: item.image || '',
  price: item.price,
  sold: item.sold || 0,
  stock: item.stock || 0,
  type,
});

class DashboardService {
  parsePeriod({ year, month } = {}) {
    const today = vietnamToday();
    const selectedYear = year === undefined ? today.year : Number(year);
    if (!Number.isInteger(selectedYear) || selectedYear < MIN_YEAR || selectedYear > MAX_YEAR) {
      throw new TypeError('Dashboard year is outside the supported range');
    }
    const selectedMonth = month === undefined ? today.month : Number(month);
    if (!Number.isInteger(selectedMonth) || selectedMonth < 1 || selectedMonth > 12) {
      throw new TypeError('Dashboard month is outside the supported range');
    }
    return { year: selectedYear, month: selectedMonth };
  }

  async topProducts() {
    const [products, accessories] = await Promise.all([
      productRepository.findTopSelling(TOP_PRODUCTS),
      accessoryRepository.findTopSelling(TOP_PRODUCTS),
    ]);
    return [
      ...products.map(catalogSummary('product')),
      ...accessories.map(catalogSummary('accessory')),
    ]
      .filter((item) => item.sold > 0)
      .sort((left, right) => right.sold - left.sold)
      .slice(0, TOP_PRODUCTS);
  }

  async topCustomers() {
    // Over-fetch so deleted accounts or staff orders do not leave the list short.
    const totals = await orderRepository.topCustomerTotals(TOP_CUSTOMERS * 3);
    if (!totals.length) return [];
    const users = await userRepository.findAll(
      { _id: { $in: totals.map((row) => row._id) }, role: 'customer' },
      { limit: totals.length },
    );
    const usersById = new Map(users.map((user) => [user.id, user]));
    return totals
      .filter((row) => usersById.has(row._id))
      .slice(0, TOP_CUSTOMERS)
      .map((row) => {
        const user = usersById.get(row._id);
        return {
          id: user.id,
          fullName: user.fullName,
          phone: user.phone,
          email: user.email || '',
          orderCount: row.orderCount,
          totalSpent: row.totalSpent,
          lastOrderAt: row.lastOrderAt,
        };
      });
  }

  async lowStock() {
    const [products, accessories] = await Promise.all([
      productRepository.findLowStock(LOW_STOCK_THRESHOLD, LOW_STOCK_SHOWN),
      accessoryRepository.findLowStock(LOW_STOCK_THRESHOLD, LOW_STOCK_SHOWN),
    ]);
    return {
      threshold: LOW_STOCK_THRESHOLD,
      total: products.total + accessories.total,
      outOfStock: [...products.items, ...accessories.items].filter((item) => !item.stock).length,
      items: [
        ...products.items.map(catalogSummary('product')),
        ...accessories.items.map(catalogSummary('accessory')),
      ]
        .sort((left, right) => left.stock - right.stock || left.name.localeCompare(right.name, 'vi'))
        .slice(0, LOW_STOCK_SHOWN),
    };
  }

  async revenue(period) {
    const { year, month } = this.parsePeriod(period);
    const firstYear = year - YEARS_SHOWN + 1;
    const [yearlyRows, monthlyRows, dailyRows] = await Promise.all([
      orderRepository.revenueByYear(firstYear, year),
      orderRepository.revenueByMonth(year),
      orderRepository.revenueByDay(year, month),
    ]);
    const yearly = fillSeries(yearlyRows, YEARS_SHOWN, firstYear)
      .map((total, index) => ({ year: firstYear + index, total }));
    return {
      year,
      month,
      yearly,
      monthly: fillSeries(monthlyRows, 12),
      daily: fillSeries(dailyRows, daysInMonth(year, month)),
    };
  }

  async statistics(period = {}) {
    const [products, orders, customers, recentOrders, topProducts, topCustomers, lowStock, revenue, statusRows] = await Promise.all([
      productRepository.count(),
      orderRepository.count(),
      userRepository.count({ role: 'customer' }),
      orderRepository.findRecent(5),
      this.topProducts(),
      this.topCustomers(),
      this.lowStock(),
      this.revenue(period),
      orderRepository.countByStatus(),
    ]);
    const statusCounts = new Map(statusRows.map((row) => [row._id, row.count]));

    return {
      stats: {
        products,
        orders,
        customers,
        revenue: revenue.monthly.reduce((sum, total) => sum + total, 0),
      },
      revenue,
      recentOrders,
      topProducts,
      topCustomers,
      lowStock,
      orderStatus: statusKeys.map((status) => ({
        status,
        count: statusCounts.get(status) || 0,
      })),
    };
  }
}

module.exports = new DashboardService();

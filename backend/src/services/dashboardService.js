const orderRepository = require('../repositories/orderRepository');
const productRepository = require('../repositories/productRepository');
const userRepository = require('../repositories/userRepository');

const MIN_YEAR = 1970;
const MAX_YEAR = 9999;
const statusKeys = ['pending', 'confirmed', 'shipping', 'completed', 'cancelled'];

class DashboardService {
  async statistics({ year = new Date().getUTCFullYear() } = {}) {
    const selectedYear = Number(year);
    if (!Number.isInteger(selectedYear) || selectedYear < MIN_YEAR || selectedYear > MAX_YEAR) {
      throw new TypeError('Dashboard year is outside the supported range');
    }

    const [products, orders, customers, recentOrders, topProducts, revenueRows, statusRows] = await Promise.all([
      productRepository.count(),
      orderRepository.count(),
      userRepository.count({ role: 'customer' }),
      orderRepository.findRecent(5),
      productRepository.findTopSelling(5),
      orderRepository.revenueByMonth(selectedYear),
      orderRepository.countByStatus(),
    ]);

    const revenueByMonth = new Map(revenueRows.map((row) => [row._id, row.total]));
    const monthlyRevenue = Array.from({ length: 12 }, (_, index) => (
      Number(((revenueByMonth.get(index + 1) || 0) / 1000000).toFixed(1))
    ));
    const statusCounts = new Map(statusRows.map((row) => [row._id, row.count]));

    return {
      stats: {
        products,
        orders,
        customers,
        revenue: revenueRows.reduce((sum, row) => sum + row.total, 0),
      },
      recentOrders,
      topProducts,
      monthlyRevenue,
      orderStatus: statusKeys.map((status) => ({
        status,
        count: statusCounts.get(status) || 0,
      })),
    };
  }
}

module.exports = new DashboardService();

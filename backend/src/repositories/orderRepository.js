const BaseRepository = require('./baseRepository');
const Order = require('../models/Order');
const OrderCounter = require('../models/OrderCounter');
const { normalizeVietnamesePhone } = require('../utils/phone');
const { buildRegex } = require('../utils/query');

// Revenue is reported in Vietnam time (UTC+7, no daylight saving) so an order placed
// at 06:00 on the 1st belongs to that day, not to the previous UTC day.
const REPORT_TIMEZONE = 'Asia/Ho_Chi_Minh';
const REPORT_OFFSET_MS = 7 * 60 * 60 * 1000;
const REVENUE_STATUSES = ['delivered', 'completed'];
const localStart = (year, monthIndex = 0, day = 1) => (
  new Date(Date.UTC(year, monthIndex, day) - REPORT_OFFSET_MS)
);

class OrderRepository extends BaseRepository {
  constructor() {
    super(Order);
  }

  async ensureIndexes() {
    await Order.init();
  }

  async create(payload, session) {
    await this.ensureIndexes();
    if (!session) return super.create(payload);
    const [order] = await Order.create([payload], { session });
    return order.toJSON();
  }

  async findByOrderNumberAndPhone(orderNumber, phone) {
    const canonicalPhone = normalizeVietnamesePhone(phone);
    if (!canonicalPhone) return null;
    const order = await Order.findOne({
      isDeleted: false,
      orderNumber: String(orderNumber).toUpperCase(),
      'customer.phone': canonicalPhone,
    });
    return order?.toJSON() || null;
  }

  async findByOrderNumber(orderNumber, session) {
    const order = await Order.findOne({
      isDeleted: false,
      orderNumber: String(orderNumber).toUpperCase(),
    }).session(session || null);
    return order?.toJSON() || null;
  }

  async findByIdempotencyKey(idempotencyKey, session) {
    if (!idempotencyKey) return null;
    await this.ensureIndexes();
    const order = await Order.findOne({ isDeleted: false, idempotencyKey }).session(session || null);
    return order?.toJSON() || null;
  }

  async nextSequence(datePart, session) {
    const counter = await OrderCounter.findOneAndUpdate(
      { _id: datePart },
      { $inc: { value: 1 } },
      {
        upsert: true,
        returnDocument: 'after',
        setDefaultsOnInsert: true,
        session,
      },
    );
    return counter.value;
  }

  async transitionToCancelled(id, statuses, session) {
    const order = await Order.findOneAndUpdate(
      {
        _id: id,
        isDeleted: false,
        status: { $in: statuses },
        paymentStatus: { $nin: ['paid', 'refund_required', 'refunded'] },
      },
      { status: 'cancelled' },
      { returnDocument: 'before', runValidators: true, session },
    );
    return order?.toJSON() || null;
  }

  async claimVoucherUsageRelease(id, session) {
    const order = await Order.findOneAndUpdate(
      {
        _id: id,
        isDeleted: false,
        voucherCode: { $ne: null },
        voucherUsageReleased: { $ne: true },
      },
      { voucherUsageReleased: true },
      { returnDocument: 'after', runValidators: true, session },
    );
    return order?.toJSON() || null;
  }

  async updateState(id, filter, payload, session) {
    const order = await Order.findOneAndUpdate(
      { _id: id, isDeleted: false, ...filter },
      { $set: payload },
      { returnDocument: 'after', runValidators: true, session },
    );
    return order?.toJSON() || null;
  }

  async softDelete(id, session) {
    const order = await Order.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { returnDocument: 'after', runValidators: true, session },
    );
    return order ? { id, deleted: true } : null;
  }

  async findRecent(limit = 5) {
    const docs = await Order.find({ isDeleted: false }).sort({ createdAt: -1 }).limit(limit);
    return docs.map((doc) => doc.toJSON());
  }

  async findPage(filter = {}, { page, limit, sort = { createdAt: -1 } }) {
    const [items, total] = await Promise.all([
      this.findAll(filter, { sort, skip: (page - 1) * limit, limit }),
      this.count(filter),
    ]);
    return { items, total };
  }

  async findAdminPage({ page, limit, search = '', status = '' }) {
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      const pattern = buildRegex(search);
      filter.$or = [
        { orderNumber: pattern },
        { 'customer.fullName': pattern },
        { 'customer.email': pattern },
        { 'customer.phone': pattern },
      ];
    }
    return this.findPage(filter, { page, limit });
  }

  async revenueBetween(start, end, unit) {
    return Order.aggregate([
      {
        $match: {
          isDeleted: false,
          status: { $in: REVENUE_STATUSES },
          createdAt: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: { [`$${unit}`]: { date: '$createdAt', timezone: REPORT_TIMEZONE } },
          total: { $sum: '$total' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  async revenueByYear(fromYear, toYear) {
    return this.revenueBetween(localStart(fromYear), localStart(toYear + 1), 'year');
  }

  async revenueByMonth(year) {
    return this.revenueBetween(localStart(year), localStart(year + 1), 'month');
  }

  async revenueByDay(year, month) {
    return this.revenueBetween(localStart(year, month - 1), localStart(year, month), 'dayOfMonth');
  }

  // Customers ranked by money spent on delivered/completed orders.
  async topCustomerTotals(limit) {
    return Order.aggregate([
      { $match: { isDeleted: false, userId: { $ne: null }, status: { $in: REVENUE_STATUSES } } },
      {
        $group: {
          _id: '$userId',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          lastOrderAt: { $max: '$createdAt' },
        },
      },
      { $sort: { totalSpent: -1, orderCount: -1, _id: 1 } },
      { $limit: limit },
    ]);
  }

  async countByStatus() {
    return Order.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: {
            $cond: [
              { $in: ['$status', ['delivered', 'completed']] },
              'completed',
              '$status',
            ],
          },
          count: { $sum: 1 },
        },
      },
    ]);
  }

  async customerOrderTotals(userIds) {
    if (!userIds.length) return [];
    return Order.aggregate([
      { $match: { isDeleted: false, userId: { $in: userIds } } },
      {
        $group: {
          _id: '$userId',
          orderCount: { $sum: 1 },
          totalSpent: {
            $sum: {
              $cond: [
                { $in: ['$status', ['delivered', 'completed']] },
                '$total',
                0,
              ],
            },
          },
        },
      },
    ]);
  }
}

module.exports = new OrderRepository();

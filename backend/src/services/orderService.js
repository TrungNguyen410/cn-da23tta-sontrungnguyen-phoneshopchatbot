const crypto = require('crypto');
const AppError = require('../utils/AppError');
const accessoryRepository = require('../repositories/accessoryRepository');
const orderRepository = require('../repositories/orderRepository');
const productRepository = require('../repositories/productRepository');
const Accessory = require('../models/Accessory');
const Product = require('../models/Product');
const voucherService = require('./voucherService');
const withTransaction = require('../utils/withTransaction');
const { normalizeVietnamesePhone } = require('../utils/phone');

const allowedStatuses = ['pending', 'confirmed', 'shipping', 'delivered', 'completed', 'cancelled'];
const statusTransitions = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipping', 'cancelled'],
  shipping: ['delivered', 'completed'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
};
const statusLabels = {
  pending: 'chờ xác nhận',
  confirmed: 'đã xác nhận',
  shipping: 'đang giao hàng',
  delivered: 'đã giao hàng',
  completed: 'hoàn thành',
  cancelled: 'đã hủy',
};
const safeUpdateFields = [
  'customer',
  'note',
  'shippingProvider',
  'trackingNumber',
  'estimatedDelivery',
];

class OrderService {
  canonicalCustomer(customer = {}) {
    const phone = normalizeVietnamesePhone(customer.phone);
    if (!phone) throw new AppError('Số điện thoại người nhận không hợp lệ', 422);
    return { ...customer, phone };
  }

  buildIdempotencyKey(rawKey, user, customer = {}) {
    const key = String(rawKey || '').trim().slice(0, 120);
    if (!key) return '';
    const canonicalCustomer = this.canonicalCustomer(customer);
    const principal = user?.id
      ? `user:${user.id}`
      : `guest:${String(canonicalCustomer.email || '').trim().toLowerCase()}:${canonicalCustomer.phone}`;
    return crypto.createHash('sha256').update(`${principal}:${key}`).digest('hex');
  }

  buildRequestFingerprint(payload = {}) {
    const customer = this.canonicalCustomer(payload.customer);
    const items = (payload.items || [])
      .map((item) => {
        const type = item.type === 'accessory' || item.accessoryId ? 'accessory' : 'product';
        const id = type === 'accessory'
          ? item.accessoryId || item.productId || item.id
          : item.productId || item.id;
        return {
          id: String(id || ''),
          quantity: Number(item.quantity),
          type,
        };
      })
      .sort((left, right) => (
        `${left.type}:${left.id}:${left.quantity}`
          .localeCompare(`${right.type}:${right.id}:${right.quantity}`)
      ));
    const intent = {
      items,
      customer: {
        fullName: String(customer.fullName || '').trim(),
        email: String(customer.email || '').trim().toLowerCase(),
        phone: customer.phone,
        address: String(customer.address || '').trim(),
        province: String(customer.province || '').trim(),
        district: String(customer.district || '').trim(),
        ward: String(customer.ward || '').trim(),
      },
      paymentMethod: payload.paymentMethod || 'cod',
      voucherCode: String(payload.voucherCode || '').trim().toUpperCase(),
      note: String(payload.note || '').trim(),
    };
    return crypto.createHash('sha256').update(JSON.stringify(intent)).digest('hex');
  }

  assertMatchingIntent(existing, requestFingerprint, paymentMethod) {
    const matches = existing.requestFingerprint
      ? existing.requestFingerprint === requestFingerprint
      : existing.paymentMethod === paymentMethod;
    if (!matches) {
      throw new AppError(
        'Yêu cầu thanh toán này đã được dùng cho một nội dung đơn hàng khác',
        409,
      );
    }
  }

  shippingQuote(customer = {}, subtotal = 0) {
    if (subtotal >= 10000000) return { fee: 0, days: 1 };
    const province = String(customer.province || customer.address || '').toLowerCase();
    if (province.includes('hồ chí minh') || province.includes('ho chi minh') || province.includes('tp.hcm')) {
      return { fee: 20000, days: 1 };
    }
    if (province.includes('hà nội') || province.includes('ha noi') || province.includes('đà nẵng') || province.includes('da nang')) {
      return { fee: 30000, days: 2 };
    }
    return { fee: 40000, days: 4 };
  }

  async generateOrderNumber(session) {
    const now = new Date();
    const datePart = now.toISOString().slice(2, 10).replaceAll('-', '');
    const sequence = await orderRepository.nextSequence(datePart, session);
    return `TP${datePart}${String(sequence).padStart(4, '0')}`;
  }

  normalizeRequestedItems(items = []) {
    const grouped = new Map();
    for (const item of items) {
      const type = item.type === 'accessory' || item.accessoryId ? 'accessory' : 'product';
      const id = String(
        type === 'accessory'
          ? item.accessoryId || item.productId || item.id
          : item.productId || item.id,
      );
      const key = `${type}:${id}`;
      grouped.set(key, {
        type,
        id,
        quantity: (grouped.get(key)?.quantity || 0) + Number(item.quantity),
      });
    }
    return [...grouped.values()];
  }

  async normalizeItems(items = [], session) {
    const normalized = [];
    for (const item of items) {
      const type = item.type === 'accessory' || item.accessoryId ? 'accessory' : 'product';
      const itemId = type === 'accessory'
        ? item.accessoryId || item.productId || item.id
        : item.productId || item.id;
      const quantity = Number(item.quantity);
      const catalogItem = type === 'accessory'
        ? await accessoryRepository.findById(itemId, { session })
        : await productRepository.findById(itemId, { session });

      if (!catalogItem || catalogItem.status !== 'active') {
        throw new AppError(`${type === 'accessory' ? 'Phụ kiện' : 'Sản phẩm'} hiện không khả dụng`, 400);
      }
      if (catalogItem.stock < quantity) {
        throw new AppError(`${catalogItem.name} không đủ số lượng tồn kho`, 400);
      }

      normalized.push({
        id: catalogItem.id,
        productId: type === 'product' ? catalogItem.id : null,
        accessoryId: type === 'accessory' ? catalogItem.id : null,
        name: catalogItem.name,
        image: catalogItem.image || '',
        price: Number(catalogItem.price),
        quantity,
        type,
      });
    }
    return normalized;
  }

  calculateDiscount(voucher, subtotal, shippingFee) {
    if (!voucher) return 0;
    if (voucher.type === 'percent') {
      return Math.min((subtotal * voucher.value) / 100, voucher.maxDiscount || Infinity);
    }
    if (voucher.type === 'fixed') return Math.min(voucher.value, subtotal);
    if (voucher.type === 'shipping') return Math.min(voucher.value, shippingFee);
    return 0;
  }

  async rollbackInventory(decrements, session) {
    for (const { Model, id, quantity } of decrements) {
      await Model.updateOne(
        { _id: id },
        { $inc: { stock: quantity, sold: -quantity } },
        { session },
      );
    }
  }

  async decrementInventory(items, session) {
    const decrements = [];
    for (const item of items) {
      const Model = item.type === 'accessory' ? Accessory : Product;
      const id = item.type === 'accessory' ? item.accessoryId : item.productId;
      const updated = await Model.findOneAndUpdate(
        { _id: id, isDeleted: false, status: 'active', stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity, sold: item.quantity } },
        { returnDocument: 'after', runValidators: true, session },
      );

      if (!updated) {
        if (!session) await this.rollbackInventory(decrements);
        throw new AppError(`${item.name} không đủ số lượng tồn kho`, 400);
      }

      decrements.push({ Model, id, quantity: item.quantity });
    }
    return decrements;
  }

  async restoreInventory(items = [], session) {
    for (const item of items) {
      const type = item.type === 'accessory' || item.accessoryId ? 'accessory' : 'product';
      const Model = type === 'accessory' ? Accessory : Product;
      const id = type === 'accessory' ? item.accessoryId || item.id : item.productId || item.id;
      await Model.updateOne(
        { _id: id },
        { $inc: { stock: item.quantity, sold: -item.quantity } },
        { session },
      );
    }
  }

  async create(payload, user, metadata = {}) {
    const customer = this.canonicalCustomer(payload.customer);
    const paymentMethod = payload.paymentMethod || 'cod';
    const requestFingerprint = this.buildRequestFingerprint({
      ...payload,
      customer,
      paymentMethod,
    });
    const idempotencyKey = this.buildIdempotencyKey(
      metadata.idempotencyKey,
      user,
      customer,
    );
    await orderRepository.ensureIndexes();
    try {
      return await withTransaction(async (session) => {
        if (idempotencyKey) {
          const existing = await orderRepository.findByIdempotencyKey(
            idempotencyKey,
            session,
          );
          if (existing) {
            this.assertMatchingIntent(existing, requestFingerprint, paymentMethod);
            return existing;
          }
        }

        const requestedItems = this.normalizeRequestedItems(payload.items);
        const items = await this.normalizeItems(requestedItems, session);
        if (!items.length) throw new AppError('Đơn hàng phải có ít nhất một sản phẩm', 422);
        const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const shipping = this.shippingQuote(customer, subtotal);
        const shippingFee = shipping.fee;
        const voucher = payload.voucherCode
          ? await voucherService.reserve(payload.voucherCode, subtotal, session)
          : null;
        const discount = this.calculateDiscount(voucher, subtotal, shippingFee);
        const total = Math.max(0, subtotal + shippingFee - discount);

        await this.decrementInventory(items, session);
        return orderRepository.create({
          orderNumber: await this.generateOrderNumber(session),
          idempotencyKey: idempotencyKey || undefined,
          requestFingerprint,
          userId: user?.id || null,
          items,
          subtotal,
          shippingFee,
          discount,
          total,
          customer,
          paymentMethod,
          paymentStatus: 'pending',
          paymentReference: payload.paymentReference || '',
          shippingProvider: 'TechPhone Express',
          trackingNumber: `TPX${Date.now().toString().slice(-10)}`,
          estimatedDelivery: new Date(Date.now() + shipping.days * 24 * 60 * 60 * 1000),
          note: payload.note || '',
          voucherCode: voucher?.code || null,
          status: 'pending',
        }, session);
      });
    } catch (error) {
      if (idempotencyKey && error?.code === 11000) {
        const existing = await orderRepository.findByIdempotencyKey(idempotencyKey);
        if (existing) {
          this.assertMatchingIntent(existing, requestFingerprint, paymentMethod);
          return existing;
        }
      }
      throw error;
    }
  }

  async list(user, query = {}) {
    const filter = {};
    if (user.role !== 'admin') filter.userId = user.id;
    if (query.status) filter.status = query.status;
    if (user.role !== 'admin') {
      return orderRepository.findAll(filter, { sort: { createdAt: -1 } });
    }

    const page = Math.min(Math.max(Number(query.page) || 1, 1), 1000000);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const search = String(query.search || '').trim().slice(0, 100);
    const { items, total } = await orderRepository.findAdminPage({
      page,
      limit,
      search,
      status: query.status || '',
    });
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async myOrders(userId) {
    return orderRepository.findAll({ userId }, { sort: { createdAt: -1 } });
  }

  async getById(id, user) {
    const order = await orderRepository.findById(id);
    if (!order) throw new AppError('Không tìm thấy đơn hàng', 404);
    if (user.role !== 'admin' && order.userId !== user.id) throw new AppError('Bạn không có quyền truy cập đơn hàng này', 403);
    return order;
  }

  async lookup(orderNumber, phone) {
    const canonicalPhone = normalizeVietnamesePhone(phone);
    if (!canonicalPhone) throw new AppError('Số điện thoại người nhận không hợp lệ', 422);
    const order = await orderRepository.findByOrderNumberAndPhone(orderNumber, canonicalPhone);
    if (!order) throw new AppError('Không tìm thấy đơn hàng phù hợp', 404);
    return this.publicLookup(order);
  }

  publicLookup(order) {
    const phone = order.customer.phone;
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      status: order.status,
      items: order.items.map(({ id, name, image, price, quantity, type }) => ({
        id,
        name,
        image,
        price,
        quantity,
        type,
      })),
      total: order.total,
      shippingProvider: order.shippingProvider,
      trackingNumber: order.trackingNumber,
      estimatedDelivery: order.estimatedDelivery,
      customer: {
        fullName: `${order.customer.fullName.slice(0, 1)}***`,
        phone: `${phone.slice(0, 3)}****${phone.slice(-3)}`,
      },
    };
  }

  async update(id, payload) {
    const fields = Object.keys(payload || {});
    if (!fields.length || fields.some((field) => !safeUpdateFields.includes(field))) {
      throw new AppError('Chỉ được cập nhật thông tin khách hàng và giao hàng tại đây', 422);
    }
    const safePayload = Object.fromEntries(
      fields.map((field) => [field, payload[field]]),
    );
    if (safePayload.customer) {
      safePayload.customer = this.canonicalCustomer(safePayload.customer);
    }
    return orderRepository.update(id, safePayload);
  }

  async updateStatus(id, status) {
    if (!allowedStatuses.includes(status)) throw new AppError('Trạng thái đơn hàng không hợp lệ', 422);
    const order = await orderRepository.findById(id);
    if (!order) throw new AppError('Không tìm thấy đơn hàng', 404);
    if (order.status === status) return order;
    if (!statusTransitions[order.status].includes(status)) {
      throw new AppError(
        `Không thể đổi trạng thái đơn hàng từ ${statusLabels[order.status] || order.status} sang ${statusLabels[status] || status}`,
        400,
      );
    }
    if (status === 'cancelled') return this.cancelOrder(order.id);
    return orderRepository.update(id, { status });
  }

  async cancelOrderInSession(id, user, session) {
    const order = await orderRepository.findById(id, { session });
    if (!order) throw new AppError('Không tìm thấy đơn hàng', 404);
    if (user && user.role !== 'admin' && order.userId !== user.id) {
      throw new AppError('Bạn không có quyền truy cập đơn hàng này', 403);
    }
    if (order.status === 'cancelled') return order;
    if (['paid', 'refund_required', 'refunded'].includes(order.paymentStatus)) {
      throw new AppError('Không thể tự động hủy đơn hàng đã thanh toán', 400);
    }
    if (['shipping', 'delivered', 'completed'].includes(order.status)) {
      throw new AppError('Đơn hàng không còn có thể hủy', 400);
    }

    const previous = await orderRepository.transitionToCancelled(
      id,
      ['pending', 'confirmed'],
      session,
    );
    if (!previous) {
      const current = await orderRepository.findById(id, { session });
      if (current?.status === 'cancelled') return current;
      throw new AppError('Đơn hàng không còn có thể hủy', 400);
    }

    await this.restoreInventory(previous.items, session);
    if (previous.voucherCode && !previous.voucherUsageReleased) {
      await voucherService.release(previous.voucherCode, session);
      await orderRepository.claimVoucherUsageRelease(id, session);
    }
    return orderRepository.findById(id, { session });
  }

  async cancelOrder(id, user) {
    return withTransaction((session) => this.cancelOrderInSession(id, user, session));
  }

  async cancel(id, user) {
    return this.cancelOrder(id, user);
  }

  async remove(id) {
    return withTransaction(async (session) => {
      let order = await orderRepository.findById(id, { session });
      if (!order) throw new AppError('Không tìm thấy đơn hàng', 404);

      if (['pending', 'confirmed'].includes(order.status)) {
        order = await this.cancelOrderInSession(id, { role: 'admin' }, session);
      }
      if (!['cancelled', 'completed'].includes(order.status)) {
        throw new AppError('Chỉ có thể lưu trữ đơn hàng đã hủy hoặc đã hoàn thành', 400);
      }

      const result = await orderRepository.softDelete(id, session);
      if (!result) throw new AppError('Không tìm thấy đơn hàng', 404);
      return result;
    });
  }
}

module.exports = new OrderService();

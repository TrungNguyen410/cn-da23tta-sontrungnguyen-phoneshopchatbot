import { STORAGE_KEYS } from '../utils/constants';
import { calculateVoucherDiscount } from '../utils/checkoutPricing';
import { getShippingQuote } from '../utils/shipping';
import { storage } from '../utils/storage';
import { getNextOrderStatuses, getOrderStatus } from '../utils/orderStatus';
import { mockAccessories } from './mockAccessories';
import { mockBanners } from './mockBanners';
import { mockOrders } from './mockOrders';
import { mockContacts } from './mockContacts';
import { mockProducts } from './mockProducts';
import { mockReviews } from './mockReviews';
import { mockUsers } from './mockUsers';
import { mockVouchers } from './mockVouchers';
import { mockBrands, mockCategories } from './mockTaxonomy';
import { buildDashboard, buildRevenue } from './mockDashboard';
import { normalizeVietnamesePhone } from '../utils/validators';
import { pickShippingAddress } from '../utils/shippingAddress';

const wait = (value, delay = 180) => new Promise((resolve) => setTimeout(() => resolve(value), delay));
const fail = (message, status = 400) => {
  const error = new Error(message);
  error.response = { status, data: { message } };
  throw error;
};
const clone = (value) => JSON.parse(JSON.stringify(value));
const slugify = (value = '') => value.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const collections = {
  users: [STORAGE_KEYS.mockUsers, mockUsers],
  products: [STORAGE_KEYS.mockProducts, mockProducts],
  accessories: [STORAGE_KEYS.mockAccessories, mockAccessories],
  orders: [STORAGE_KEYS.mockOrders, mockOrders],
  reviews: [STORAGE_KEYS.mockReviews, mockReviews],
  vouchers: [STORAGE_KEYS.mockVouchers, mockVouchers],
  banners: [STORAGE_KEYS.mockBanners, mockBanners],
  categories: [STORAGE_KEYS.mockCategories, mockCategories],
  brands: [STORAGE_KEYS.mockBrands, mockBrands],
  contacts: [STORAGE_KEYS.mockContacts, mockContacts],
};

const read = (name) => {
  const [key, initial] = collections[name];
  const value = storage.get(key);
  if (value) return value;
  storage.set(key, initial);
  return clone(initial);
};

const write = (name, value) => {
  storage.set(collections[name][0], value);
  return clone(value);
};

const publicUser = ({ password: _password, ...user }) => user;
const tokenFor = (user) => `mock-jwt-${user.id}-${Date.now()}`;
const createId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const readOtpRequests = () => storage.get(STORAGE_KEYS.mockOtpRequests, []);
const writeOtpRequests = (items) => storage.set(STORAGE_KEYS.mockOtpRequests, items);
const mockOtp = '123456';
const vnpayCheckoutAuthorization = Symbol('mock-vnpay-checkout');
const currentMockUser = () => {
  const currentUser = storage.get(STORAGE_KEYS.currentUser);
  return currentUser?.id && storage.get(STORAGE_KEYS.token) ? currentUser : null;
};
const requireActiveCheckoutUser = () => {
  const session = currentMockUser();
  if (!session) fail('Vui lòng đăng nhập để đặt hàng', 401);
  const user = read('users').find((item) => item.id === session.id);
  if (!user || user.status !== 'active') fail('Tài khoản không thể đặt hàng', 403);
  return user;
};
const REQUIRED_ADDRESS_FIELDS = ['fullName', 'phone', 'address', 'province', 'ward'];
const hasCompleteAddress = (address) => (
  Boolean(address) && REQUIRED_ADDRESS_FIELDS.every((field) => String(address[field] || '').trim())
);
// Same rule as orderService.rememberShippingAddress: the first order saves the address,
// later orders only when the customer asks for it.
const rememberShippingAddress = (userId, customer, requested) => {
  const users = read('users');
  const user = users.find((item) => item.id === userId);
  if (!user || (!requested && hasCompleteAddress(user.shippingAddress))) return;
  const shippingAddress = pickShippingAddress(customer);
  if (!hasCompleteAddress(shippingAddress)) return;
  user.shippingAddress = { ...shippingAddress, phone: normalizeVietnamesePhone(shippingAddress.phone) || shippingAddress.phone };
  write('users', users);
};
const GIFT_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const giftCode = () => `TRIAN${Array.from({ length: 6 }, () => (
  GIFT_CODE_ALPHABET[Math.floor(Math.random() * GIFT_CODE_ALPHABET.length)]
)).join('')}`;
const voucherEnd = (voucher) => new Date(`${String(voucher.endDate).slice(0, 10)}T23:59:59`);
// A gift voucher belongs to one customer; to anyone else it looks like an unknown code.
const voucherVisibleTo = (voucher, userId) => !voucher.assignedUserId || voucher.assignedUserId === userId;
const voucherStatus = (voucher, now = new Date()) => {
  if (Number(voucher.quantity) && Number(voucher.used || 0) >= Number(voucher.quantity)) return 'used';
  if (now > voucherEnd(voucher)) return 'expired';
  if (!voucher.active) return 'inactive';
  if (now < new Date(voucher.startDate)) return 'upcoming';
  return 'available';
};
const scopedCheckoutKey = (userId, idempotencyKey) => {
  const key = String(idempotencyKey || '').trim().slice(0, 120);
  if (!key) return '';
  return `user:${userId}:${key}`;
};

const publicLookupOrder = (order) => {
  const phone = String(order.customer?.phone || '');
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    status: order.status,
    items: (order.items || []).map(({ id, name, image, price, quantity, type }) => ({
      id, name, image, price, quantity, type,
    })),
    total: order.total,
    shippingProvider: order.shippingProvider,
    trackingNumber: order.trackingNumber,
    estimatedDelivery: order.estimatedDelivery,
    customer: {
      fullName: `${String(order.customer?.fullName || '').slice(0, 1)}***`,
      phone: `${phone.slice(0, 3)}****${phone.slice(-3)}`,
    },
  };
};

export const mockDb = {
  async login(identifier, password) {
    const normalizedPhone = normalizeVietnamesePhone(identifier);
    const user = read('users').find(
      (item) => (item.email && item.email.toLowerCase() === identifier.toLowerCase())
        || item.phone === normalizedPhone,
    );
    if (!user || user.password !== password) fail('Số điện thoại hoặc mật khẩu không đúng', 401);
    if (user.status !== 'active') fail('Tài khoản không thể đăng nhập', 403);
    return wait({ token: tokenFor(user), user: publicUser(user) });
  },

  async register(payload) {
    const users = read('users');
    const phone = normalizeVietnamesePhone(payload.phone);
    if (!phone) fail('Số điện thoại Việt Nam không hợp lệ');
    if (payload.email && users.some((user) => user.email?.toLowerCase() === payload.email.toLowerCase())) {
      fail('Email đã được sử dụng');
    }
    if (users.some((user) => user.phone === phone)) fail('Số điện thoại đã được sử dụng');
    const user = {
      id: createId('user'),
      role: 'customer',
      status: 'active',
      address: '',
      createdAt: new Date().toISOString(),
      ...payload,
      phone,
      authProvider: 'phone',
      phoneVerified: false,
      phoneVerifiedAt: null,
    };
    write('users', [...users, user]);
    // Like the backend: the account is created but no session is opened.
    return wait({ user: publicUser(user) });
  },

  async requestPasswordReset(identifier) {
    const phone = normalizeVietnamesePhone(identifier);
    const user = read('users').find((item) => item.phone === phone);
    if (!user) return wait({ message: 'Nếu tài khoản tồn tại, mã OTP đã được gửi.' });
    const request = {
      id: createId('otp'),
      purpose: 'password-reset',
      identifier: phone,
      target: user.phone,
      channel: 'sms',
      userId: user.id,
      otp: mockOtp,
      expiresAt: Date.now() + 10 * 60 * 1000,
    };
    writeOtpRequests([
      request,
      ...readOtpRequests().filter((item) => !(item.purpose === request.purpose && item.userId === user.id)),
    ]);
    return wait({ deliveryTarget: `${phone.slice(0, 3)}***${phone.slice(-3)}`, expiresInSeconds: 600, debugOtp: mockOtp });
  },

  async resetPassword(identifier, otp, newPassword) {
    const phone = normalizeVietnamesePhone(identifier);
    const request = readOtpRequests().find(
      (item) =>
        item.purpose === 'password-reset'
        && item.identifier === phone
        && item.channel === 'sms'
        && item.expiresAt > Date.now(),
    );
    if (!request || request.otp !== otp) fail('Mã OTP không hợp lệ hoặc đã hết hạn');
    const users = read('users');
    const user = users.find((item) => item.id === request.userId);
    user.password = newPassword;
    write('users', users);
    writeOtpRequests(readOtpRequests().filter((item) => item.id !== request.id));
    return wait({ message: 'Đặt lại mật khẩu thành công' });
  },

  async updateUser(userId, updates) {
    const users = read('users');
    const updated = users.map((user) => (user.id === userId ? { ...user, ...updates } : user));
    const user = updated.find((item) => item.id === userId);
    if (!user) fail('Không tìm thấy người dùng', 404);
    write('users', updated);
    return wait(publicUser(user));
  },

  async updateProfile(userId, updates) {
    const allowed = ['fullName', 'address', 'avatar', 'shippingAddress'];
    const safeUpdates = Object.fromEntries(
      Object.entries(updates || {}).filter(([key]) => allowed.includes(key)),
    );
    if (safeUpdates.shippingAddress) {
      const address = pickShippingAddress(safeUpdates.shippingAddress);
      if (!hasCompleteAddress(address)) fail('Vui lòng nhập đủ họ tên, số điện thoại, địa chỉ, tỉnh/thành và phường/xã', 422);
      const phone = normalizeVietnamesePhone(address.phone);
      if (!phone) fail('Số điện thoại Việt Nam không hợp lệ', 422);
      safeUpdates.shippingAddress = { ...address, phone };
    }
    return this.updateUser(userId, safeUpdates);
  },

  async getWishlist(userId) {
    const user = read('users').find((item) => item.id === userId);
    if (!user) fail('Không tìm thấy người dùng', 404);
    return wait([...(user.wishlist || [])]);
  },

  async updateWishlist(userId, items) {
    const users = read('users');
    const user = users.find((item) => item.id === userId);
    if (!user) fail('Không tìm thấy người dùng', 404);
    user.wishlist = [...new Set((items || []).filter((item) => typeof item === 'string'))].slice(0, 100);
    write('users', users);
    return wait([...user.wishlist]);
  },

  async changePassword(userId, currentPassword, newPassword) {
    const users = read('users');
    const user = users.find((item) => item.id === userId);
    if (!user || user.password !== currentPassword) fail('Mật khẩu hiện tại không đúng');
    user.password = newPassword;
    write('users', users);
    return wait({ message: 'Đổi mật khẩu thành công' });
  },

  async list(name) {
    return wait(clone(read(name)));
  },

  async get(name, id) {
    const item = read(name).find((entry) => entry.id === id);
    if (!item) fail('Không tìm thấy dữ liệu', 404);
    return wait(clone(item));
  },

  async listPublicCatalog(name) {
    if (!['products', 'accessories'].includes(name)) fail('Danh mục công khai không hợp lệ', 404);
    return wait(clone(read(name).filter((item) => item.status === 'active')));
  },

  async getPublicCatalogItem(name, id) {
    if (!['products', 'accessories'].includes(name)) fail('Danh mục công khai không hợp lệ', 404);
    const item = read(name).find((entry) => entry.id === id && entry.status === 'active');
    if (!item) fail('Không tìm thấy dữ liệu', 404);
    return wait(clone(item));
  },

  async save(name, payload) {
    if ((name === 'categories' || name === 'brands') && payload.name && !payload.slug) payload = { ...payload, slug: slugify(payload.name) };
    const items = read(name);
    const now = new Date().toISOString();
    if (payload.id) {
      const updated = items.map((item) =>
        item.id === payload.id ? { ...item, ...payload, updatedAt: now } : item,
      );
      write(name, updated);
      return wait(clone(updated.find((item) => item.id === payload.id)));
    }
    const item = { ...payload, id: createId(name.slice(0, -1)), createdAt: now, updatedAt: now };
    write(name, [item, ...items]);
    return wait(clone(item));
  },

  async remove(name, id) {
    const items = read(name);
    write(name, items.filter((item) => item.id !== id));
    return wait({ success: true });
  },

  async createOrder(payload, idempotencyKey, authorization) {
    const user = requireActiveCheckoutUser();
    if (payload.paymentMethod === 'card' && authorization !== vnpayCheckoutAuthorization) {
      fail('Thanh toán thẻ chỉ khả dụng qua VNPay', 422);
    }
    const orders = read('orders');
    const scopedKey = scopedCheckoutKey(user.id, idempotencyKey);
    const existing = scopedKey
      ? orders.find((order) => order.idempotencyKey === scopedKey)
      : null;
    if (existing) return wait(clone(existing));

    const products = read('products');
    const accessories = read('accessories');
    const items = (payload.items || []).map((item) => {
      const type = item.type === 'accessory' || item.accessoryId ? 'accessory' : 'product';
      const catalog = type === 'accessory' ? accessories : products;
      const itemId = type === 'accessory'
        ? item.accessoryId || item.productId || item.id
        : item.productId || item.id;
      const current = catalog.find((entry) => entry.id === itemId);
      const quantity = Number(item.quantity);
      if (!current || current.status !== 'active') {
        fail(`${type === 'accessory' ? 'Phụ kiện' : 'Sản phẩm'} hiện không khả dụng`);
      }
      if (!Number.isInteger(quantity) || quantity < 1 || current.stock < quantity) {
        fail(`${current.name} không đủ số lượng tồn kho`);
      }
      current.stock -= quantity;
      current.sold = Number(current.sold || 0) + quantity;
      return {
        id: current.id,
        productId: type === 'product' ? current.id : null,
        accessoryId: type === 'accessory' ? current.id : null,
        name: current.name,
        image: current.image || '',
        price: Number(current.price),
        quantity,
        type,
      };
    });
    if (!items.length) fail('Đơn hàng phải có ít nhất một sản phẩm', 422);

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = getShippingQuote({ province: payload.customer?.province, subtotal });
    const voucher = payload.voucherCode
      ? read('vouchers').find(
          (item) => item.code.toLowerCase() === String(payload.voucherCode).trim().toLowerCase(),
        )
      : null;
    if (payload.voucherCode) {
      const now = new Date();
      const usable = voucher
        && voucherVisibleTo(voucher, user.id)
        && voucher.active
        && subtotal >= Number(voucher.minOrder || 0)
        && now >= new Date(voucher.startDate)
        && now <= new Date(`${voucher.endDate}T23:59:59`)
        && (!Number(voucher.quantity) || Number(voucher.used || 0) < Number(voucher.quantity));
      if (!usable) fail('Mã giảm giá không hợp lệ');
    }
    if (voucher) voucher.used = Number(voucher.used || 0) + 1;
    const discount = calculateVoucherDiscount(voucher, subtotal, shipping.fee);
    const now = new Date();
    const { saveAddress, ...orderFields } = payload;
    const order = {
      ...orderFields,
      userId: user.id,
      items,
      subtotal,
      shippingFee: shipping.fee,
      discount,
      total: Math.max(0, subtotal + shipping.fee - discount),
      voucherCode: voucher?.code || null,
      voucherUsageReleased: false,
      idempotencyKey: scopedKey || undefined,
      id: createId('order'),
      orderNumber: `TP${now.toISOString().slice(2, 10).replaceAll('-', '')}${String(orders.length + 1).padStart(2, '0')}`,
      status: 'pending',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    write('products', products);
    write('accessories', accessories);
    if (voucher) {
      write('vouchers', read('vouchers').map(
        (item) => (item.code === voucher.code ? voucher : item),
      ));
    }
    write('orders', [order, ...orders]);
    rememberShippingAddress(user.id, order.customer, saveAddress === true);
    return wait(clone(order));
  },

  async createVnpayCheckout(payload, idempotencyKey) {
    const paymentReference = createId('vnpay');
    const resultProof = createId('proof');
    const order = await this.createOrder({
      ...payload,
      paymentMethod: 'card',
      paymentStatus: 'pending',
      paymentReference,
    }, idempotencyKey, vnpayCheckoutAuthorization);
    return wait({
      order,
      transaction: {
        reference: order.paymentReference,
        provider: 'vnpay',
        status: 'pending',
      },
      resultProof,
      paymentUrl: `/payment-result?provider=vnpay&reference=${encodeURIComponent(order.paymentReference)}&code=00&mock=true&proof=${encodeURIComponent(resultProof)}`,
    });
  },

  async ordersForUser(userId) {
    return wait(clone(read('orders').filter((order) => order.userId === userId)));
  },

  async findOrder(orderNumber, phone) {
    const canonicalPhone = normalizeVietnamesePhone(phone);
    const order = read('orders').find(
      (item) =>
        item.orderNumber.toLowerCase() === String(orderNumber || '').toLowerCase()
          && item.customer.phone === canonicalPhone,
    );
    if (!order) fail('Không tìm thấy đơn hàng phù hợp', 404);
    return wait(publicLookupOrder(order));
  },

  async updateOrderStatus(id, status) {
    const orders = read('orders');
    const order = orders.find((item) => item.id === id);
    if (!order) fail('Không tìm thấy đơn hàng', 404);
    if (status !== order.status && !getNextOrderStatuses(order.status).includes(status)) {
      fail(
        `Không thể chuyển đơn từ ${getOrderStatus(order.status).label.toLowerCase()} sang ${getOrderStatus(status).label.toLowerCase()}`,
        400,
      );
    }
    if (status === 'cancelled' && order.status !== 'cancelled') {
      if (['paid', 'refund_required', 'refunded'].includes(order.paymentStatus)) {
        fail('Không thể tự động hủy đơn hàng đã thanh toán', 400);
      }
      if (['shipping', 'delivered', 'completed'].includes(order.status)) {
        fail('Đơn hàng không còn có thể hủy', 400);
      }
      const products = read('products');
      const accessories = read('accessories');
      (order.items || []).forEach((item) => {
        const catalog = item.type === 'accessory' ? accessories : products;
        const current = catalog.find(
          (entry) => entry.id === (item.accessoryId || item.productId || item.id),
        );
        if (current) {
          current.stock = Number(current.stock || 0) + Number(item.quantity);
          current.sold = Math.max(0, Number(current.sold || 0) - Number(item.quantity));
        }
      });
      if (order.voucherCode && !order.voucherUsageReleased) {
        const vouchers = read('vouchers');
        const voucher = vouchers.find((item) => item.code === order.voucherCode);
        if (voucher) voucher.used = Math.max(0, Number(voucher.used || 0) - 1);
        write('vouchers', vouchers);
        order.voucherUsageReleased = true;
      }
      write('products', products);
      write('accessories', accessories);
    }
    order.status = status;
    order.updatedAt = new Date().toISOString();
    write('orders', orders);
    return wait(clone(order));
  },

  // Customer self-service cancel: same rule as the backend, only before the shop confirms.
  async cancelMyOrder(id) {
    const session = currentMockUser();
    if (!session) fail('Vui lòng đăng nhập để tiếp tục', 401);
    const order = read('orders').find((item) => item.id === id);
    if (!order) fail('Không tìm thấy đơn hàng', 404);
    if (session.role !== 'admin' && order.userId !== session.id) {
      fail('Bạn không có quyền truy cập đơn hàng này', 403);
    }
    if (order.status === 'cancelled') return wait(clone(order));
    if (session.role !== 'admin' && order.status !== 'pending') {
      fail('Đơn hàng đã được cửa hàng xác nhận nên bạn không thể tự hủy. Vui lòng liên hệ cửa hàng để được hỗ trợ.', 400);
    }
    return this.updateOrderStatus(id, 'cancelled');
  },

  async updateOrderShipping(id, payload) {
    const orders = read('orders');
    const order = orders.find((item) => item.id === id);
    if (!order) fail('Không tìm thấy đơn hàng', 404);
    Object.assign(order, payload, { updatedAt: new Date().toISOString() });
    write('orders', orders);
    return wait(clone(order));
  },

  async reconcileManualPayment(id, payload) {
    const actor = currentMockUser();
    if (!actor || actor.role !== 'admin' || actor.status !== 'active') {
      fail('Bạn không có đủ quyền để thực hiện thao tác này', 403);
    }
    const allowedFields = ['status', 'reference', 'note'];
    if (
      !payload
      || typeof payload !== 'object'
      || Array.isArray(payload)
      || Object.keys(payload).some((field) => !allowedFields.includes(field))
      || !['paid', 'failed'].includes(payload.status)
      || (payload.reference !== undefined && typeof payload.reference !== 'string')
      || (payload.note !== undefined && typeof payload.note !== 'string')
    ) {
      fail('Dữ liệu đối soát không hợp lệ', 422);
    }
    const reference = String(payload.reference || '').trim();
    const note = String(payload.note || '').trim();
    if (reference.length > 150 || note.length > 1000) {
      fail('Dữ liệu đối soát vượt quá độ dài cho phép', 422);
    }
    if (payload.status === 'paid' && !reference) {
      fail('Mã tham chiếu là bắt buộc', 422);
    }

    const orders = read('orders');
    const order = orders.find((item) => item.id === id);
    if (!order) fail('Không tìm thấy đơn hàng', 404);
    if (!['bank', 'momo'].includes(order.paymentMethod)) {
      fail('Đơn hàng không dùng thanh toán thủ công', 409);
    }
    if (!['pending', 'failed'].includes(order.paymentStatus) || order.paymentStatus === payload.status) {
      fail('Thanh toán đã được đối soát', 409);
    }
    order.paymentStatus = payload.status;
    order.paymentReference = reference;
    order.paymentAudit = {
      confirmedBy: actor.id,
      confirmedAt: new Date().toISOString(),
      note,
    };
    if (payload.status === 'paid' && order.status === 'pending') order.status = 'confirmed';
    order.updatedAt = new Date().toISOString();
    write('orders', orders);
    return wait(clone(order));
  },

  async checkVoucher(code, subtotal) {
    const voucher = read('vouchers').find(
      (item) => item.code.toLowerCase() === code.trim().toLowerCase() && item.active,
    );
    if (!voucher || !voucherVisibleTo(voucher, currentMockUser()?.id)) fail('Mã giảm giá không hợp lệ');
    if (Number(voucher.quantity) && Number(voucher.used || 0) >= Number(voucher.quantity)) {
      fail('Mã giảm giá đã hết lượt sử dụng');
    }
    if (subtotal < voucher.minOrder) fail(`Đơn hàng chưa đạt giá trị tối thiểu ${voucher.minOrder}`);
    const today = new Date();
    if (today < new Date(voucher.startDate) || today > new Date(`${voucher.endDate}T23:59:59`)) {
      fail('Mã giảm giá đã hết hạn');
    }
    return wait(clone(voucher));
  },

  async dashboard(period = {}) {
    return wait(buildDashboard({
      products: read('products'),
      accessories: read('accessories'),
      orders: read('orders'),
      users: read('users'),
      ...period,
    }));
  },

  async revenue(period = {}) {
    return wait(buildRevenue(read('orders'), period));
  },

  async myVouchers() {
    const session = currentMockUser();
    if (!session) fail('Vui lòng đăng nhập để tiếp tục', 401);
    return wait(read('vouchers')
      .filter((voucher) => voucher.assignedUserId === session.id)
      .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
      .map((voucher) => ({ ...clone(voucher), status: voucherStatus(voucher) })));
  },

  async giftVoucher(customerId, payload = {}) {
    const actor = currentMockUser();
    if (!actor || actor.role !== 'admin') fail('Bạn không có đủ quyền để thực hiện thao tác này', 403);
    const customer = read('users').find((user) => user.id === customerId && user.role === 'customer');
    if (!customer) fail('Không tìm thấy khách hàng', 404);
    const value = Number(payload.value);
    if (!['percent', 'fixed', 'shipping'].includes(payload.type)) fail('Loại mã giảm giá không hợp lệ', 422);
    if (!(value > 0) || (payload.type === 'percent' && value > 100)) fail('Giá trị giảm không hợp lệ', 422);
    if (!payload.endDate || voucherEnd(payload) < new Date()) fail('Ngày hết hạn phải từ hôm nay trở đi', 422);
    const now = new Date().toISOString();
    const voucher = {
      id: createId('voucher'),
      code: giftCode(),
      type: payload.type,
      value,
      minOrder: Number(payload.minOrder || 0),
      maxDiscount: payload.type === 'percent' ? Number(payload.maxDiscount || 0) : 0,
      quantity: 1,
      used: 0,
      startDate: now.slice(0, 10),
      endDate: String(payload.endDate).slice(0, 10),
      active: true,
      assignedUserId: customer.id,
      note: String(payload.note || '').trim() || `Tri ân khách hàng ${customer.fullName}`,
      createdAt: now,
      updatedAt: now,
    };
    write('vouchers', [voucher, ...read('vouchers')]);
    return wait(clone(voucher));
  },

  reset() {
    Object.values(collections).forEach(([key]) => storage.remove(key));
    storage.remove(STORAGE_KEYS.mockOtpRequests);
  },
};

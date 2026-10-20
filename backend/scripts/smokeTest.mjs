// End-to-end smoke test of every feature against a running, freshly seeded backend.
// Usage: npm run smoke -- [apiBase] [sepayApiKey] [demoPassword]
// The backend must be started with SEPAY_WEBHOOK_API_KEY and the BANK_* variables set.
const API = process.argv[2] || 'http://127.0.0.1:5000/api';
const SEPAY_KEY = process.argv[3] || process.env.SEPAY_WEBHOOK_API_KEY || '';
const PASSWORD = process.argv[4] || process.env.SEED_DEMO_PASSWORD || '123456';

const results = [];
const check = (group, name, ok, detail = '') => {
  results.push({ group, name, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} [${group}] ${name}${!ok && detail ? ` -> ${detail}` : ''}`);
};

const call = async (method, path, { body, token, headers = {}, raw = false } = {}) => {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  if (raw) return { status: response.status, text: await response.text(), headers: response.headers };
  const json = await response.json().catch(() => ({}));
  return { status: response.status, data: json.data, message: json.message, json };
};

const run = async (group, name, fn) => {
  try {
    await fn();
  } catch (error) {
    check(group, name, false, `exception: ${error.message}`);
  }
};

const unique = Date.now().toString().slice(-7);
const customerPhone = `097${unique}`;
const shipping = {
  fullName: 'Khach Smoke Test', email: 'smoke@example.com', phone: customerPhone,
  address: '1 Nguyen Hue', province: 'TP. Hồ Chí Minh', ward: 'Bến Nghé',
};
let adminToken;
let customerToken;
let products = [];
let accessories = [];

// ---------- Hệ thống ----------
await run('Hệ thống', 'Health check', async () => {
  const r = await call('GET', '/health');
  check('Hệ thống', 'Health check', r.status === 200 && r.data?.status === 'ok', r.status);
});
await run('Hệ thống', 'Swagger docs', async () => {
  const r = await fetch(API.replace(/\/api$/, '/api/docs/'));
  check('Hệ thống', 'Swagger docs', r.status === 200, r.status);
});
await run('Hệ thống', 'Sitemap SEO', async () => {
  const r = await call('GET', '/seo/sitemap.xml', { raw: true });
  check('Hệ thống', 'Sitemap SEO', r.status === 200 && r.text.includes('<urlset'), r.status);
});

// ---------- Tài khoản ----------
await run('Tài khoản', 'Đăng nhập admin', async () => {
  const r = await call('POST', '/auth/login', { body: { identifier: '0900000000', password: PASSWORD } });
  adminToken = r.data?.token;
  check('Tài khoản', 'Đăng nhập admin', r.status === 200 && r.data?.user?.role === 'admin', `${r.status} ${r.message}`);
});
await run('Tài khoản', 'Đăng nhập sai mật khẩu bị từ chối', async () => {
  const r = await call('POST', '/auth/login', { body: { identifier: '0911111111', password: 'wrong-password' } });
  check('Tài khoản', 'Đăng nhập sai mật khẩu bị từ chối', r.status === 401, r.status);
});
await run('Tài khoản', 'Đăng ký bằng OTP', async () => {
  const otp = await call('POST', '/auth/register/request-otp', { body: { fullName: 'Khach Smoke Test', phone: customerPhone, password: 'smoke-123456' } });
  const verify = await call('POST', '/auth/register/verify-otp', { body: { phone: customerPhone, otp: otp.data?.debugOtp } });
  customerToken = verify.data?.token;
  check('Tài khoản', 'Đăng ký bằng OTP', [200, 202].includes(otp.status) && Boolean(customerToken), `${otp.status}/${verify.status} ${verify.message}`);
});
await run('Tài khoản', 'Xem & cập nhật hồ sơ', async () => {
  const me = await call('GET', '/auth/me', { token: customerToken });
  const updated = await call('PUT', '/auth/profile', { token: customerToken, body: { address: '12 Le Loi' } });
  check('Tài khoản', 'Xem & cập nhật hồ sơ', me.status === 200 && updated.data?.address === '12 Le Loi', `${me.status}/${updated.status}`);
});
await run('Tài khoản', 'Đổi mật khẩu', async () => {
  const r = await call('PUT', '/auth/change-password', { token: customerToken, body: { currentPassword: 'smoke-123456', newPassword: 'smoke-654321' } });
  const login = await call('POST', '/auth/login', { body: { identifier: customerPhone, password: 'smoke-654321' } });
  if (login.data?.token) customerToken = login.data.token;
  check('Tài khoản', 'Đổi mật khẩu', r.status === 200 && login.status === 200, `${r.status}/${login.status}`);
});
await run('Tài khoản', 'Quên mật khẩu (OTP)', async () => {
  const req = await call('POST', '/auth/forgot-password/request-otp', { body: { identifier: customerPhone } });
  const reset = await call('POST', '/auth/forgot-password/reset', { body: { identifier: customerPhone, otp: req.data?.debugOtp, newPassword: 'smoke-777777' } });
  const login = await call('POST', '/auth/login', { body: { identifier: customerPhone, password: 'smoke-777777' } });
  if (login.data?.token) customerToken = login.data.token;
  check('Tài khoản', 'Quên mật khẩu (OTP)', [200, 202].includes(req.status) && reset.status === 200 && login.status === 200, `${req.status}/${reset.status}/${login.status} ${reset.message}`);
});
await run('Tài khoản', 'Danh sách yêu thích', async () => {
  const put = await call('PUT', '/auth/wishlist', { token: customerToken, body: { items: [{ id: 'phone-1', type: 'product' }] } });
  const get = await call('GET', '/auth/wishlist', { token: customerToken });
  check('Tài khoản', 'Danh sách yêu thích', put.status === 200 && get.status === 200, `${put.status}/${get.status} ${put.message}`);
});
await run('Tài khoản', 'Làm mới phiên & đăng xuất', async () => {
  const login = await call('POST', '/auth/login', { body: { identifier: '0911111111', password: PASSWORD } });
  const refreshed = await call('POST', '/auth/refresh', { body: { refreshToken: login.data?.refreshToken } });
  const logout = await call('POST', '/auth/logout', { token: refreshed.data?.token, body: { refreshToken: refreshed.data?.refreshToken } });
  check('Tài khoản', 'Làm mới phiên & đăng xuất', refreshed.status === 200 && [200, 204].includes(logout.status), `${refreshed.status}/${logout.status}`);
});

// ---------- Danh mục sản phẩm ----------
await run('Sản phẩm', 'Danh sách, chi tiết, tìm kiếm', async () => {
  const list = await call('GET', '/products');
  products = Array.isArray(list.data) ? list.data : list.data?.items || [];
  const detail = await call('GET', `/products/${products[0]?.id}`);
  const search = await call('GET', '/products?search=Galaxy');
  const found = Array.isArray(search.data) ? search.data : search.data?.items || [];
  check('Sản phẩm', 'Danh sách, chi tiết, tìm kiếm', products.length > 0 && detail.status === 200 && found.length > 0, `${list.status}/${detail.status}/${found.length}`);
});
await run('Sản phẩm', 'Phụ kiện, danh mục, thương hiệu, banner', async () => {
  const acc = await call('GET', '/accessories');
  accessories = Array.isArray(acc.data) ? acc.data : acc.data?.items || [];
  const [cat, brand, banner] = await Promise.all([call('GET', '/categories'), call('GET', '/brands'), call('GET', '/banners')]);
  check('Sản phẩm', 'Phụ kiện, danh mục, thương hiệu, banner', accessories.length > 0 && [cat, brand, banner].every((r) => r.status === 200), `${acc.status}/${cat.status}/${brand.status}/${banner.status}`);
});
await run('Sản phẩm', 'Cài đặt cửa hàng công khai', async () => {
  const r = await call('GET', '/settings');
  check('Sản phẩm', 'Cài đặt cửa hàng công khai', r.status === 200, r.status);
});

// ---------- Voucher & đánh giá & liên hệ ----------
await run('Voucher', 'Kiểm tra mã giảm giá', async () => {
  const ok = await call('POST', '/vouchers/check', { body: { code: 'TECH10', subtotal: 6000000 } });
  const tooSmall = await call('POST', '/vouchers/check', { body: { code: 'TECH10', subtotal: 1000000 } });
  check('Voucher', 'Kiểm tra mã giảm giá', ok.status === 200 && tooSmall.status === 400, `${ok.status}/${tooSmall.status} ${ok.message}`);
});
await run('Đánh giá', 'Gửi & xem đánh giá, admin duyệt', async () => {
  const productId = products[0]?.id;
  const created = await call('POST', '/reviews', { token: customerToken, body: { productId, rating: 5, comment: 'Máy chạy mượt, pin tốt, giao hàng nhanh.' } });
  const approve = await call('PUT', `/admin/reviews/${created.data?.id}/approve`, { token: adminToken });
  const list = await call('GET', `/reviews/product/${productId}`);
  check('Đánh giá', 'Gửi & xem đánh giá, admin duyệt', created.status === 201 && approve.status === 200 && list.status === 200, `${created.status}/${approve.status}/${list.status} ${created.message}`);
});
await run('Liên hệ', 'Gửi liên hệ & admin xử lý', async () => {
  const created = await call('POST', '/contacts', { body: { fullName: 'Khach', email: 'k@example.com', phone: '0912345678', subject: 'Hỏi bảo hành', message: 'Cho mình hỏi về bảo hành máy.' } });
  const update = await call('PUT', `/contacts/${created.data?.id}`, { token: adminToken, body: { status: 'resolved' } });
  check('Liên hệ', 'Gửi liên hệ & admin xử lý', created.status === 201 && update.status === 200, `${created.status}/${update.status} ${created.message}`);
});

// ---------- Đặt hàng & thanh toán ----------
const placeOrder = (paymentMethod, extra = {}) => call('POST', '/orders', {
  token: customerToken,
  headers: { 'Idempotency-Key': `checkout-smoke-${paymentMethod}-${Date.now()}` },
  body: { items: [{ id: accessories[0]?.id, accessoryId: accessories[0]?.id, type: 'accessory', quantity: 1 }], customer: shipping, paymentMethod, ...extra },
});
let codOrder;
let bankOrder;
await run('Đơn hàng', 'Cấu hình thanh toán', async () => {
  const r = await call('GET', '/payments/config');
  const p = r.data?.providers || {};
  check('Đơn hàng', 'Cấu hình thanh toán', p.cod?.enabled && p.bank?.enabled && p.bank?.autoConfirm, JSON.stringify(p));
});
await run('Đơn hàng', 'Đặt hàng COD + voucher', async () => {
  const r = await call('POST', '/orders', {
    token: customerToken,
    headers: { 'Idempotency-Key': `checkout-smoke-cod-${Date.now()}` },
    body: { items: [{ id: products[0]?.id, productId: products[0]?.id, type: 'product', quantity: 1 }], customer: shipping, paymentMethod: 'cod', voucherCode: 'TECH10' },
  });
  codOrder = r.data;
  check('Đơn hàng', 'Đặt hàng COD + voucher', r.status === 201 && codOrder?.discount > 0, `${r.status} ${r.message} discount=${codOrder?.discount}`);
});
await run('Đơn hàng', 'Đơn của tôi, tra cứu đơn công khai', async () => {
  const mine = await call('GET', '/orders/my-orders', { token: customerToken });
  const lookup = await call('GET', `/orders/lookup?orderNumber=${codOrder?.orderNumber}&phone=${customerPhone}`);
  const wrong = await call('GET', `/orders/lookup?orderNumber=${codOrder?.orderNumber}&phone=0999999999`);
  const items = Array.isArray(mine.data) ? mine.data : mine.data?.items || [];
  check('Đơn hàng', 'Đơn của tôi, tra cứu đơn công khai', items.length > 0 && lookup.status === 200 && wrong.status === 404, `${mine.status}/${lookup.status}/${wrong.status}`);
});
await run('Đơn hàng', 'Hủy đơn', async () => {
  const r = await call('PUT', `/orders/${codOrder?.id}/cancel`, { token: customerToken });
  check('Đơn hàng', 'Hủy đơn', r.status === 200 && r.data?.status === 'cancelled', `${r.status} ${r.message}`);
});
await run('Thanh toán', 'Chuyển khoản: đặt đơn → webhook SePay tự xác nhận', async () => {
  const order = await placeOrder('bank');
  bankOrder = order.data;
  const hook = (id, amount, key = SEPAY_KEY) => call('POST', '/payments/sepay/webhook', {
    headers: { Authorization: `Apikey ${key}` },
    body: { id, gateway: 'Vietcombank', content: `${bankOrder?.orderNumber} thanh toan`, transferType: 'in', transferAmount: amount },
  });
  const badKey = await hook(Date.now(), bankOrder?.total, 'wrong-key');
  const short = await hook(Date.now() + 1, 1000);
  const fullId = Date.now() + 2;
  const full = await hook(fullId, bankOrder?.total);
  const retry = await hook(fullId, bankOrder?.total);
  const after = await call('GET', `/orders/${bankOrder?.id}`, { token: customerToken });
  check('Thanh toán', 'Chuyển khoản: đặt đơn → webhook SePay tự xác nhận',
    order.status === 201 && badKey.status === 401 && short.json.underpaid && full.json.paymentStatus === 'paid'
      && retry.json.duplicate && after.data?.paymentStatus === 'paid' && after.data?.status === 'confirmed',
    `${order.status}/${badKey.status}/${JSON.stringify(full.json)}/${after.data?.paymentStatus}`);
});
await run('Thanh toán', 'MoMo: admin đối soát thủ công', async () => {
  const order = await placeOrder('momo');
  const reconcile = await call('PUT', `/admin/orders/${order.data?.id}/payment`, { token: adminToken, body: { status: 'paid', reference: 'MOMO123', note: 'Đã nhận' } });
  check('Thanh toán', 'MoMo: admin đối soát thủ công', order.status === 201 && reconcile.data?.paymentStatus === 'paid', `${order.status}/${reconcile.status} ${reconcile.message}`);
});
await run('Thanh toán', 'VNPay (chưa cấu hình → báo 503 rõ ràng)', async () => {
  const r = await call('POST', '/payments/vnpay/checkout', { token: customerToken, headers: { 'Idempotency-Key': `checkout-smoke-vnpay-${Date.now()}` }, body: { items: [{ id: accessories[0]?.id, type: 'accessory', quantity: 1 }], customer: shipping, paymentMethod: 'card' } });
  check('Thanh toán', 'VNPay (chưa cấu hình → báo 503 rõ ràng)', r.status === 503, `${r.status} ${r.message}`);
});

// ---------- Quản trị ----------
await run('Quản trị', 'Dashboard, khách hàng, đơn hàng', async () => {
  const [dash, customers, orders] = await Promise.all([
    call('GET', '/admin/dashboard', { token: adminToken }),
    call('GET', '/admin/customers?page=1&limit=10', { token: adminToken }),
    call('GET', '/admin/orders?page=1&limit=10', { token: adminToken }),
  ]);
  check('Quản trị', 'Dashboard, khách hàng, đơn hàng', [dash, customers, orders].every((r) => r.status === 200), `${dash.status}/${customers.status}/${orders.status}`);
});
await run('Quản trị', 'Cập nhật trạng thái & vận đơn', async () => {
  const status = await call('PUT', `/admin/orders/${bankOrder?.id}/status`, { token: adminToken, body: { status: 'shipping' } });
  const tracking = await call('PUT', `/admin/orders/${bankOrder?.id}`, { token: adminToken, body: { trackingNumber: 'GHN123456', shippingProvider: 'GHN' } });
  check('Quản trị', 'Cập nhật trạng thái & vận đơn', status.status === 200 && tracking.status === 200, `${status.status} ${status.message}/${tracking.status} ${tracking.message}`);
});
await run('Quản trị', 'CRUD sản phẩm', async () => {
  const base = products[0];
  const created = await call('POST', '/admin/products', { token: adminToken, body: { name: `Smoke Phone ${unique}`, brandId: base.brandId, categoryId: base.categoryId, price: 9990000, stock: 3, ram: '8GB', storage: '128GB', image: 'https://placehold.co/600x600.png', status: 'active' } });
  const updated = await call('PUT', `/admin/products/${created.data?.id}`, { token: adminToken, body: { price: 8990000 } });
  const removed = await call('DELETE', `/admin/products/${created.data?.id}`, { token: adminToken });
  check('Quản trị', 'CRUD sản phẩm', created.status === 201 && updated.data?.price === 8990000 && removed.status === 200, `${created.status} ${created.message}/${updated.status}/${removed.status}`);
});
await run('Quản trị', 'CRUD voucher, banner, danh mục, thương hiệu', async () => {
  const voucher = await call('POST', '/admin/vouchers', { token: adminToken, body: { code: `SMOKE${unique}`, type: 'fixed', value: 100000, minOrder: 0, maxDiscount: 0, quantity: 10, startDate: '2026-01-01', endDate: '2026-12-31', active: true } });
  const banner = await call('POST', '/admin/banners', { token: adminToken, body: { title: 'Smoke banner', image: 'https://placehold.co/1200x400.png', link: '/products', position: 9, active: true } });
  const category = await call('POST', '/admin/categories', { token: adminToken, body: { name: `Smoke cat ${unique}` } });
  const brand = await call('POST', '/admin/brands', { token: adminToken, body: { name: `Smoke brand ${unique}` } });
  const cleanup = await Promise.all([
    call('DELETE', `/admin/vouchers/${voucher.data?.id}`, { token: adminToken }),
    call('DELETE', `/admin/banners/${banner.data?.id}`, { token: adminToken }),
    call('DELETE', `/admin/categories/${category.data?.id}`, { token: adminToken }),
    call('DELETE', `/admin/brands/${brand.data?.id}`, { token: adminToken }),
  ]);
  check('Quản trị', 'CRUD voucher, banner, danh mục, thương hiệu', [voucher, banner, category, brand].every((r) => r.status === 201) && cleanup.every((r) => r.status === 200),
    [voucher, banner, category, brand].map((r) => `${r.status} ${r.message}`).join(' | '));
});
await run('Quản trị', 'Upload ảnh sản phẩm', async () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg==', 'base64');
  const form = new FormData();
  form.append('productImage', new Blob([png], { type: 'image/png' }), 'smoke.png');
  const r = await call('POST', '/uploads/products', { token: adminToken, body: form });
  check('Quản trị', 'Upload ảnh sản phẩm', r.status === 201 || r.status === 200, `${r.status} ${r.message}`);
});
await run('Quản trị', 'Khách thường không vào được trang admin', async () => {
  const r = await call('GET', '/admin/dashboard', { token: customerToken });
  check('Quản trị', 'Khách thường không vào được trang admin', r.status === 403, r.status);
});

// ---------- Chatbot ----------
const visitorId = `v-smoke-${unique}`;
let chatSession;
await run('Chatbot', 'Cấu hình công khai', async () => {
  const r = await call('GET', '/chat/config');
  check('Chatbot', 'Cấu hình công khai', r.status === 200 && r.data?.enabled === true && r.data?.quickQuestions?.length > 0, r.status);
});
await run('Chatbot', 'Gửi tin nhắn (tư vấn theo ngân sách)', async () => {
  const r = await call('POST', '/chat/messages', { body: { message: 'Tư vấn điện thoại dưới 25 triệu', visitorId } });
  chatSession = r.data?.sessionId;
  const prices = (r.data?.message?.products || []).map((item) => item.price);
  check('Chatbot', 'Gửi tin nhắn (tư vấn theo ngân sách)', r.status === 201 && prices.length > 0 && prices.every((price) => price <= 25000000), `${r.status} source=${r.data?.message?.source} ${r.message}`);
});
await run('Chatbot', 'Streaming SSE', async () => {
  const r = await call('POST', '/chat/messages/stream', { raw: true, body: { message: 'Chính sách bảo hành thế nào?', visitorId, sessionId: chatSession } });
  const events = r.text.split('\n\n').filter((block) => block.startsWith('data: ')).map((block) => JSON.parse(block.slice(6)));
  const done = events.at(-1);
  check('Chatbot', 'Streaming SSE', r.status === 200 && events.some((e) => e.type === 'delta') && done?.type === 'done' && /12 tháng/.test(done.message?.content || ''), `${r.status} events=${events.length}`);
});
await run('Chatbot', 'Tra đơn qua chatbot', async () => {
  const r = await call('POST', '/chat/messages', { body: { message: `Đơn ${bankOrder?.orderNumber} số điện thoại ${customerPhone}`, visitorId, sessionId: chatSession } });
  check('Chatbot', 'Tra đơn qua chatbot', r.status === 201 && (r.data?.message?.toolCalls || []).some((t) => t.name === 'lookup_order') && /giao hàng|xác nhận|Đang/i.test(r.data?.message?.content || ''), r.data?.message?.content?.slice(0, 80));
});
await run('Chatbot', 'Lịch sử, đánh giá câu trả lời, chặn người khác xem', async () => {
  const history = await call('GET', `/chat/sessions/${chatSession}?visitorId=${visitorId}`);
  const other = await call('GET', `/chat/sessions/${chatSession}?visitorId=v-someone-else-1`);
  const last = history.data?.messages?.at(-1);
  const rated = await call('POST', `/chat/messages/${last?.id}/feedback`, { body: { value: 'up', visitorId } });
  check('Chatbot', 'Lịch sử, đánh giá câu trả lời, chặn người khác xem', history.data?.messages?.length >= 6 && other.status === 404 && rated.data?.feedback === 'up', `${history.status}/${other.status}/${rated.status}`);
});
await run('Chatbot', 'Admin: thống kê, hội thoại, kho kiến thức, cấu hình', async () => {
  const stats = await call('GET', '/admin/chat/stats', { token: adminToken });
  const sessions = await call('GET', '/admin/chat/sessions', { token: adminToken });
  const kb = await call('GET', '/admin/knowledge', { token: adminToken });
  const off = await call('PUT', '/admin/chat/config', { token: adminToken, body: { enabled: false } });
  const blocked = await call('POST', '/chat/messages', { body: { message: 'Xin chào', visitorId } });
  const on = await call('PUT', '/admin/chat/config', { token: adminToken, body: { enabled: true } });
  check('Chatbot', 'Admin: thống kê, hội thoại, kho kiến thức, cấu hình',
    stats.data?.answers >= 3 && sessions.data?.total >= 1 && kb.data?.length >= 6 && off.data?.enabled === false && blocked.status === 503 && on.data?.enabled === true,
    `stats=${stats.status} answers=${stats.data?.answers} kb=${kb.data?.length} blocked=${blocked.status} ai=${stats.data?.aiEnabled} quota=${JSON.stringify(stats.data?.aiQuotaExhausted)}`);
});
await run('Chatbot', 'Giới hạn 20 tin/phút', async () => {
  const statuses = [];
  for (let i = 0; i < 22; i += 1) {
    statuses.push((await call('POST', '/chat/messages', { body: { message: '', visitorId } })).status);
  }
  check('Chatbot', 'Giới hạn 20 tin/phút', statuses.includes(429), statuses.join(','));
});

const failed = results.filter((item) => !item.ok);
console.log(`\nTONG KET: ${results.length - failed.length}/${results.length} dat`);
if (failed.length) process.exitCode = 1;

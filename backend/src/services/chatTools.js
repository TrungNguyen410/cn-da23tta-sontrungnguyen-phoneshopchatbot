const accessoryRepository = require('../repositories/accessoryRepository');
const brandRepository = require('../repositories/brandRepository');
const categoryRepository = require('../repositories/categoryRepository');
const knowledgeArticleRepository = require('../repositories/knowledgeArticleRepository');
const productRepository = require('../repositories/productRepository');
const settingRepository = require('../repositories/settingRepository');
const voucherRepository = require('../repositories/voucherRepository');
const orderService = require('./orderService');
const voucherService = require('./voucherService');
const { buildRegex } = require('../utils/query');

const MAX_RESULTS = 5;
const ORDER_STATUS_LABELS = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao hàng',
  delivered: 'Đã giao hàng',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
};

// Gemini function declarations (OpenAPI schema subset).
const declarations = [
  {
    name: 'search_products',
    description: 'Tìm điện thoại đang bán tại cửa hàng theo từ khóa, hãng, khoảng giá. Dùng khi khách hỏi tư vấn chọn máy.',
    parameters: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: 'Từ khóa: tên máy, chip, nhu cầu như "chơi game", "camera", "pin trâu"' },
        brand: { type: 'string', description: 'Tên hãng, ví dụ Apple, Samsung, Xiaomi' },
        minPrice: { type: 'number', description: 'Giá thấp nhất (VND)' },
        maxPrice: { type: 'number', description: 'Giá cao nhất (VND)' },
        sortBy: { type: 'string', enum: ['price_asc', 'price_desc', 'best_selling', 'rating'] },
      },
    },
  },
  {
    name: 'get_product_details',
    description: 'Lấy thông số chi tiết, giá, tồn kho của một điện thoại theo tên hoặc mã sản phẩm.',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string' },
        name: { type: 'string' },
      },
    },
  },
  {
    name: 'compare_products',
    description: 'So sánh thông số 2-3 điện thoại theo tên. Dùng khi khách muốn so sánh máy.',
    parameters: {
      type: 'object',
      properties: {
        names: { type: 'array', items: { type: 'string' }, description: 'Tên các máy cần so sánh' },
      },
      required: ['names'],
    },
  },
  {
    name: 'search_accessories',
    description: 'Tìm phụ kiện (ốp lưng, sạc, tai nghe, cáp, sạc dự phòng) đang bán.',
    parameters: {
      type: 'object',
      properties: {
        keyword: { type: 'string' },
        maxPrice: { type: 'number' },
      },
    },
  },
  {
    name: 'lookup_order',
    description: 'Tra cứu trạng thái đơn hàng. Bắt buộc có mã đơn (bắt đầu bằng TP) và số điện thoại người nhận.',
    parameters: {
      type: 'object',
      properties: {
        orderNumber: { type: 'string' },
        phone: { type: 'string' },
      },
      required: ['orderNumber', 'phone'],
    },
  },
  {
    name: 'list_promotions',
    description: 'Liệt kê các mã giảm giá/khuyến mãi đang còn hiệu lực, hoặc kiểm tra một mã cụ thể với giá trị đơn hàng.',
    parameters: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        subtotal: { type: 'number' },
      },
    },
  },
  {
    name: 'search_store_policies',
    description: 'Tra cứu chính sách cửa hàng: bảo hành, đổi trả, giao hàng, thanh toán, trả góp, địa chỉ, hotline, giờ mở cửa.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' },
      },
      required: ['query'],
    },
  },
];

const toProductCard = (item, type = 'product') => ({
  id: item.id,
  type,
  name: item.name,
  price: item.price,
  oldPrice: item.oldPrice || 0,
  image: item.image || '',
  url: type === 'accessory' ? `/accessories/${item.id}` : `/products/${item.id}`,
  stock: item.stock || 0,
});

const productSummary = (product, brandNames = {}) => ({
  id: product.id,
  name: product.name,
  brand: brandNames[product.brandId] || '',
  price: product.price,
  oldPrice: product.oldPrice || 0,
  ram: product.ram,
  storage: product.storage,
  chip: product.chip,
  screen: product.screen,
  battery: product.battery,
  camera: product.camera,
  rating: product.rating,
  inStock: product.stock > 0,
  stock: product.stock,
  url: `/products/${product.id}`,
});

const brandNameMap = async () => {
  const brands = await brandRepository.findAll({});
  return Object.fromEntries(brands.map((brand) => [brand.id, brand.name]));
};

const findBrandIds = async (brand) => {
  if (!brand) return null;
  const brands = await brandRepository.findAll({ name: buildRegex(brand) });
  return brands.map((item) => item.id);
};

const SORTS = {
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  best_selling: { sold: -1 },
  rating: { rating: -1 },
};

const keywordFilter = (keyword, fields) => {
  const words = String(keyword || '').trim().split(/\s+/).filter((word) => word.length > 1);
  if (!words.length) return {};
  return {
    $and: words.map((word) => ({ $or: fields.map((field) => ({ [field]: buildRegex(word) })) })),
  };
};

const plain = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd')
  .trim();

const matchingCategoryIds = async (keyword) => {
  const target = plain(keyword);
  if (!target) return [];
  const categories = await categoryRepository.findAll({});
  return categories
    .filter((category) => {
      const name = plain(category.name);
      return name && (name.includes(target) || target.includes(name));
    })
    .map((category) => category.id);
};

const priceFilter = ({ minPrice, maxPrice }) => {
  const range = {};
  if (Number(minPrice) > 0) range.$gte = Number(minPrice);
  if (Number(maxPrice) > 0) range.$lte = Number(maxPrice);
  return Object.keys(range).length ? { price: range } : {};
};

// Matches every word of the requested name; if nothing matches, retries without
// brand words the model often prepends ("Samsung Galaxy S25 Ultra" → "Galaxy S25 Ultra").
const findProductsByName = async (name, limit = 1) => {
  const search = (query) => productRepository.findAll(
    { status: 'active', ...keywordFilter(query, ['name']) },
    { sort: { sold: -1 }, limit },
  );
  const exact = await search(name);
  if (exact.length) return exact;

  const brandWords = new Set((await brandRepository.findAll({})).map((brand) => plain(brand.name)));
  const withoutBrand = String(name || '').split(/\s+/).filter((word) => !brandWords.has(plain(word))).join(' ');
  return withoutBrand && withoutBrand !== String(name).trim() ? search(withoutBrand) : [];
};

const handlers = {
  async search_products(args = {}) {
    const brandIds = await findBrandIds(args.brand);
    if (brandIds && !brandIds.length) return { products: [], note: `Cửa hàng chưa kinh doanh hãng ${args.brand}` };

    const base = {
      status: 'active',
      ...priceFilter(args),
      ...(brandIds ? { brandId: { $in: brandIds } } : {}),
    };
    const sort = SORTS[args.sortBy] || { sold: -1 };
    let products = await productRepository.findAll(
      { ...base, ...keywordFilter(args.keyword, ['name', 'chip', 'description', 'camera', 'battery', 'ram', 'storage']) },
      { sort, limit: MAX_RESULTS },
    );
    let note = '';
    let outOfBudget = false;
    if (!products.length && args.keyword) {
      products = await productRepository.findAll(base, { sort, limit: MAX_RESULTS });
      if (products.length) note = 'Không có máy khớp từ khóa, đây là các máy phù hợp tiêu chí giá/hãng.';
    }
    // Nothing in the budget: offer the closest-priced phones instead of an empty answer.
    if (!products.length && (Number(args.maxPrice) > 0 || Number(args.minPrice) > 0)) {
      const { price, ...withoutPrice } = base;
      const closest = Number(args.maxPrice) > 0 ? { price: 1 } : { price: -1 };
      products = await productRepository.findAll(withoutPrice, { sort: closest, limit: 3 });
      if (products.length) {
        outOfBudget = true;
        note = 'Không có máy trong tầm giá khách yêu cầu. Đây là các máy có giá gần nhất — hãy nói rõ với khách là vượt ngân sách.';
      }
    }
    const names = await brandNameMap();
    return {
      products: products.map((product) => productSummary(product, names)),
      ...(note ? { note } : {}),
      ...(outOfBudget ? { outOfBudget } : {}),
      cards: products.map((product) => toProductCard(product)),
    };
  },

  async get_product_details(args = {}) {
    const product = args.productId
      ? await productRepository.findById(args.productId)
      : (await findProductsByName(args.name))[0];
    if (!product || product.status !== 'active') return { found: false };
    const names = await brandNameMap();
    return {
      found: true,
      product: {
        ...productSummary(product, names),
        description: String(product.description || '').slice(0, 600),
        specifications: product.specifications || {},
      },
      cards: [toProductCard(product)],
    };
  },

  async compare_products(args = {}) {
    const names = Array.isArray(args.names) ? args.names.slice(0, 3) : [];
    const brandNames = await brandNameMap();
    const found = [];
    const missing = [];
    for (const name of names) {
      const [product] = await findProductsByName(name);
      if (product && !found.some((item) => item.id === product.id)) found.push(product);
      else if (!product) missing.push(name);
    }
    return {
      products: found.map((product) => productSummary(product, brandNames)),
      missing,
      cards: found.map((product) => toProductCard(product)),
    };
  },

  async search_accessories(args = {}) {
    const textFilter = keywordFilter(args.keyword, ['name', 'description']);
    const categoryIds = await matchingCategoryIds(args.keyword);
    const alternatives = [
      ...(Object.keys(textFilter).length ? [textFilter] : []),
      ...(categoryIds.length ? [{ categoryId: { $in: categoryIds } }] : []),
    ];
    const accessories = await accessoryRepository.findAll(
      {
        status: 'active',
        ...priceFilter({ maxPrice: args.maxPrice }),
        ...(alternatives.length ? { $or: alternatives } : {}),
      },
      { sort: { sold: -1 }, limit: MAX_RESULTS },
    );
    return {
      accessories: accessories.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        inStock: item.stock > 0,
        url: `/accessories/${item.id}`,
      })),
      cards: accessories.map((item) => toProductCard(item, 'accessory')),
    };
  },

  async lookup_order(args = {}) {
    try {
      const order = await orderService.lookup(String(args.orderNumber || '').trim(), args.phone);
      return {
        found: true,
        order: {
          orderNumber: order.orderNumber,
          status: ORDER_STATUS_LABELS[order.status] || order.status,
          createdAt: order.createdAt,
          total: order.total,
          items: order.items.map((item) => `${item.name} x${item.quantity}`),
          shippingProvider: order.shippingProvider,
          trackingNumber: order.trackingNumber || '',
          estimatedDelivery: order.estimatedDelivery,
        },
      };
    } catch (error) {
      return { found: false, message: error.message };
    }
  },

  async list_promotions(args = {}) {
    if (args.code) {
      try {
        const voucher = await voucherService.validate(args.code, Number(args.subtotal) || Number.MAX_SAFE_INTEGER);
        return { valid: true, voucher: publicVoucher(voucher) };
      } catch (error) {
        return { valid: false, message: error.message };
      }
    }
    const now = new Date();
    const vouchers = await voucherRepository.findAll(
      { active: true, startDate: { $lte: now }, endDate: { $gte: new Date(now.getTime() - 86400000) } },
      { sort: { createdAt: -1 }, limit: 10 },
    );
    return {
      vouchers: vouchers
        .filter((voucher) => !voucher.quantity || voucher.used < voucher.quantity)
        .map(publicVoucher),
    };
  },

  async search_store_policies(args = {}) {
    const [articles, settings] = await Promise.all([
      knowledgeArticleRepository.search(args.query, { limit: 3 }),
      settingRepository.findAll({ group: 'general' }),
    ]);
    return {
      articles: articles.map((article) => ({ title: article.title, content: article.content })),
      store: Object.fromEntries(settings.map((setting) => [setting.key, setting.value])),
    };
  },
};

function publicVoucher(voucher) {
  return {
    code: voucher.code,
    type: voucher.type,
    value: voucher.value,
    minOrder: voucher.minOrder,
    maxDiscount: voucher.maxDiscount,
    endDate: voucher.endDate,
  };
}

const execute = async (name, args = {}) => {
  const handler = handlers[name];
  if (!handler) return { ok: false, result: { error: `Công cụ ${name} không tồn tại` }, cards: [] };
  try {
    const { cards = [], ...result } = await handler(args || {});
    return { ok: true, result, cards };
  } catch (error) {
    return { ok: false, result: { error: error.message }, cards: [] };
  }
};

module.exports = { declarations, execute, handlers, ORDER_STATUS_LABELS };

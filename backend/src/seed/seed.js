const bcrypt = require('bcrypt');
const { connectDB, disconnectDB } = require('../config/database');
const Accessory = require('../models/Accessory');
const Banner = require('../models/Banner');
const Brand = require('../models/Brand');
const Category = require('../models/Category');
const Contact = require('../models/Contact');
const Order = require('../models/Order');
const OrderCounter = require('../models/OrderCounter');
const OrderItem = require('../models/OrderItem');
const Product = require('../models/Product');
const RefreshToken = require('../models/RefreshToken');
const Review = require('../models/Review');
const Setting = require('../models/Setting');
const User = require('../models/User');
const Voucher = require('../models/Voucher');
const VerificationCode = require('../models/VerificationCode');
const { resolveSeedPassword } = require('../utils/seedCredentials');

const imageFor = (label, color = '2563eb') =>
  `https://placehold.co/800x800/${color}/ffffff?text=${encodeURIComponent(label)}`;

const brandNames = ['Apple', 'Samsung', 'Xiaomi', 'OPPO', 'Vivo', 'Honor', 'Realme', 'Google', 'Anker', 'Baseus', 'TechPhone'];
const brandIdByName = Object.fromEntries(brandNames.map((name, index) => [name, `brand-${index + 1}`]));
const categoryIdByName = {
  'Dien thoai': 'category-1',
  'Tai nghe': 'category-2',
  Sac: 'category-3',
  'Dong ho': 'category-4',
  'Phu kien': 'category-5',
  'Pin du phong': 'category-6',
};

const products = [
  ['phone-1', 'iPhone 16 Pro Max', 'Apple', 33990000, 36990000, '8GB', '256GB', '2563eb'],
  ['phone-2', 'Galaxy S25 Ultra', 'Samsung', 30990000, 33990000, '12GB', '256GB', '1d4ed8'],
  ['phone-3', 'Xiaomi 15 Ultra', 'Xiaomi', 29990000, 32990000, '16GB', '512GB', '111827'],
  ['phone-4', 'OPPO Find X8 Pro', 'OPPO', 27990000, 30990000, '16GB', '512GB', '0f766e'],
  ['phone-5', 'vivo X200 Pro', 'Vivo', 25990000, 29990000, '16GB', '512GB', '2563eb'],
  ['phone-6', 'HONOR Magic7 Pro', 'Honor', 24990000, 27990000, '12GB', '512GB', '1e40af'],
  ['phone-7', 'realme GT 7 Pro', 'Realme', 18990000, 21990000, '16GB', '512GB', 'f59e0b'],
  ['phone-8', 'Google Pixel 9 Pro', 'Google', 23990000, 26990000, '16GB', '256GB', '3b82f6'],
].map(([id, name, brand, price, oldPrice, ram, storage, color], index) => {
  const image = imageFor(name, color);
  return {
    _id: id,
    name,
    brandId: brandIdByName[brand],
    categoryId: categoryIdByName['Dien thoai'],
    price,
    oldPrice,
    discountPercent: Math.round(((oldPrice - price) / oldPrice) * 100),
    image,
    images: [image, imageFor(`${brand} back`, '0f172a')],
    ram,
    storage,
    screen: `${(6.3 + index * 0.1).toFixed(1)} inch OLED, 120Hz`,
    battery: `${4500 + index * 120} mAh`,
    camera: `${48 + index * 4}MP camera system`,
    chip: 'Flagship 8-core chipset',
    description: `${name} is a premium smartphone with strong performance, bright display, and official TechPhone warranty.`,
    specifications: {
      Display: `${(6.3 + index * 0.1).toFixed(1)} inch OLED`,
      RAM: ram,
      Storage: storage,
      Battery: `${4500 + index * 120} mAh`,
      Connectivity: '5G, Wi-Fi 6, Bluetooth 5.3',
    },
    stock: 10 + index * 4,
    sold: 70 + index * 33,
    rating: Number((4.4 + (index % 4) / 10).toFixed(1)),
    status: 'active',
  };
});

const accessories = [
  ['accessory-1', 'AirPods Pro 2 USB-C', 'Apple', 'Tai nghe', 5290000, 5990000, '2563eb'],
  ['accessory-2', 'Galaxy Buds3 Pro', 'Samsung', 'Tai nghe', 3990000, 4690000, '7c3aed'],
  ['accessory-3', 'Anker GaN Charger 65W', 'Anker', 'Sac', 1090000, 1390000, '0f766e'],
  ['accessory-4', 'Baseus Power Bank 20000mAh', 'Baseus', 'Pin du phong', 890000, 1190000, 'f97316'],
].map(([id, name, brand, category, price, oldPrice, color], index) => {
  const image = imageFor(name, color);
  return {
    _id: id,
    name,
    brandId: brandIdByName[brand],
    categoryId: categoryIdByName[category],
    price,
    oldPrice,
    discountPercent: Math.round(((oldPrice - price) / oldPrice) * 100),
    image,
    images: [image],
    description: `${name} is an official accessory with TechPhone warranty.`,
    specifications: { Brand: brand, Type: category, Warranty: '12 months' },
    stock: 20 + index * 8,
    sold: 50 + index * 20,
    rating: 4.6,
    status: 'active',
  };
});

const run = async () => {
  const password = await bcrypt.hash(resolveSeedPassword(), 12);
  await connectDB();

  await Promise.all([
    Accessory.deleteMany({}),
    Banner.deleteMany({}),
    Brand.deleteMany({}),
    Category.deleteMany({}),
    Contact.deleteMany({}),
    Order.deleteMany({}),
    OrderCounter.deleteMany({}),
    OrderItem.deleteMany({}),
    Product.deleteMany({}),
    RefreshToken.deleteMany({}),
    Review.deleteMany({}),
    Setting.deleteMany({}),
    User.deleteMany({}),
    Voucher.deleteMany({}),
    VerificationCode.deleteMany({}),
  ]);

  await User.insertMany([
    {
      _id: 'user-admin',
      fullName: 'Quan tri TechPhone',
      email: 'admin@gmail.com',
      phone: '0900000000',
      password,
      role: 'admin',
      status: 'active',
      phoneVerified: true,
      phoneVerifiedAt: new Date(),
      address: '123 Nguyen Hue, District 1, Ho Chi Minh City',
      avatar: imageFor('Admin', '1d4ed8'),
    },
    {
      _id: 'user-customer',
      fullName: 'Nguyen Minh Anh',
      email: 'user@gmail.com',
      phone: '0911111111',
      password,
      role: 'customer',
      status: 'active',
      phoneVerified: true,
      phoneVerifiedAt: new Date(),
      address: '45 Le Loi, District 1, Ho Chi Minh City',
      avatar: imageFor('Minh Anh', '0f766e'),
    },
    {
      _id: 'user-customer-2',
      fullName: 'Tran Hoang Nam',
      email: 'nam@gmail.com',
      phone: '0922222222',
      password,
      role: 'customer',
      status: 'active',
      phoneVerified: true,
      phoneVerifiedAt: new Date(),
      address: '21 Hai Ba Trung, District 3, Ho Chi Minh City',
      avatar: imageFor('Hoang Nam', '7c3aed'),
    },
    {
      _id: 'user-locked',
      fullName: 'Le Thu Trang',
      email: 'locked@gmail.com',
      phone: '0933333333',
      password,
      role: 'customer',
      status: 'locked',
      phoneVerified: true,
      phoneVerifiedAt: new Date(),
      address: '9 Nguyen Trai, District 5, Ho Chi Minh City',
      avatar: imageFor('Locked', 'ef4444'),
    },
    {
      _id: 'user-inactive',
      fullName: 'Pham Gia Bao',
      email: 'inactive@gmail.com',
      phone: '0944444444',
      password,
      role: 'customer',
      status: 'inactive',
      phoneVerified: true,
      phoneVerifiedAt: new Date(),
      address: '72 Cach Mang Thang 8, District 10, Ho Chi Minh City',
      avatar: imageFor('Inactive', '64748b'),
    },
  ]);

  await Category.insertMany([
    { _id: 'category-1', name: 'Dien thoai', slug: 'dien-thoai', description: 'Smartphones and flagship devices', active: true },
    { _id: 'category-2', name: 'Tai nghe', slug: 'tai-nghe', description: 'Wireless earbuds and audio gear', active: true },
    { _id: 'category-3', name: 'Sac', slug: 'sac', description: 'Chargers and cables', active: true },
    { _id: 'category-4', name: 'Dong ho', slug: 'dong-ho', description: 'Smart watches and wearables', active: true },
    { _id: 'category-5', name: 'Phu kien', slug: 'phu-kien', description: 'General accessories', active: false },
    { _id: 'category-6', name: 'Pin du phong', slug: 'pin-du-phong', description: 'Portable power banks', active: true },
  ]);
  await Brand.insertMany(brandNames.map((name, index) => ({
    _id: `brand-${index + 1}`,
    name,
    slug: name.toLowerCase(),
    logo: imageFor(name, index % 2 ? '2563eb' : '0f766e'),
    description: `${name} products available at TechPhone.`,
    active: name !== 'TechPhone',
  })));

  await Product.insertMany([
    ...products,
    {
      _id: 'phone-9',
      name: 'iPhone 15',
      brandId: brandIdByName.Apple,
      categoryId: categoryIdByName['Dien thoai'],
      price: 16990000,
      oldPrice: 19990000,
      discountPercent: 15,
      image: imageFor('iPhone 15', '0284c7'),
      images: [imageFor('iPhone 15', '0284c7')],
      ram: '6GB',
      storage: '128GB',
      screen: '6.1 inch OLED',
      battery: '3349 mAh',
      camera: '48MP dual camera',
      chip: 'A16 Bionic',
      description: 'A compact iPhone option for catalog filtering and low-stock checks.',
      specifications: { Display: '6.1 inch OLED', RAM: '6GB', Storage: '128GB', Warranty: '12 months' },
      stock: 2,
      sold: 210,
      rating: 4.5,
      status: 'active',
    },
    {
      _id: 'phone-inactive',
      name: 'Demo Hidden Phone',
      brandId: brandIdByName.TechPhone,
      categoryId: categoryIdByName['Dien thoai'],
      price: 9990000,
      oldPrice: 0,
      discountPercent: 0,
      image: imageFor('Hidden Phone', '475569'),
      images: [imageFor('Hidden Phone', '475569')],
      ram: '8GB',
      storage: '128GB',
      description: 'Inactive product for admin status tests.',
      stock: 0,
      sold: 0,
      rating: 0,
      status: 'inactive',
    },
  ]);
  await Accessory.insertMany([
    ...accessories,
    {
      _id: 'accessory-5',
      name: 'Apple Watch Series 10',
      brandId: brandIdByName.Apple,
      categoryId: categoryIdByName['Dong ho'],
      price: 10990000,
      oldPrice: 12990000,
      discountPercent: 15,
      image: imageFor('Apple Watch Series 10', 'db2777'),
      images: [imageFor('Apple Watch Series 10', 'db2777')],
      description: 'Smartwatch accessory for category and cart testing.',
      specifications: { Brand: 'Apple', Type: 'Dong ho', Warranty: '12 months' },
      stock: 12,
      sold: 44,
      rating: 4.7,
      status: 'active',
    },
    {
      _id: 'accessory-inactive',
      name: 'Demo Hidden Accessory',
      brandId: brandIdByName.TechPhone,
      categoryId: categoryIdByName['Phu kien'],
      price: 199000,
      oldPrice: 0,
      discountPercent: 0,
      image: imageFor('Hidden Accessory', '475569'),
      images: [imageFor('Hidden Accessory', '475569')],
      description: 'Inactive accessory for admin status tests.',
      stock: 0,
      sold: 0,
      rating: 0,
      status: 'inactive',
    },
  ]);
  await Voucher.insertMany([
    { _id: 'voucher-1', code: 'TECH10', type: 'percent', value: 10, minOrder: 5000000, maxDiscount: 1000000, quantity: 100, used: 12, startDate: '2026-01-01', endDate: '2026-12-31', active: true },
    { _id: 'voucher-2', code: 'GIAM200K', type: 'fixed', value: 200000, minOrder: 3000000, maxDiscount: 200000, quantity: 200, used: 28, startDate: '2026-01-01', endDate: '2026-12-31', active: true },
    { _id: 'voucher-3', code: 'FREESHIP', type: 'shipping', value: 30000, minOrder: 500000, maxDiscount: 30000, quantity: 500, used: 75, startDate: '2026-01-01', endDate: '2026-12-31', active: true },
    { _id: 'voucher-4', code: 'EXPIRED50', type: 'percent', value: 50, minOrder: 1000000, maxDiscount: 500000, quantity: 20, used: 4, startDate: '2025-01-01', endDate: '2025-12-31', active: true },
    { _id: 'voucher-5', code: 'USEDUP', type: 'fixed', value: 500000, minOrder: 5000000, maxDiscount: 500000, quantity: 10, used: 10, startDate: '2026-01-01', endDate: '2026-12-31', active: true },
    { _id: 'voucher-6', code: 'OFFLINE', type: 'percent', value: 5, minOrder: 1000000, maxDiscount: 200000, quantity: 50, used: 0, startDate: '2026-01-01', endDate: '2026-12-31', active: false },
  ]);
  await Banner.insertMany([
    { _id: 'banner-1', title: 'Flagship upgrade', description: 'Trade in and save up to 4 million VND', image: imageFor('Flagship upgrade', '1d4ed8'), link: '/products', position: 1, active: true },
    { _id: 'banner-2', title: 'Mid-year sale', description: 'Save up to 30% on phones and accessories', image: imageFor('Mid-year sale', '7c3aed'), link: '/products', position: 2, active: true },
    { _id: 'banner-3', title: 'Accessory bundle', description: 'Bundle earbuds and charger for extra savings', image: imageFor('Accessory bundle', '0f766e'), link: '/accessories', position: 3, active: true },
    { _id: 'banner-hidden', title: 'Hidden campaign', description: 'Inactive banner for admin tests', image: imageFor('Hidden campaign', '475569'), link: '/', position: 99, active: false },
  ]);

  const customers = {
    minhAnh: {
      fullName: 'Nguyen Minh Anh',
      email: 'user@gmail.com',
      phone: '0911111111',
      address: '45 Le Loi, District 1, Ho Chi Minh City',
    },
    hoangNam: {
      fullName: 'Tran Hoang Nam',
      email: 'nam@gmail.com',
      phone: '0922222222',
      address: '21 Hai Ba Trung, District 3, Ho Chi Minh City',
    },
  };
  const orderSeeds = [
    {
      _id: 'order-pending',
      orderNumber: 'TP26062001',
      userId: 'user-customer',
      status: 'pending',
      paymentMethod: 'cod',
      customer: customers.minhAnh,
      voucherCode: 'TECH10',
      discount: 1000000,
      shippingFee: 30000,
      note: 'Please call before delivery.',
      items: [
        { id: 'phone-2', productId: 'phone-2', name: products[1].name, image: products[1].image, price: products[1].price, quantity: 1, type: 'product' },
        { id: 'accessory-3', accessoryId: 'accessory-3', name: accessories[2].name, image: accessories[2].image, price: accessories[2].price, quantity: 2, type: 'accessory' },
      ],
    },
    {
      _id: 'order-confirmed',
      orderNumber: 'TP26062002',
      userId: 'user-customer-2',
      status: 'confirmed',
      paymentMethod: 'bank',
      customer: customers.hoangNam,
      voucherCode: 'GIAM200K',
      discount: 200000,
      shippingFee: 0,
      note: 'Bank transfer received.',
      items: [
        { id: 'phone-3', productId: 'phone-3', name: products[2].name, image: products[2].image, price: products[2].price, quantity: 1, type: 'product' },
      ],
    },
    {
      _id: 'order-shipping',
      orderNumber: 'TP26062003',
      userId: 'user-customer',
      status: 'shipping',
      paymentMethod: 'momo',
      customer: customers.minhAnh,
      voucherCode: 'FREESHIP',
      discount: 30000,
      shippingFee: 30000,
      note: 'Out for delivery.',
      items: [
        { id: 'accessory-1', accessoryId: 'accessory-1', name: accessories[0].name, image: accessories[0].image, price: accessories[0].price, quantity: 1, type: 'accessory' },
      ],
    },
    {
      _id: 'order-delivered',
      orderNumber: 'TP26062004',
      userId: 'user-customer-2',
      status: 'delivered',
      paymentMethod: 'card',
      customer: customers.hoangNam,
      voucherCode: null,
      discount: 0,
      shippingFee: 0,
      note: 'Delivered, waiting completion confirmation.',
      items: [
        { id: 'phone-4', productId: 'phone-4', name: products[3].name, image: products[3].image, price: products[3].price, quantity: 1, type: 'product' },
      ],
    },
    {
      _id: 'order-completed',
      orderNumber: 'TP260601',
      userId: 'user-customer',
      status: 'completed',
      paymentMethod: 'cod',
      customer: customers.minhAnh,
      voucherCode: null,
      discount: 0,
      shippingFee: 0,
      note: 'Completed sample order.',
      items: [
        { id: 'phone-1', productId: 'phone-1', name: products[0].name, image: products[0].image, price: products[0].price, quantity: 1, type: 'product' },
      ],
    },
    {
      _id: 'order-cancelled',
      orderNumber: 'TP26062006',
      userId: 'user-customer-2',
      status: 'cancelled',
      paymentMethod: 'cod',
      customer: customers.hoangNam,
      voucherCode: null,
      discount: 0,
      shippingFee: 30000,
      note: 'Customer cancelled before confirmation.',
      items: [
        { id: 'phone-5', productId: 'phone-5', name: products[4].name, image: products[4].image, price: products[4].price, quantity: 1, type: 'product' },
      ],
    },
  ].map((order) => {
    const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return {
      ...order,
      subtotal,
      total: Math.max(subtotal + order.shippingFee - order.discount, 0),
    };
  });
  await Order.insertMany(orderSeeds);
  await OrderItem.insertMany(orderSeeds.flatMap((order) =>
    order.items.map((item, index) => ({
      _id: `${order._id}-item-${index + 1}`,
      orderId: order._id,
      productId: item.productId || null,
      accessoryId: item.accessoryId || null,
      name: item.name,
      image: item.image,
      price: item.price,
      quantity: item.quantity,
      type: item.type,
      total: item.price * item.quantity,
    })),
  ));

  await Review.insertMany([
    { _id: 'review-1', userId: 'user-customer', userName: 'Nguyen Minh Anh', productId: 'phone-1', rating: 5, comment: 'Great product quality and fast delivery.', status: 'approved' },
    { _id: 'review-2', userId: 'user-customer', userName: 'Nguyen Minh Anh', productId: 'general', rating: 5, comment: 'Helpful staff and transparent warranty policy.', status: 'approved' },
    { _id: 'review-3', userId: 'user-customer-2', userName: 'Tran Hoang Nam', productId: 'phone-3', rating: 4, comment: 'Good camera, waiting for admin approval.', status: 'pending' },
    { _id: 'review-4', userId: 'user-customer-2', userName: 'Tran Hoang Nam', productId: 'phone-5', rating: 2, comment: 'Rejected review sample for moderation tests.', status: 'rejected' },
    { _id: 'review-5', userId: 'user-customer', userName: 'Nguyen Minh Anh', productId: 'general', accessoryId: 'accessory-1', rating: 5, comment: 'Noise cancellation works very well.', status: 'approved' },
  ]);
  await Contact.insertMany([
    { _id: 'contact-1', fullName: 'Nguyen Minh Anh', email: 'user@gmail.com', phone: '0911111111', subject: 'Bao hanh san pham', message: 'Toi muon hoi ve chinh sach bao hanh iPhone.', status: 'new' },
    { _id: 'contact-2', fullName: 'Tran Hoang Nam', email: 'nam@gmail.com', phone: '0922222222', subject: 'Kiem tra don hang', message: 'Vui long cap nhat trang thai giao hang.', status: 'read', adminNote: 'Called customer, shipment is on the way.' },
    { _id: 'contact-3', fullName: 'Le Thu Trang', email: 'trang@example.com', phone: '0933333333', subject: 'Tu van phu kien', message: 'Can tu van sac nhanh phu hop.', status: 'resolved', adminNote: 'Suggested Anker 65W charger.' },
  ]);
  await Setting.insertMany([
    { _id: 'setting-1', key: 'storeName', value: 'TechPhone', group: 'general', label: 'Store name' },
    { _id: 'setting-2', key: 'hotline', value: '1900 6868', group: 'general', label: 'Hotline' },
    { _id: 'setting-3', key: 'email', value: 'support@techphone.vn', group: 'general', label: 'Support email' },
    { _id: 'setting-4', key: 'address', value: '123 Nguyen Hue, District 1, Ho Chi Minh City', group: 'general', label: 'Store address' },
    { _id: 'setting-5', key: 'freeShippingThreshold', value: 10000000, group: 'checkout', label: 'Free shipping threshold' },
    { _id: 'setting-6', key: 'maintenanceMode', value: false, group: 'system', label: 'Maintenance mode' },
  ]);

  console.log('TechPhone seed data inserted successfully.');
  await disconnectDB();
};

run().catch(async (error) => {
  console.error(error);
  await disconnectDB();
  process.exit(1);
});

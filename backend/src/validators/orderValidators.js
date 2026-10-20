const { body, query } = require('express-validator');
const { normalizeVietnamesePhone } = require('../utils/phone');

const statuses = ['pending', 'confirmed', 'shipping', 'delivered', 'completed', 'cancelled'];
const MAX_ORDER_ITEMS = 50;
const MAX_ITEM_ID_LENGTH = 100;
const checkoutFields = ['items', 'customer', 'note', 'paymentMethod', 'voucherCode'];
const customerFields = ['fullName', 'email', 'phone', 'address', 'province', 'district', 'ward'];
const itemFields = ['id', 'productId', 'accessoryId', 'type', 'quantity'];

const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const hasOnlyFields = (value, fields) => (
  isRecord(value) && Object.keys(value).every((field) => fields.includes(field))
);

const checkoutDto = body().custom((payload) => {
  if (!hasOnlyFields(payload, checkoutFields)) {
    throw new Error('Dữ liệu đơn hàng chứa trường không được phép');
  }
  if (!hasOnlyFields(payload.customer, customerFields)) {
    throw new Error('Thông tin khách hàng chứa trường không được phép');
  }
  if (!Array.isArray(payload.items) || payload.items.some((item) => !hasOnlyFields(item, itemFields))) {
    throw new Error('Sản phẩm trong đơn hàng chứa trường không được phép');
  }
  return true;
});

const commonCreate = [
  checkoutDto,
  body('items').isArray({ min: 1, max: MAX_ORDER_ITEMS })
    .withMessage(`Đơn hàng phải có từ 1 đến ${MAX_ORDER_ITEMS} dòng sản phẩm`),
  body('items.*').custom((item) => {
    if (!isRecord(item) || (!item.id && !item.productId && !item.accessoryId)) {
      throw new Error('Mỗi sản phẩm trong đơn hàng phải có mã định danh');
    }
    return true;
  }),
  body('items.*.id').optional({ checkFalsy: true }).isString().trim()
    .isLength({ min: 1, max: MAX_ITEM_ID_LENGTH }),
  body('items.*.productId').optional({ checkFalsy: true }).isString().trim()
    .isLength({ min: 1, max: MAX_ITEM_ID_LENGTH }),
  body('items.*.accessoryId').optional({ checkFalsy: true }).isString().trim()
    .isLength({ min: 1, max: MAX_ITEM_ID_LENGTH }),
  body('items.*.type').optional().isIn(['product', 'accessory']).withMessage('Loại mặt hàng không hợp lệ'),
  body('items.*.quantity').isInt({ min: 1, max: 20 }).withMessage('Số lượng mặt hàng không hợp lệ'),
  body('customer.fullName').trim().notEmpty().isLength({ max: 120 }),
  body('customer.email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
  body('customer.phone').trim().custom((value) => Boolean(normalizeVietnamesePhone(value))),
  body('customer.address').trim().notEmpty().isLength({ max: 255 }),
  body('customer.province').trim().notEmpty().isLength({ max: 100 }),
  body('customer.district').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('customer.ward').trim().notEmpty().isLength({ max: 100 }),
  body('voucherCode').optional({ checkFalsy: true }).trim().isLength({ max: 50 }),
  body('note').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }),
];

const createDirect = [
  ...commonCreate,
  body('paymentMethod').optional().isIn(['cod', 'bank', 'momo'])
    .withMessage('Đơn thẻ phải được tạo qua cổng VNPay'),
];

const createVnpay = [
  ...commonCreate,
  body('paymentMethod').optional().isIn(['card'])
    .withMessage('Phương thức thanh toán VNPay không hợp lệ'),
];

const update = [
  body().custom((payload) => {
    const safeFields = [
      'customer',
      'note',
      'shippingProvider',
      'trackingNumber',
      'estimatedDelivery',
    ];
    const fields = Object.keys(payload || {});
    if (!fields.length || fields.some((field) => !safeFields.includes(field))) {
      throw new Error('Chỉ được cập nhật thông tin khách hàng và giao hàng tại đây');
    }
    return true;
  }),
  body('customer').optional().isObject().withMessage('Thông tin khách hàng phải là một đối tượng'),
  body('note').optional().trim(),
  body('shippingProvider').optional().trim().isLength({ max: 100 }),
  body('trackingNumber').optional().trim().isLength({ max: 100 }),
  body('estimatedDelivery').optional({ nullable: true }).isISO8601().toDate(),
];

const updateStatus = [body('status').isIn(statuses).withMessage('Trạng thái đơn hàng không hợp lệ')];

const reconcilePayment = [
  body().custom((payload) => {
    const safeFields = ['status', 'reference', 'note'];
    if (!hasOnlyFields(payload, safeFields)) {
      throw new Error('Dữ liệu đối soát chứa trường không được phép');
    }
    return true;
  }),
  body('status').isIn(['paid', 'failed']).withMessage('Trạng thái thanh toán không hợp lệ'),
  body('reference').optional().trim().isLength({ max: 150 }),
  body('reference').custom((value, { req }) => {
    if (req.body.status === 'paid' && !String(value || '').trim()) {
      throw new Error('Mã tham chiếu là bắt buộc khi xác nhận đã thanh toán');
    }
    return true;
  }),
  body('note').optional().trim().isLength({ max: 1000 }),
];

const lookup = [
  query('orderNumber').trim().notEmpty().withMessage('Mã đơn hàng là bắt buộc'),
  query('phone').trim().notEmpty().withMessage('Số điện thoại là bắt buộc'),
];

module.exports = { createDirect, createVnpay, update, updateStatus, reconcilePayment, lookup };

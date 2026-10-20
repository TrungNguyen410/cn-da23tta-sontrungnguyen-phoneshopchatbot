const express = require('express');
const { query } = require('express-validator');
const adminController = require('../controllers/adminController');
const createCrudController = require('../controllers/crudController');
const orderController = require('../controllers/orderController');
const paymentController = require('../controllers/paymentController');
const reviewController = require('../controllers/reviewController');
const voucherController = require('../controllers/voucherController');
const { accessoryService, bannerService, brandService, categoryService, productService, settingService } = require('../services');
const bannerValidators = require('../validators/bannerValidators');
const catalogValidators = require('../validators/catalogValidators');
const customerValidators = require('../validators/customerValidators');
const orderValidators = require('../validators/orderValidators');
const reviewValidators = require('../validators/reviewValidators');
const settingValidators = require('../validators/settingValidators');
const taxonomyValidators = require('../validators/taxonomyValidators');
const voucherValidators = require('../validators/voucherValidators');
const { idParam } = require('../validators/commonValidators');
const validate = require('../middlewares/validate');
const { authorize, protect } = require('../middlewares/authMiddleware');

const router = express.Router();
const productController = createCrudController(productService, 'Product');
const accessoryController = createCrudController(accessoryService, 'Accessory');
const categoryController = createCrudController(categoryService, 'Category');
const brandController = createCrudController(brandService, 'Brand');
const bannerController = createCrudController(bannerService, 'Banner');
const settingController = createCrudController(settingService, 'Setting');

router.use(protect, authorize('admin'));

const adminPagination = [
  query('page').optional().isInt({ min: 1, max: 1000000 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];
const adminSearch = [query('search').optional().trim().isLength({ max: 100 })];
const dashboardYear = [query('year').optional().isInt({ min: 1970, max: 9999 })];

router.get('/dashboard', dashboardYear, validate, adminController.dashboard);

router.get('/customers', [...adminPagination, ...adminSearch], validate, adminController.customers);
router.put('/customers/:id', idParam, customerValidators.update, validate, adminController.updateCustomer);

router.get('/products', catalogValidators.list, validate, productController.list);
router.post('/products', catalogValidators.create, validate, productController.create);
router.put('/products/:id', idParam, catalogValidators.update, validate, productController.update);
router.delete('/products/:id', idParam, validate, productController.remove);

router.get('/accessories', catalogValidators.list, validate, accessoryController.list);
router.post('/accessories', catalogValidators.create, validate, accessoryController.create);
router.put('/accessories/:id', idParam, catalogValidators.update, validate, accessoryController.update);
router.delete('/accessories/:id', idParam, validate, accessoryController.remove);

router.get('/categories', categoryController.list);
router.post('/categories', taxonomyValidators.create, validate, categoryController.create);
router.put('/categories/:id', idParam, taxonomyValidators.update, validate, categoryController.update);
router.delete('/categories/:id', idParam, validate, categoryController.remove);

router.get('/brands', brandController.list);
router.post('/brands', taxonomyValidators.create, validate, brandController.create);
router.put('/brands/:id', idParam, taxonomyValidators.update, validate, brandController.update);
router.delete('/brands/:id', idParam, validate, brandController.remove);

router.get(
  '/orders',
  [
    ...adminPagination,
    ...adminSearch,
    query('status').optional().isIn(['pending', 'confirmed', 'shipping', 'delivered', 'completed', 'cancelled']),
  ],
  validate,
  orderController.list,
);
router.put('/orders/:id/payment', idParam, orderValidators.reconcilePayment, validate, paymentController.reconcileManualPayment);
router.put('/orders/:id/status', idParam, orderValidators.updateStatus, validate, orderController.updateStatus);
router.put('/orders/:id', idParam, orderValidators.update, validate, orderController.update);
router.delete('/orders/:id', idParam, validate, orderController.remove);

router.get('/reviews', reviewController.listAdmin);
router.put('/reviews/:id/approve', idParam, validate, reviewController.approve);
router.put('/reviews/:id/reject', idParam, validate, reviewController.reject);
router.put('/reviews/:id', idParam, reviewValidators.update, validate, reviewController.update);
router.delete('/reviews/:id', idParam, validate, reviewController.remove);

router.get('/vouchers', voucherController.list);
router.post('/vouchers', voucherValidators.create, validate, voucherController.create);
router.put('/vouchers/:id', idParam, voucherValidators.update, validate, voucherController.update);
router.delete('/vouchers/:id', idParam, validate, voucherController.remove);

router.get('/banners', bannerController.list);
router.post('/banners', bannerValidators.create, validate, bannerController.create);
router.put('/banners/:id', idParam, bannerValidators.update, validate, bannerController.update);
router.delete('/banners/:id', idParam, validate, bannerController.remove);

router.get('/settings', settingController.list);
router.post('/settings', settingValidators.create, validate, settingController.create);
router.put('/settings/:id', idParam, settingValidators.update, validate, settingController.update);
router.delete('/settings/:id', idParam, validate, settingController.remove);

module.exports = router;

const express = require('express');
const paymentController = require('../controllers/paymentController');
const orderValidators = require('../validators/orderValidators');
const validate = require('../middlewares/validate');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/config', paymentController.getConfig);
router.post(
  '/vnpay/checkout',
  protect,
  orderValidators.createVnpay,
  validate,
  paymentController.createVnpayCheckout,
);
router.get('/vnpay/ipn', paymentController.vnpayIpn);
router.get('/vnpay/return', paymentController.vnpayReturn);
router.post('/vnpay/result', paymentController.verifyVnpayResult);

module.exports = router;

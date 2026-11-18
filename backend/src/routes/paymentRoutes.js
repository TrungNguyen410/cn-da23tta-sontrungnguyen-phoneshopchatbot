const express = require('express');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

router.get('/config', paymentController.getConfig);
router.post('/sepay/webhook', paymentController.sepayWebhook);

module.exports = router;

const paymentService = require('../services/paymentService');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');

const getConfig = (_req, res) => {
  successResponse(res, paymentService.getConfig(), 'Payment configuration retrieved');
};

const sepayWebhook = asyncHandler(async (req, res) => {
  const result = await paymentService.processSepayWebhook(req.body, req.get('Authorization'));
  res.status(200).json({ success: true, ...result });
});

const reconcileManualPayment = asyncHandler(async (req, res) => {
  const order = await paymentService.reconcileManualPayment(req.params.id, req.body, req.user);
  successResponse(res, order, 'Manual payment reconciled');
});

module.exports = {
  getConfig,
  reconcileManualPayment,
  sepayWebhook,
};

const env = require('../config/env');
const paymentService = require('../services/paymentService');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');

const clientIp = (req) =>
  String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1')
    .split(',')[0]
    .trim()
    .replace('::ffff:', '');

const getConfig = (_req, res) => {
  successResponse(res, paymentService.getConfig(), 'Payment configuration retrieved');
};

const createVnpayCheckout = asyncHandler(async (req, res) => {
  const result = await paymentService.createVnpayCheckout(req.body, req.user, {
    idempotencyKey: req.get('Idempotency-Key'),
    ipAddress: clientIp(req),
  });
  successResponse(res, result, 'VNPay checkout created', 201);
});

const vnpayIpn = asyncHandler(async (req, res) => {
  const result = await paymentService.processVnpayIpn(req.query);
  res.status(200).json(result);
});

const vnpayReturn = asyncHandler(async (req, res) => {
  const proof = paymentService.createResultProof(req.query);
  const params = new URLSearchParams({
    provider: 'vnpay',
    reference: req.query.vnp_TxnRef || '',
    code: req.query.vnp_ResponseCode || '',
    ...(proof ? { proof } : {}),
  });
  res.redirect(`${env.frontendUrl}/payment-result?${params.toString()}`);
});

const verifyVnpayResult = asyncHandler(async (req, res) => {
  const result = paymentService.verifyResultProof(req.body.proof);
  successResponse(res, result, 'Payment result verified');
});

const reconcileManualPayment = asyncHandler(async (req, res) => {
  const order = await paymentService.reconcileManualPayment(req.params.id, req.body, req.user);
  successResponse(res, order, 'Manual payment reconciled');
});

module.exports = {
  createVnpayCheckout,
  getConfig,
  reconcileManualPayment,
  verifyVnpayResult,
  vnpayIpn,
  vnpayReturn,
};

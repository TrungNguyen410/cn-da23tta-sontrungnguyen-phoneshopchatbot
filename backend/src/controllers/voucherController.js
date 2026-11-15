const voucherService = require('../services/voucherService');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');

const list = asyncHandler(async (_req, res) => {
  const vouchers = await voucherService.list();
  successResponse(res, vouchers, 'Vouchers retrieved');
});

const getById = asyncHandler(async (req, res) => {
  const voucher = await voucherService.getById(req.params.id);
  successResponse(res, voucher, 'Voucher retrieved');
});

const create = asyncHandler(async (req, res) => {
  const voucher = await voucherService.create(req.body);
  successResponse(res, voucher, 'Voucher created', 201);
});

const update = asyncHandler(async (req, res) => {
  const voucher = await voucherService.update(req.params.id, req.body);
  successResponse(res, voucher, 'Voucher updated');
});

const remove = asyncHandler(async (req, res) => {
  const result = await voucherService.remove(req.params.id);
  successResponse(res, result, 'Voucher deleted');
});

const validateVoucher = asyncHandler(async (req, res) => {
  const voucher = await voucherService.validate(req.body.code, req.body.subtotal, req.user);
  successResponse(res, voucher, 'Voucher is valid');
});

const mine = asyncHandler(async (req, res) => {
  const vouchers = await voucherService.listForUser(req.user.id);
  successResponse(res, vouchers, 'Customer vouchers retrieved');
});

const giftToCustomer = asyncHandler(async (req, res) => {
  const voucher = await voucherService.giftToCustomer(req.params.id, req.body);
  successResponse(res, voucher, 'Gift voucher created', 201);
});

module.exports = { list, getById, create, update, remove, validateVoucher, mine, giftToCustomer };

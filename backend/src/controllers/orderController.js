const orderService = require('../services/orderService');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');

const create = asyncHandler(async (req, res) => {
  const order = await orderService.create(req.body, req.user, {
    idempotencyKey: req.get('Idempotency-Key'),
  });
  successResponse(res, order, 'Order created', 201);
});

const list = asyncHandler(async (req, res) => {
  const orders = await orderService.list(req.user, req.query);
  successResponse(res, orders, 'Orders retrieved');
});

const myOrders = asyncHandler(async (req, res) => {
  const orders = await orderService.myOrders(req.user.id);
  successResponse(res, orders, 'Customer orders retrieved');
});

const getById = asyncHandler(async (req, res) => {
  const order = await orderService.getById(req.params.id, req.user);
  successResponse(res, order, 'Order retrieved');
});

const lookup = asyncHandler(async (req, res) => {
  const order = await orderService.lookup(req.query.orderNumber, req.query.phone);
  successResponse(res, order, 'Order found');
});

const update = asyncHandler(async (req, res) => {
  const order = await orderService.update(req.params.id, req.body);
  successResponse(res, order, 'Order updated');
});

const updateStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updateStatus(req.params.id, req.body.status);
  successResponse(res, order, 'Order status updated');
});

const cancel = asyncHandler(async (req, res) => {
  const order = await orderService.cancel(req.params.id, req.user);
  successResponse(res, order, 'Order cancelled');
});

const remove = asyncHandler(async (req, res) => {
  const result = await orderService.remove(req.params.id);
  successResponse(res, result, 'Order deleted');
});

module.exports = { create, list, myOrders, getById, lookup, update, updateStatus, cancel, remove };

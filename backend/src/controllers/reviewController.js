const reviewService = require('../services/reviewService');
const { mutationFields } = require('./crudController');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const pick = require('../utils/pick');

const listPublic = asyncHandler(async (_req, res) => {
  const reviews = await reviewService.listPublic();
  successResponse(res, reviews, 'Reviews retrieved');
});

const listAdmin = asyncHandler(async (_req, res) => {
  const reviews = await reviewService.listAdmin();
  successResponse(res, reviews, 'Reviews retrieved');
});

const getByProduct = asyncHandler(async (req, res) => {
  const reviews = await reviewService.getByProduct(req.params.productId);
  successResponse(res, reviews, 'Product reviews retrieved');
});

const getByAccessory = asyncHandler(async (req, res) => {
  const reviews = await reviewService.getByAccessory(req.params.accessoryId);
  successResponse(res, reviews, 'Accessory reviews retrieved');
});

const create = asyncHandler(async (req, res) => {
  const review = await reviewService.create(pick(req.body, mutationFields.reviewCreate), req.user);
  successResponse(res, review, 'Review submitted', 201);
});

const update = asyncHandler(async (req, res) => {
  const dto = pick(req.body, mutationFields.reviewAdminUpdate);
  if (Object.keys(dto).length === 0) throw new AppError('Dữ liệu cập nhật không hợp lệ', 422);
  const review = await reviewService.update(req.params.id, dto);
  successResponse(res, review, 'Review updated');
});

const approve = asyncHandler(async (req, res) => {
  const review = await reviewService.approve(req.params.id);
  successResponse(res, review, 'Review approved');
});

const reject = asyncHandler(async (req, res) => {
  const review = await reviewService.reject(req.params.id);
  successResponse(res, review, 'Review rejected');
});

const remove = asyncHandler(async (req, res) => {
  const result = await reviewService.remove(req.params.id);
  successResponse(res, result, 'Review deleted');
});

module.exports = { listPublic, listAdmin, getByProduct, getByAccessory, create, update, approve, reject, remove };

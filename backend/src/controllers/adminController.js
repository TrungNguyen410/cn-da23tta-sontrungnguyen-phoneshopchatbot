const customerService = require('../services/customerService');
const dashboardService = require('../services/dashboardService');
const { mutationFields } = require('./crudController');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const pick = require('../utils/pick');

const dashboard = asyncHandler(async (req, res) => {
  const data = await dashboardService.statistics({ year: req.query.year });
  successResponse(res, data, 'Dashboard statistics retrieved');
});

const customers = asyncHandler(async (req, res) => {
  const data = await customerService.list(req.query);
  successResponse(res, data, 'Customers retrieved');
});

const updateCustomer = asyncHandler(async (req, res) => {
  const dto = pick(req.body, mutationFields.customerUpdate);
  if (Object.keys(dto).length === 0) throw new AppError('Dữ liệu cập nhật không hợp lệ', 422);
  const data = await customerService.update(req.params.id, dto);
  successResponse(res, data, 'Customer updated');
});

module.exports = { dashboard, customers, updateCustomer };

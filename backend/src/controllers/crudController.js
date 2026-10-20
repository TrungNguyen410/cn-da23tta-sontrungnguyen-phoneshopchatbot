const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const pick = require('../utils/pick');

const mutationFields = {
  customerUpdate: ['fullName', 'email', 'phone', 'address', 'role', 'status'],
  contactCreate: ['fullName', 'email', 'phone', 'subject', 'message'],
  contactUpdate: ['status', 'adminNote'],
  settingCreate: ['key', 'value', 'group', 'label'],
  settingUpdate: ['value', 'group', 'label'],
  bannerCreate: ['title', 'description', 'image', 'link', 'position', 'active'],
  bannerUpdate: ['title', 'description', 'image', 'link', 'position', 'active'],
  brandCreate: ['name', 'slug', 'logo', 'description', 'active'],
  brandUpdate: ['name', 'slug', 'logo', 'description', 'active'],
  categoryCreate: ['name', 'slug', 'description', 'active'],
  categoryUpdate: ['name', 'slug', 'description', 'active'],
  productCreate: [
    'name', 'brandId', 'categoryId', 'price', 'oldPrice', 'discountPercent', 'image', 'images',
    'ram', 'storage', 'screen', 'battery', 'camera', 'chip', 'description', 'specifications',
    'stock', 'rating', 'status',
  ],
  productUpdate: [
    'name', 'brandId', 'categoryId', 'price', 'oldPrice', 'discountPercent', 'image', 'images',
    'ram', 'storage', 'screen', 'battery', 'camera', 'chip', 'description', 'specifications',
    'stock', 'rating', 'status',
  ],
  accessoryCreate: [
    'name', 'brandId', 'categoryId', 'price', 'oldPrice', 'discountPercent', 'image', 'images',
    'description', 'specifications', 'stock', 'rating', 'status',
  ],
  accessoryUpdate: [
    'name', 'brandId', 'categoryId', 'price', 'oldPrice', 'discountPercent', 'image', 'images',
    'description', 'specifications', 'stock', 'rating', 'status',
  ],
  reviewCreate: ['productId', 'accessoryId', 'rating', 'comment', 'images'],
  reviewAdminUpdate: ['rating', 'comment', 'images', 'status'],
};

const resourceMutationFields = {
  Contact: { create: mutationFields.contactCreate, update: mutationFields.contactUpdate },
  Setting: { create: mutationFields.settingCreate, update: mutationFields.settingUpdate },
  Banner: { create: mutationFields.bannerCreate, update: mutationFields.bannerUpdate },
  Brand: { create: mutationFields.brandCreate, update: mutationFields.brandUpdate },
  Category: { create: mutationFields.categoryCreate, update: mutationFields.categoryUpdate },
  Product: { create: mutationFields.productCreate, update: mutationFields.productUpdate },
  Accessory: { create: mutationFields.accessoryCreate, update: mutationFields.accessoryUpdate },
};

const mutationDto = (resourceName, action, payload) => {
  const fields = resourceMutationFields[resourceName]?.[action];
  if (!fields) throw new AppError(`Mutation fields are not configured for ${resourceName}`, 500);
  const dto = pick(payload, fields);
  if (action === 'update' && Object.keys(dto).length === 0) {
    throw new AppError('Dữ liệu cập nhật không hợp lệ', 422);
  }
  if (resourceName === 'Contact' && action === 'create') {
    return { ...dto, status: 'new', adminNote: '', isDeleted: false };
  }
  return dto;
};

const createCrudController = (service, resourceName) => ({
  list: asyncHandler(async (req, res) => {
    const data = await service.list(req.query);
    successResponse(res, data, `${resourceName} list retrieved`);
  }),

  listPublic: asyncHandler(async (req, res) => {
    const data = await service.listPublic(req.query);
    successResponse(res, data, `${resourceName} list retrieved`);
  }),

  getById: asyncHandler(async (req, res) => {
    const data = await service.getById(req.params.id);
    successResponse(res, data, `${resourceName} retrieved`);
  }),

  getPublicById: asyncHandler(async (req, res) => {
    const data = await service.getPublicById(req.params.id);
    successResponse(res, data, `${resourceName} retrieved`);
  }),

  create: asyncHandler(async (req, res) => {
    const data = await service.create(mutationDto(resourceName, 'create', req.body));
    successResponse(res, data, `${resourceName} created`, 201);
  }),

  update: asyncHandler(async (req, res) => {
    const data = await service.update(req.params.id, mutationDto(resourceName, 'update', req.body));
    successResponse(res, data, `${resourceName} updated`);
  }),

  remove: asyncHandler(async (req, res) => {
    const data = await service.remove(req.params.id);
    successResponse(res, data, `${resourceName} deleted`);
  }),
});

module.exports = createCrudController;
module.exports.mutationFields = mutationFields;

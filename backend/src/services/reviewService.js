const AppError = require('../utils/AppError');
const reviewRepository = require('../repositories/reviewRepository');
const orderRepository = require('../repositories/orderRepository');
const accessoryRepository = require('../repositories/accessoryRepository');
const productRepository = require('../repositories/productRepository');
const pick = require('../utils/pick');

const reviewCreateFields = ['productId', 'accessoryId', 'rating', 'comment', 'images'];
const reviewUpdateFields = ['rating', 'comment', 'images', 'status'];

class ReviewService {
  async listPublic() {
    return reviewRepository.findAll({ status: 'approved' }, { sort: { createdAt: -1 } });
  }

  async listAdmin() {
    return reviewRepository.findAll({}, { sort: { createdAt: -1 } });
  }

  async getByProduct(productId) {
    return reviewRepository.findAll({ productId, status: 'approved' }, { sort: { createdAt: -1 } });
  }

  async getByAccessory(accessoryId) {
    return reviewRepository.findAll({ accessoryId, status: 'approved' }, { sort: { createdAt: -1 } });
  }

  async create(payload, user) {
    const dto = pick(payload, reviewCreateFields);
    const userId = user?.id;
    const productId = dto.productId || 'general';
    const accessoryId = dto.accessoryId || null;
    const target = accessoryId
      ? await accessoryRepository.findById(accessoryId)
      : await productRepository.findById(productId);
    if (!target || target.isDeleted || target.status !== 'active') {
      throw new AppError('Sản phẩm đánh giá không tồn tại', 404);
    }
    let verifiedPurchase = false;
    const orders = await orderRepository.findAll({ userId }, { sort: { createdAt: -1 } });
    verifiedPurchase = orders.some((order) =>
      ['delivered', 'completed'].includes(order.status)
      && order.items.some((item) =>
        (accessoryId && item.accessoryId === accessoryId)
        || (!accessoryId && item.productId === productId)),
    );
    const existingReview = await reviewRepository.findByUserAndTarget(userId, { productId, accessoryId });
    if (existingReview) {
      throw new AppError('Bạn đã đánh giá mặt hàng này rồi', 409);
    }

    try {
      return await reviewRepository.create({
        ...dto,
        userId,
        userName: user?.fullName,
        productId,
        accessoryId,
        images: Array.isArray(dto.images) ? dto.images.slice(0, 5) : [],
        verifiedPurchase,
        status: 'pending',
      });
    } catch (error) {
      if (error?.code === 11000) {
        throw new AppError('Bạn đã đánh giá mặt hàng này rồi', 409);
      }
      throw error;
    }
  }

  async update(id, payload) {
    const dto = pick(payload, reviewUpdateFields);
    if (Object.keys(dto).length === 0) throw new AppError('Dữ liệu cập nhật không hợp lệ', 422);
    return reviewRepository.update(id, dto);
  }

  async approve(id) {
    return reviewRepository.update(id, { status: 'approved' });
  }

  async reject(id) {
    return reviewRepository.update(id, { status: 'rejected' });
  }

  async remove(id) {
    const review = await reviewRepository.findById(id);
    if (!review) throw new AppError('Không tìm thấy đánh giá', 404);
    return reviewRepository.softDelete(id);
  }
}

module.exports = new ReviewService();

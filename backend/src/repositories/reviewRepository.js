const BaseRepository = require('./baseRepository');
const Review = require('../models/Review');

class ReviewRepository extends BaseRepository {
  constructor() {
    super(Review);
  }

  async findByUserAndTarget(userId, { productId = 'general', accessoryId = null } = {}) {
    return Review.findOne({
      userId,
      productId,
      accessoryId,
      isDeleted: false,
    });
  }
}

module.exports = new ReviewRepository();

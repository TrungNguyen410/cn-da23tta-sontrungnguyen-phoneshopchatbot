const BaseRepository = require('./baseRepository');
const Accessory = require('../models/Accessory');

class AccessoryRepository extends BaseRepository {
  async findOne(filter = {}) {
    const accessory = await this.model.findOne({ ...filter, isDeleted: false });
    return accessory?.toJSON();
  }
}

module.exports = new AccessoryRepository(Accessory);

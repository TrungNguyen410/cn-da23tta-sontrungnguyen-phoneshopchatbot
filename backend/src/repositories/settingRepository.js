const BaseRepository = require('./baseRepository');
const Setting = require('../models/Setting');

class SettingRepository extends BaseRepository {
  constructor() {
    super(Setting);
  }

  async upsertByKey(key, payload) {
    const doc = await Setting.findOneAndUpdate(
      { key, isDeleted: false },
      { ...payload, key },
      { returnDocument: 'after', upsert: true, runValidators: true },
    );
    return doc.toJSON();
  }
}

module.exports = new SettingRepository();

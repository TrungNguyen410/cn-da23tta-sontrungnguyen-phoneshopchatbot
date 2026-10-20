const BaseRepository = require('./baseRepository');
const Voucher = require('../models/Voucher');

class VoucherRepository extends BaseRepository {
  constructor() {
    super(Voucher);
  }

  async findByCode(code) {
    const voucher = await Voucher.findOne({
      code: code.trim().toUpperCase(),
      isDeleted: false,
    });
    return voucher?.toJSON() || null;
  }

  async reserve(code, subtotal, now = new Date(), session) {
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const voucher = await Voucher.findOneAndUpdate(
      {
        code: code.trim().toUpperCase(),
        isDeleted: false,
        active: true,
        minOrder: { $lte: Number(subtotal) },
        startDate: { $lte: now },
        endDate: { $gte: dayStart },
        $or: [
          { quantity: 0 },
          { $expr: { $lt: ['$used', '$quantity'] } },
        ],
      },
      { $inc: { used: 1 } },
      { returnDocument: 'after', runValidators: true, session },
    );
    return voucher?.toJSON() || null;
  }

  async release(code, session) {
    if (!code) return null;
    const voucher = await Voucher.findOneAndUpdate(
      {
        code: code.trim().toUpperCase(),
        isDeleted: false,
        used: { $gt: 0 },
      },
      { $inc: { used: -1 } },
      { returnDocument: 'after', runValidators: true, session },
    );
    return voucher?.toJSON() || null;
  }
}

module.exports = new VoucherRepository();

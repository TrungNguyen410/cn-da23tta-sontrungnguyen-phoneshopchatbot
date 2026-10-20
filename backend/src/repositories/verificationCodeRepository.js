const VerificationCode = require('../models/VerificationCode');

class VerificationCodeRepository {
  async replace({ target, purpose, channel, codeHash, payload, expiresAt }) {
    await VerificationCode.deleteMany({ target, purpose, consumedAt: null });
    return VerificationCode.create({ target, purpose, channel, codeHash, payload, expiresAt });
  }

  async findActive(target, purpose) {
    return VerificationCode.findOne({
      target,
      purpose,
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    }).select('+codeHash').sort({ createdAt: -1 });
  }

  async incrementAttempts(id, now = new Date()) {
    return VerificationCode.updateOne(
      {
        _id: id,
        consumedAt: null,
        expiresAt: { $gt: now },
        attempts: { $lt: 5 },
      },
      { $inc: { attempts: 1 } },
    );
  }

  async consume(id, now = new Date()) {
    const result = await VerificationCode.updateOne(
      {
        _id: id,
        consumedAt: null,
        expiresAt: { $gt: now },
        attempts: { $lt: 5 },
      },
      { $set: { consumedAt: now } },
    );
    return result.modifiedCount === 1;
  }

  async invalidate(id, now = new Date()) {
    return VerificationCode.updateOne(
      { _id: id, consumedAt: null },
      { $set: { consumedAt: now } },
    );
  }
}

module.exports = new VerificationCodeRepository();

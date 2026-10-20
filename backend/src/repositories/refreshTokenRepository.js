const RefreshToken = require('../models/RefreshToken');

class RefreshTokenRepository {
  async create(payload) {
    return RefreshToken.create(payload);
  }

  async findByHash(tokenHash) {
    return RefreshToken.findOne({ tokenHash, revokedAt: null });
  }

  async consume(tokenHash, now = new Date()) {
    return RefreshToken.findOneAndUpdate(
      {
        tokenHash,
        revokedAt: null,
        expiresAt: { $gt: now },
      },
      { $set: { revokedAt: now } },
      { returnDocument: 'before' },
    );
  }

  async revoke(tokenHash) {
    return RefreshToken.findOneAndUpdate(
      { tokenHash, revokedAt: null },
      { revokedAt: new Date() },
      { returnDocument: 'after' },
    );
  }

  async revokeUserTokens(userId) {
    return RefreshToken.updateMany({ userId, revokedAt: null }, { revokedAt: new Date() });
  }
}

module.exports = new RefreshTokenRepository();

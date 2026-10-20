const RefreshToken = require('../models/RefreshToken');

const cleanupRefreshTokens = async () => {
  const now = new Date();
  return RefreshToken.deleteMany({
    $or: [{ expiresAt: { $lt: now } }, { revokedAt: { $ne: null } }],
  });
};

module.exports = cleanupRefreshTokens;

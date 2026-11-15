const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const { hashToken, signAccessToken, signRefreshToken } = require('../utils/token');
const refreshTokenRepository = require('../repositories/refreshTokenRepository');
const verificationCodeRepository = require('../repositories/verificationCodeRepository');
const userRepository = require('../repositories/userRepository');
const otpDeliveryService = require('./otpDeliveryService');
const firebaseTokenVerifier = require('./firebaseTokenVerifier');
const { normalizeVietnamesePhone } = require('../utils/phone');
const { toShippingAddress } = require('../utils/shippingAddress');

const publicUser = (user) => (typeof user.toJSON === 'function' ? user.toJSON() : user);

// Firebase sign-in provider ids accepted by POST /auth/social, mapped to User.authProvider.
const SOCIAL_PROVIDERS = { 'google.com': 'google', 'facebook.com': 'facebook' };
const FULL_NAME_MAX = 100;

const socialFullName = (claims) => {
  const name = String(claims.name || '').trim() || String(claims.email || '').split('@')[0].trim();
  return (name || 'Khách hàng').slice(0, FULL_NAME_MAX);
};

class AuthService {
  createOtp() {
    return String(crypto.randomInt(100000, 1000000));
  }

  otpHash(code, target, purpose) {
    return hashToken(`${purpose}:${target}:${code}:${env.jwtAccessSecret}`);
  }

  async storeAndDeliverOtp({ target, channel, purpose, payload = null }) {
    const code = this.createOtp();
    const verification = await verificationCodeRepository.replace({
      target,
      purpose,
      channel,
      codeHash: this.otpHash(code, target, purpose),
      payload,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    let delivery;
    try {
      delivery = await otpDeliveryService.send(channel, target, code, purpose);
    } catch (error) {
      await verificationCodeRepository.invalidate(verification.id);
      throw error;
    }
    return {
      deliveryTarget: delivery.deliveryTarget,
      expiresInSeconds: 600,
      ...(delivery.trackingId ? { trackingId: delivery.trackingId } : {}),
      ...(env.nodeEnv !== 'production' ? { debugOtp: code } : {}),
    };
  }

  async verifyOtp({ target, purpose, otp }) {
    const verification = await verificationCodeRepository.findActive(target, purpose);
    if (!verification || verification.attempts >= 5) {
      throw new AppError('Mã OTP không hợp lệ hoặc đã hết hạn', 400);
    }
    const expected = Buffer.from(verification.codeHash, 'hex');
    const received = Buffer.from(this.otpHash(otp, target, purpose), 'hex');
    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
      await verificationCodeRepository.incrementAttempts(verification.id);
      throw new AppError('Mã OTP không hợp lệ hoặc đã hết hạn', 400);
    }
    const consumed = await verificationCodeRepository.consume(verification.id);
    if (!consumed) throw new AppError('Mã OTP không hợp lệ hoặc đã hết hạn', 400);
    return verification;
  }

  async issueSession(userDoc) {
    const user = publicUser(userDoc);
    const token = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    const decodedRefresh = jwt.decode(refreshToken);

    await refreshTokenRepository.create({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(decodedRefresh.exp * 1000),
    });

    return {
      token,
      accessToken: token,
      refreshToken,
      user,
    };
  }

  // Phone sign-up without an SMS code: the number is the login name but is not verified.
  async register({ fullName, phone, password }) {
    const target = normalizeVietnamesePhone(phone);
    if (!target) throw new AppError('Số điện thoại Việt Nam không hợp lệ', 422);
    if (await userRepository.findByPhone(target)) throw new AppError('Số điện thoại này đã được đăng ký', 409);

    let user;
    try {
      user = await userRepository.create({
        fullName,
        phone: target,
        password: await bcrypt.hash(password, 12),
        role: 'customer',
        status: 'active',
        authProvider: 'phone',
        phoneVerified: false,
        phoneVerifiedAt: null,
      });
    } catch (error) {
      if (error.code === 11000) throw new AppError('Số điện thoại này đã được đăng ký', 409);
      throw error;
    }
    return { user: publicUser(user) };
  }

  // Trades a Firebase ID token from a Google/Facebook popup for our own session.
  // Accounts are matched by Firebase uid only; an email already used by another account is never merged.
  async loginWithSocial({ idToken }) {
    const claims = await firebaseTokenVerifier.verifyIdToken(idToken, env.firebase.projectId, {
      providers: Object.keys(SOCIAL_PROVIDERS),
    });
    const firebaseUid = claims.sub;
    let user = await userRepository.findByFirebaseUid(firebaseUid);

    if (!user) {
      const email = String(claims.email || '').trim().toLowerCase();
      if (email && await userRepository.findByEmail(email)) {
        throw new AppError('Email này đã gắn với một tài khoản khác. Vui lòng đăng nhập bằng số điện thoại và mật khẩu.', 409);
      }
      try {
        user = await userRepository.create({
          fullName: socialFullName(claims),
          ...(email ? { email } : {}),
          emailVerified: Boolean(email && claims.email_verified),
          emailVerifiedAt: email && claims.email_verified ? new Date() : null,
          avatar: typeof claims.picture === 'string' ? claims.picture : '',
          authProvider: SOCIAL_PROVIDERS[claims.firebase.sign_in_provider],
          firebaseUid,
          role: 'customer',
          status: 'active',
          phoneVerified: false,
          phoneVerifiedAt: null,
        });
      } catch (error) {
        // A double click can race the first sign-in; the other request already created the account.
        if (error.code !== 11000) throw error;
        user = await userRepository.findByFirebaseUid(firebaseUid);
        if (!user) throw new AppError('Email này đã gắn với một tài khoản khác. Vui lòng đăng nhập bằng số điện thoại và mật khẩu.', 409);
      }
    }

    if (user.status === 'locked') throw new AppError('Tài khoản đã bị khóa', 403);
    if (user.status !== 'active') throw new AppError('Tài khoản đang ngừng hoạt động', 403);
    return this.issueSession(user);
  }

  async requestPasswordReset({ identifier }) {
    const phone = normalizeVietnamesePhone(identifier);
    const user = await userRepository.findByIdentifier(phone);
    if (!user) return { message: 'If the account exists, an OTP has been sent.' };
    const delivery = await this.storeAndDeliverOtp({
      target: user.phone,
      channel: 'sms',
      purpose: 'password-reset',
      payload: { userId: user.id },
    });
    return {
      message: 'If the account exists, an OTP has been sent.',
      ...(env.nodeEnv !== 'production' ? delivery : {}),
    };
  }

  async resetPassword({ identifier, otp, newPassword }) {
    const phone = normalizeVietnamesePhone(identifier);
    const user = await userRepository.findByIdentifier(phone);
    if (!user) throw new AppError('Mã OTP không hợp lệ hoặc đã hết hạn', 400);
    await this.verifyOtp({ target: user.phone, purpose: 'password-reset', otp });
    const password = await bcrypt.hash(newPassword, 12);
    await userRepository.update(user.id, { password });
    await refreshTokenRepository.revokeUserTokens(user.id);
    return { message: 'Password reset successfully' };
  }

  async login({ identifier, email, phone, password }) {
    const loginIdentifier = identifier || email || phone;
    const user = await userRepository.findByIdentifier(loginIdentifier, true);
    if (!user) throw new AppError('Thông tin đăng nhập không chính xác', 401);
    if (user.status === 'locked') throw new AppError('Tài khoản đã bị khóa', 403);
    if (user.status !== 'active') throw new AppError('Tài khoản đang ngừng hoạt động', 403);
    // Google/Facebook accounts have no password to compare.
    const passwordMatches = Boolean(user.password) && await bcrypt.compare(password, user.password);
    if (!passwordMatches) throw new AppError('Thông tin đăng nhập không chính xác', 401);

    return this.issueSession(user);
  }

  async me(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('Không tìm thấy người dùng', 404);
    return user;
  }

  async updateProfile(userId, payload) {
    const allowed = ['fullName', 'address', 'avatar', 'shippingAddress'];
    const updates = Object.fromEntries(Object.entries(payload).filter(([key]) => allowed.includes(key)));
    if (updates.shippingAddress) updates.shippingAddress = toShippingAddress(updates.shippingAddress);
    return userRepository.update(userId, updates);
  }

  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user) throw new AppError('Không tìm thấy người dùng', 404);
    if (!user.password) throw new AppError('Tài khoản đăng nhập bằng Google/Facebook không dùng mật khẩu', 400);

    const passwordMatches = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatches) throw new AppError('Mật khẩu hiện tại không chính xác', 400);

    const password = await bcrypt.hash(newPassword, 12);
    await userRepository.update(userId, { password });
    await refreshTokenRepository.revokeUserTokens(userId);
    return { message: 'Password changed successfully' };
  }

  async getWishlist(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('Không tìm thấy người dùng', 404);
    return user.wishlist || [];
  }

  async updateWishlist(userId, items = []) {
    const uniqueItems = [...new Set((Array.isArray(items) ? items : []).filter((item) => typeof item === 'string'))].slice(0, 100);
    const user = await userRepository.update(userId, { wishlist: uniqueItems });
    return user.wishlist || [];
  }

  async refresh(refreshToken) {
    if (!refreshToken) throw new AppError('Mã làm mới phiên đăng nhập là bắt buộc', 401);
    const payload = jwt.verify(refreshToken, env.jwtRefreshSecret);
    if (payload.type !== 'refresh') throw new AppError('Mã làm mới phiên đăng nhập không hợp lệ', 401);
    const storedToken = await refreshTokenRepository.consume(hashToken(refreshToken));
    if (!storedToken) {
      throw new AppError('Mã làm mới phiên đăng nhập không hợp lệ', 401);
    }

    const user = await userRepository.findById(payload.sub);
    if (!user) throw new AppError('Không tìm thấy người dùng', 404);
    if (user.status === 'locked') throw new AppError('Tài khoản đã bị khóa', 403);
    if (user.status !== 'active') throw new AppError('Tài khoản đang ngừng hoạt động', 403);
    return this.issueSession(user);
  }

  async logout(refreshToken) {
    if (refreshToken) await refreshTokenRepository.revoke(hashToken(refreshToken));
    return { message: 'Logged out successfully' };
  }
}

module.exports = new AuthService();

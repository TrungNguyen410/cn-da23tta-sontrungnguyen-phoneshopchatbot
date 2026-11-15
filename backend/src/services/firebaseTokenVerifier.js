const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

// Firebase signs ID tokens with rotating Google keys published here (X.509 PEM per key id).
const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
// A sign-in older than this cannot be traded for a session.
const MAX_SIGN_IN_AGE_SECONDS = 15 * 60;
const DEFAULT_CACHE_SECONDS = 60 * 60;

const invalidToken = () => new AppError('Đăng nhập Google/Facebook không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.', 401);
const unreachable = () => new AppError('Không thể kết nối dịch vụ đăng nhập Google/Facebook. Vui lòng thử lại sau.', 503);

class FirebaseTokenVerifier {
  constructor({ fetchImpl } = {}) {
    this.fetchImpl = fetchImpl || ((...args) => fetch(...args));
    this.certs = null;
    this.certsExpireAt = 0;
  }

  clearCache() {
    this.certs = null;
    this.certsExpireAt = 0;
  }

  async publicCerts({ refresh = false } = {}) {
    if (!refresh && this.certs && Date.now() < this.certsExpireAt) return this.certs;
    let response;
    try {
      response = await this.fetchImpl(CERTS_URL, { signal: AbortSignal.timeout(8000) });
    } catch {
      throw unreachable();
    }
    if (!response.ok) throw unreachable();
    const maxAge = Number(/max-age=(\d+)/.exec(response.headers.get('cache-control') || '')?.[1]);
    this.certs = await response.json();
    this.certsExpireAt = Date.now() + (maxAge || DEFAULT_CACHE_SECONDS) * 1000;
    return this.certs;
  }

  async certFor(keyId) {
    const certs = await this.publicCerts();
    if (certs[keyId]) return certs[keyId];
    // Google rotated its keys since the last fetch.
    const refreshed = await this.publicCerts({ refresh: true });
    return refreshed[keyId] || null;
  }

  // Returns the verified claims of a fresh Firebase ID token whose sign-in provider is one of `providers`
  // (Firebase ids such as 'google.com' or 'facebook.com').
  async verifyIdToken(idToken, projectId, { providers }) {
    if (!projectId) throw new AppError('Đăng nhập bằng Google/Facebook chưa được cấu hình.', 503);
    const decoded = jwt.decode(idToken, { complete: true });
    if (!decoded || decoded.header?.alg !== 'RS256' || !decoded.header?.kid) throw invalidToken();

    const cert = await this.certFor(decoded.header.kid);
    if (!cert) throw invalidToken();

    let claims;
    try {
      claims = jwt.verify(idToken, cert, {
        algorithms: ['RS256'],
        audience: projectId,
        issuer: `https://securetoken.google.com/${projectId}`,
      });
    } catch {
      throw invalidToken();
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const authTime = Number(claims.auth_time);
    if (!claims.sub || !authTime || authTime > nowSeconds + 60 || nowSeconds - authTime > MAX_SIGN_IN_AGE_SECONDS) {
      throw invalidToken();
    }
    if (!providers.includes(claims.firebase?.sign_in_provider)) throw invalidToken();
    return claims;
  }
}

module.exports = new FirebaseTokenVerifier();
module.exports.FirebaseTokenVerifier = FirebaseTokenVerifier;
module.exports.CERTS_URL = CERTS_URL;

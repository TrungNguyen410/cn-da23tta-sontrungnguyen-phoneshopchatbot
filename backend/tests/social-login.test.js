const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const env = require('../src/config/env');
const User = require('../src/models/User');
const firebaseTokenVerifier = require('../src/services/firebaseTokenVerifier');
const { app, createUser } = require('./helpers');

const PROJECT_ID = 'phoneshopai-test';
const keyPair = () => crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
const googleKey = keyPair();
const strangerKey = keyPair();
const nowSeconds = () => Math.floor(Date.now() / 1000);

const firebaseToken = ({
  uid = 'firebase-uid-1',
  provider = 'google.com',
  name = 'Phạm Quốc Huy',
  email = 'huy.pham@gmail.com',
  emailVerified = true,
  picture = 'https://lh3.googleusercontent.com/a/huy',
  authTime = nowSeconds(),
  audience = PROJECT_ID,
  privateKey = googleKey.privateKey,
  keyid = 'google-key-1',
} = {}) => jwt.sign(
  {
    ...(name ? { name } : {}),
    ...(email ? { email, email_verified: emailVerified } : {}),
    ...(picture ? { picture } : {}),
    auth_time: authTime,
    firebase: { sign_in_provider: provider, identities: { [provider]: ['provider-user-id'] } },
  },
  privateKey,
  { algorithm: 'RS256', keyid, audience, issuer: `https://securetoken.google.com/${audience}`, subject: uid, expiresIn: '1h' },
);

const socialLogin = (body) => request(app).post('/api/auth/social').send(body);

describe('Google/Facebook sign-in through Firebase', () => {
  let originalProjectId;
  let originalFetch;

  beforeAll(() => User.init());

  beforeEach(() => {
    originalProjectId = env.firebase.projectId;
    originalFetch = firebaseTokenVerifier.fetchImpl;
    env.firebase.projectId = PROJECT_ID;
    firebaseTokenVerifier.clearCache();
    firebaseTokenVerifier.fetchImpl = jest.fn(async () => ({
      ok: true,
      headers: { get: () => 'public, max-age=3600' },
      json: async () => ({ 'google-key-1': googleKey.publicKey }),
    }));
  });

  afterEach(() => {
    env.firebase.projectId = originalProjectId;
    firebaseTokenVerifier.fetchImpl = originalFetch;
    firebaseTokenVerifier.clearCache();
  });

  it('creates a customer on the first Google sign-in and reuses it afterwards', async () => {
    const first = await socialLogin({ idToken: firebaseToken() });

    expect(first.status).toBe(200);
    expect(first.body.data.token).toBeTruthy();
    expect(first.body.data.refreshToken).toBeTruthy();
    expect(first.body.data.user).toMatchObject({
      fullName: 'Phạm Quốc Huy',
      email: 'huy.pham@gmail.com',
      emailVerified: true,
      avatar: 'https://lh3.googleusercontent.com/a/huy',
      authProvider: 'google',
      role: 'customer',
      phoneVerified: false,
    });
    expect(first.body.data.user.phone).toBeUndefined();
    expect(first.body.data.user.password).toBeUndefined();

    const again = await socialLogin({ idToken: firebaseToken({ name: 'Tên mới trên Google' }) });
    expect(again.status).toBe(200);
    expect(again.body.data.user.id).toBe(first.body.data.user.id);
    expect(again.body.data.user.fullName).toBe('Phạm Quốc Huy');
    expect(await User.countDocuments({ firebaseUid: 'firebase-uid-1' })).toBe(1);

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${again.body.data.token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.authProvider).toBe('google');
  });

  it('creates separate phone-less accounts for several Facebook users, even without an email', async () => {
    const withoutEmail = await socialLogin({
      idToken: firebaseToken({ uid: 'fb-uid-1', provider: 'facebook.com', name: '', email: '', picture: '' }),
    });
    const unverified = await socialLogin({
      idToken: firebaseToken({ uid: 'fb-uid-2', provider: 'facebook.com', email: 'Lan.Tran@Example.com', emailVerified: false }),
    });

    expect(withoutEmail.status).toBe(200);
    expect(withoutEmail.body.data.user).toMatchObject({ fullName: 'Khách hàng', authProvider: 'facebook', emailVerified: false });
    expect(withoutEmail.body.data.user.email).toBeUndefined();
    expect(unverified.status).toBe(200);
    expect(unverified.body.data.user).toMatchObject({ email: 'lan.tran@example.com', emailVerified: false });
    expect(await User.countDocuments({ authProvider: 'facebook' })).toBe(2);
  });

  it('does not merge into an existing account that already uses the same email', async () => {
    await createUser({ email: 'huy.pham@gmail.com', phone: '0912345678' });

    const response = await socialLogin({ idToken: firebaseToken() });

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/đăng nhập bằng số điện thoại/);
    expect(await User.countDocuments({ firebaseUid: 'firebase-uid-1' })).toBe(0);
  });

  it('turns away locked accounts', async () => {
    const first = await socialLogin({ idToken: firebaseToken() });
    await User.updateOne({ _id: first.body.data.user.id }, { status: 'locked' });

    const response = await socialLogin({ idToken: firebaseToken() });
    expect(response.status).toBe(403);
  });

  it('rejects tokens from another project, key or sign-in method, and stale sign-ins', async () => {
    const cases = [
      { audience: 'another-project' },
      { privateKey: strangerKey.privateKey },
      { provider: 'phone' },
      { provider: 'password' },
      { authTime: nowSeconds() - 20 * 60 },
    ];
    for (const tokenOptions of cases) {
      const response = await socialLogin({ idToken: firebaseToken(tokenOptions) });
      expect({ tokenOptions, status: response.status }).toEqual({ tokenOptions, status: 401 });
    }
    expect(await User.countDocuments()).toBe(0);
  });

  it('accepts only the token: no role, Firebase uid or missing token', async () => {
    expect((await socialLogin({ idToken: firebaseToken(), role: 'admin' })).status).toBe(422);
    expect((await socialLogin({ idToken: firebaseToken(), firebaseUid: 'other' })).status).toBe(422);
    expect((await socialLogin({})).status).toBe(422);
    expect(await User.countDocuments()).toBe(0);
  });

  it('cannot be used with the password login or the password change', async () => {
    const session = await socialLogin({ idToken: firebaseToken() });

    const passwordLogin = await request(app).post('/api/auth/login').send({ identifier: 'huy.pham@gmail.com', password: '123456' });
    expect(passwordLogin.status).toBe(401);

    const changed = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${session.body.data.token}`)
      .send({ currentPassword: '123456', newPassword: 'abcdef' });
    expect(changed.status).toBe(400);
    expect(changed.body.message).toMatch(/không dùng mật khẩu/);
  });

  it('refetches Google keys once when the key id is new', async () => {
    firebaseTokenVerifier.fetchImpl
      .mockResolvedValueOnce({ ok: true, headers: { get: () => 'max-age=3600' }, json: async () => ({ 'old-key': strangerKey.publicKey }) });

    const response = await socialLogin({ idToken: firebaseToken() });
    expect(response.status).toBe(200);
    expect(firebaseTokenVerifier.fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('answers 503 when Firebase is not configured on the server', async () => {
    env.firebase.projectId = '';
    const response = await socialLogin({ idToken: firebaseToken() });
    expect(response.status).toBe(503);
  });
});

const request = require('supertest');
const User = require('../src/models/User');
const { app, createUser, login } = require('./helpers');

describe('Auth API', () => {
  it('creates a customer only after the SMS phone OTP is verified', async () => {
    const requested = await request(app).post('/api/auth/register/request-otp').send({
      fullName: 'Nguyen Minh Anh',
      phone: '0912345678',
      password: '123456',
    });

    expect(requested.status).toBe(202);
    expect(await User.findOne({ phone: '0912345678' })).toBeNull();

    const verified = await request(app).post('/api/auth/register/verify-otp').send({
      phone: '+84912345678',
      otp: requested.body.data.debugOtp,
    });

    expect(verified.status).toBe(201);
    expect(verified.body.data.token).toBeTruthy();
    expect(verified.body.data.user.phone).toBe('0912345678');
    expect(verified.body.data.user.phoneVerified).toBe(true);
    expect(verified.body.data.user.email).toBeUndefined();
    expect(verified.body.data.user.password).toBeUndefined();
  });

  it('resets a forgotten password with a one-time SMS code', async () => {
    await createUser({ email: 'forgot@test.com', phone: '0977777777' });
    const requested = await request(app).post('/api/auth/forgot-password/request-otp').send({
      identifier: '+84977777777',
    });
    expect(requested.status).toBe(200);

    const reset = await request(app).post('/api/auth/forgot-password/reset').send({
      identifier: '0977777777',
      otp: requested.body.data.debugOtp,
      newPassword: 'new-password',
    });
    expect(reset.status).toBe(200);

    const loggedIn = await request(app).post('/api/auth/login').send({
      identifier: '0977777777',
      password: 'new-password',
    });
    expect(loggedIn.status).toBe(200);
  });

  it('does not allow public registration to set admin role', async () => {
    const response = await request(app).post('/api/auth/register').send({
      fullName: 'Privilege Attempt',
      phone: '0912345679',
      password: '123456',
      role: 'admin',
    });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
  });

  it('logs in and reads the current profile', async () => {
    await createUser({ email: 'admin@test.com', phone: '0900000000', role: 'admin' });
    const token = await login('admin@test.com');

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.role).toBe('admin');
  });

  it('does not allow changing the verified login phone through profile updates', async () => {
    await createUser({ email: 'profile@test.com', phone: '0901234567' });
    const token = await login('0901234567');

    const response = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '0912345678' });

    expect(response.status).toBe(422);
    expect((await User.findOne({ phone: '0901234567' })).phone).toBe('0901234567');
  });

  it('rejects locked users', async () => {
    await createUser({ email: 'locked@test.com', phone: '0999999999', status: 'locked' });

    const response = await request(app).post('/api/auth/login').send({
      identifier: 'locked@test.com',
      password: '123456',
    });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('rejects refresh tokens after a user is locked', async () => {
    const user = await createUser({ email: 'refresh-locked@test.com', phone: '0988888888' });
    const loginResponse = await request(app).post('/api/auth/login').send({
      identifier: 'refresh-locked@test.com',
      password: '123456',
    });

    await User.findByIdAndUpdate(user.id, { status: 'locked' });

    const response = await request(app).post('/api/auth/refresh').send({
      refreshToken: loginResponse.body.data.refreshToken,
    });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('allows a refresh token to be consumed only once under concurrent requests', async () => {
    await createUser({ email: 'refresh-race@test.com', phone: '0988888887' });
    const loginResponse = await request(app).post('/api/auth/login').send({
      identifier: 'refresh-race@test.com',
      password: '123456',
    });

    const attempts = await Promise.all([
      request(app).post('/api/auth/refresh').send({
        refreshToken: loginResponse.body.data.refreshToken,
      }),
      request(app).post('/api/auth/refresh').send({
        refreshToken: loginResponse.body.data.refreshToken,
      }),
    ]);

    expect(attempts.map((response) => response.status).sort()).toEqual([200, 401]);
  });

  it('allows a password-reset OTP to be consumed only once under concurrent requests', async () => {
    await createUser({ email: 'otp-race@test.com', phone: '0977777776' });
    const requested = await request(app).post('/api/auth/forgot-password/request-otp').send({
      identifier: '0977777776',
    });

    const payload = {
      identifier: '0977777776',
      otp: requested.body.data.debugOtp,
      newPassword: 'one-time-password',
    };
    const attempts = await Promise.all([
      request(app).post('/api/auth/forgot-password/reset').send(payload),
      request(app).post('/api/auth/forgot-password/reset').send(payload),
    ]);

    expect(attempts.map((response) => response.status).sort()).toEqual([200, 400]);
  });

  it('rejects the old email registration verification contract', async () => {
    const response = await request(app).post('/api/auth/register/verify-otp').send({
      email: 'legacy@example.com',
      otp: '123456',
    });

    expect(response.status).toBe(422);
  });

  it('rejects duplicate phones after normalization', async () => {
    await createUser({ email: 'normalized@test.com', phone: '0912345678' });
    const response = await request(app).post('/api/auth/register/request-otp').send({
      fullName: 'Duplicate Phone',
      phone: '+84 912 345 678',
      password: '123456',
    });

    expect(response.status).toBe(409);
  });

  it('returns 401 instead of 500 for an invalid access token', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer expired-or-invalid-token');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
  });

  it('persists a deduplicated wishlist with a 100 item limit', async () => {
    await createUser({ email: 'wishlist@test.com', phone: '0977777777' });
    const token = await login('wishlist@test.com');
    const items = [...Array.from({ length: 105 }, (_, index) => `item-${index}`), 'item-0'];

    const updated = await request(app)
      .put('/api/auth/wishlist')
      .set('Authorization', `Bearer ${token}`)
      .send({ items });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toHaveLength(100);
    expect(new Set(updated.body.data).size).toBe(100);

    const fetched = await request(app)
      .get('/api/auth/wishlist')
      .set('Authorization', `Bearer ${token}`);
    expect(fetched.body.data).toEqual(updated.body.data);
  });
});

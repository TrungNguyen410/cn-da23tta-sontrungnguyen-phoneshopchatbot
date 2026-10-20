import { afterEach, describe, expect, it } from 'vitest';
import { mockDb } from './mockDb';

describe('mock OTP authentication', () => {
  afterEach(() => mockDb.reset());

  it('does not create a registration before OTP verification', async () => {
    const payload = {
      fullName: 'OTP User',
      phone: '0966666666',
      password: '123456',
    };
    const requested = await mockDb.requestRegistrationOtp(payload);
    expect((await mockDb.list('users')).some((user) => user.phone === payload.phone)).toBe(false);

    const session = await mockDb.verifyRegistrationOtp(payload.phone, requested.debugOtp);
    expect(session.user.phone).toBe(payload.phone);
    expect(session.user.phoneVerified).toBe(true);
    expect(session.user.email).toBeUndefined();
  });

  it('resets a password through SMS using the phone number', async () => {
    const requested = await mockDb.requestPasswordReset('0911111111');
    await mockDb.resetPassword('0911111111', requested.debugOtp, 'new-password');
    const session = await mockDb.login('0911111111', 'new-password');
    expect(session.user.phone).toBe('0911111111');
  });

  it('does not change the verified login phone through mock profile updates', async () => {
    const updated = await mockDb.updateProfile('user-customer', {
      fullName: 'Updated User',
      phone: '0999999999',
    });
    expect(updated.fullName).toBe('Updated User');
    expect(updated.phone).toBe('0911111111');
  });

  it('rejects inactive users at login', async () => {
    const users = await mockDb.list('users');
    await mockDb.updateUser('user-3', { ...users.find((user) => user.id === 'user-3'), status: 'inactive' });

    await expect(mockDb.login('nam.tran@example.com', '123456')).rejects.toThrow();
  });
});

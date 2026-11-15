import { afterEach, describe, expect, it } from 'vitest';
import { mockDb } from './mockDb';

describe('mock phone authentication', () => {
  afterEach(() => mockDb.reset());

  it('registers a phone account at once, without OTP, and lets it log in', async () => {
    const payload = { fullName: 'Direct User', phone: '+84 966 666 666', password: '123456' };

    const registered = await mockDb.register(payload);

    expect(registered.token).toBeUndefined();
    expect(registered.user).toMatchObject({ phone: '0966666666', authProvider: 'phone', phoneVerified: false });
    expect(registered.user.password).toBeUndefined();
    expect(registered.user.email).toBeUndefined();
    const session = await mockDb.login('0966666666', '123456');
    expect(session.user.fullName).toBe('Direct User');
    await expect(mockDb.register(payload)).rejects.toThrow();
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

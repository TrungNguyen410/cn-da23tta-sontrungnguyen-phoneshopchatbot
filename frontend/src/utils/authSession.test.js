import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from './constants';
import { clearAuthSession, persistAuthSession, safeInternalRedirect } from './authSession';
import { storage } from './storage';

describe('authSession', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('accepts only same-origin application paths', () => {
    expect(safeInternalRedirect('/checkout?step=payment', '/')).toBe('/checkout?step=payment');
    expect(safeInternalRedirect('//evil.example', '/')).toBe('/');
    expect(safeInternalRedirect('https://evil.example', '/')).toBe('/');
  });

  it('stores both access and refresh tokens', () => {
    persistAuthSession({ token: 'access', refreshToken: 'refresh', user: { id: 'u1' } });

    expect(storage.get(STORAGE_KEYS.token)).toBe('access');
    expect(storage.get(STORAGE_KEYS.refreshToken)).toBe('refresh');
    expect(storage.get(STORAGE_KEYS.currentUser)).toEqual({ id: 'u1' });
  });

  it('clears the complete persisted session', () => {
    persistAuthSession({ token: 'access', refreshToken: 'refresh', user: { id: 'u1' } });

    clearAuthSession();

    expect(storage.get(STORAGE_KEYS.token)).toBeNull();
    expect(storage.get(STORAGE_KEYS.refreshToken)).toBeNull();
    expect(storage.get(STORAGE_KEYS.currentUser)).toBeNull();
  });
});

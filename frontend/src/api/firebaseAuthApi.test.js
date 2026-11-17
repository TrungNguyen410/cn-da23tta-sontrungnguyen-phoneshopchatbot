import { afterEach, describe, expect, it, vi } from 'vitest';

const firebase = vi.hoisted(() => {
  const auth = { languageCode: '' };
  class GoogleAuthProvider {
    constructor() {
      this.providerId = 'google.com';
      this.customParameters = {};
    }

    setCustomParameters(parameters) {
      this.customParameters = parameters;
    }
  }
  class FacebookAuthProvider {
    static credentialFromError(error) {
      return error?.pendingCredential || null;
    }

    constructor() {
      this.providerId = 'facebook.com';
      this.scopes = [];
    }

    addScope(scope) {
      this.scopes.push(scope);
    }
  }
  return {
    auth,
    initializeApp: vi.fn(() => ({ name: 'app' })),
    initializeAuth: vi.fn(() => auth),
    signInWithPopup: vi.fn(),
    signOut: vi.fn(() => Promise.resolve()),
    linkWithCredential: vi.fn(() => Promise.resolve()),
    GoogleAuthProvider,
    FacebookAuthProvider,
  };
});

vi.mock('firebase/app', () => ({ initializeApp: firebase.initializeApp }));
vi.mock('firebase/auth', () => ({
  initializeAuth: firebase.initializeAuth,
  inMemoryPersistence: 'in-memory',
  browserPopupRedirectResolver: 'popup-resolver',
  signInWithPopup: firebase.signInWithPopup,
  signOut: firebase.signOut,
  linkWithCredential: firebase.linkWithCredential,
  GoogleAuthProvider: firebase.GoogleAuthProvider,
  FacebookAuthProvider: firebase.FacebookAuthProvider,
}));

const { firebaseErrorMessage, signInWithProvider } = await import('./firebaseAuthApi');

describe('Firebase Google/Facebook sign-in', () => {
  afterEach(() => vi.clearAllMocks());

  it('opens the Google popup, returns the ID token and drops the Firebase session', async () => {
    firebase.signInWithPopup.mockResolvedValue({ user: { getIdToken: () => Promise.resolve('google-id-token') } });

    await expect(signInWithProvider('google')).resolves.toBe('google-id-token');

    const [auth, provider] = firebase.signInWithPopup.mock.calls[0];
    expect(auth).toBe(firebase.auth);
    expect(provider.providerId).toBe('google.com');
    expect(provider.customParameters).toEqual({ prompt: 'select_account' });
    expect(firebase.signOut).toHaveBeenCalledWith(firebase.auth);
    expect(firebase.auth.languageCode).toBe('vi');
    // In-memory session; initializeAuth has no popup support without the resolver.
    expect(firebase.initializeAuth).toHaveBeenCalledWith(
      { name: 'app' },
      { persistence: 'in-memory', popupRedirectResolver: 'popup-resolver' },
    );
  });

  it('reuses the Firebase app on later sign-ins', async () => {
    firebase.signInWithPopup.mockResolvedValue({ user: { getIdToken: () => Promise.resolve('token') } });
    await signInWithProvider('google');

    expect(firebase.initializeApp).not.toHaveBeenCalled();
    expect(firebase.initializeAuth).not.toHaveBeenCalled();
  });

  it('asks Facebook for the email address and public profile', async () => {
    firebase.signInWithPopup.mockResolvedValue({ user: { getIdToken: () => Promise.resolve('facebook-id-token') } });

    await expect(signInWithProvider('facebook')).resolves.toBe('facebook-id-token');
    expect(firebase.signInWithPopup.mock.calls[0][1]).toMatchObject({ providerId: 'facebook.com', scopes: ['email', 'public_profile'] });
  });

  it('marks a closed popup as cancelled and translates real errors', async () => {
    firebase.signInWithPopup.mockRejectedValueOnce({ code: 'auth/popup-closed-by-user' });
    await expect(signInWithProvider('google')).rejects.toMatchObject({ cancelled: true });

    firebase.signInWithPopup.mockRejectedValueOnce({ code: 'auth/unauthorized-domain' });
    await expect(signInWithProvider('facebook')).rejects.toMatchObject({
      cancelled: false,
      friendlyMessage: expect.stringMatching(/Authorized domains/),
    });
    expect(firebase.signOut).toHaveBeenCalledTimes(2);

    expect(firebaseErrorMessage({ code: 'auth/unauthorized-domain' })).toMatch(/Authorized domains/);
    expect(firebaseErrorMessage({ code: 'auth/something-new' })).toBe('Không đăng nhập được (auth/something-new).');
  });

  it('keeps the Facebook credential when the email already uses Google, then links it after Google sign-in', async () => {
    const pendingCredential = { providerId: 'facebook.com' };
    firebase.signInWithPopup.mockRejectedValueOnce({
      code: 'auth/account-exists-with-different-credential',
      customData: { email: 'khach@gmail.com' },
      pendingCredential,
    });

    const error = await signInWithProvider('facebook').catch((caught) => caught);
    expect(error).toMatchObject({
      code: 'auth/account-exists-with-different-credential',
      cancelled: false,
      pendingCredential,
      pendingProvider: 'facebook',
      existingProvider: 'google',
      email: 'khach@gmail.com',
    });
    expect(error.friendlyMessage).toMatch(/khach@gmail.com đã được dùng để đăng nhập bằng Google/);

    const user = { getIdToken: () => Promise.resolve('linked-id-token') };
    firebase.signInWithPopup.mockResolvedValueOnce({ user });
    await expect(signInWithProvider('google', { link: error })).resolves.toBe('linked-id-token');

    expect(firebase.signInWithPopup.mock.calls[1][1].customParameters).toEqual({
      prompt: 'select_account',
      login_hint: 'khach@gmail.com',
    });
    expect(firebase.linkWithCredential).toHaveBeenCalledWith(user, pendingCredential);
  });

  it('still signs in when linking the pending credential fails', async () => {
    firebase.linkWithCredential.mockRejectedValueOnce({ code: 'auth/credential-already-in-use' });
    firebase.signInWithPopup.mockResolvedValueOnce({ user: { getIdToken: () => Promise.resolve('google-token') } });

    await expect(signInWithProvider('google', { link: { pendingCredential: {}, email: '' } })).resolves.toBe('google-token');
  });
});

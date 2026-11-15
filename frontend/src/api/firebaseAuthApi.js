import { runtimeConfig } from '../utils/runtimeConfig';

// Firebase only proves who the Google/Facebook user is. Our backend trades the Firebase ID token for its
// own session, so the Firebase session lives in memory and is signed out right after the token is read.

const FIREBASE_ERRORS = {
  'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ đăng nhập.',
  'auth/cancelled-popup-request': 'Bạn đã đóng cửa sổ đăng nhập.',
  'auth/user-cancelled': 'Bạn đã từ chối cấp quyền đăng nhập.',
  'auth/popup-blocked': 'Trình duyệt đã chặn cửa sổ đăng nhập. Hãy cho phép cửa sổ bật lên rồi thử lại.',
  'auth/account-exists-with-different-credential':
    'Email này đã đăng nhập bằng cách khác (Google hoặc Facebook). Hãy chọn đúng cách bạn đã dùng lần đầu.',
  'auth/operation-not-allowed': 'Firebase chưa bật cách đăng nhập này: hãy bật Google/Facebook trong Sign-in method.',
  'auth/unauthorized-domain': 'Tên miền này chưa được thêm vào Authorized domains của Firebase.',
  'auth/invalid-credential': 'Thông tin đăng nhập từ Google/Facebook không hợp lệ. Vui lòng thử lại.',
  'auth/user-disabled': 'Tài khoản này đã bị vô hiệu hóa trên Firebase.',
  'auth/too-many-requests': 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ít phút.',
  'auth/network-request-failed': 'Không kết nối được dịch vụ đăng nhập. Vui lòng kiểm tra mạng.',
  'auth/web-storage-unsupported': 'Trình duyệt đang chặn bộ nhớ trang (cookie). Hãy tắt chế độ chặn rồi thử lại.',
};

// Closing the popup is a choice, not a failure: callers stay quiet for these.
export const CANCELLED_CODES = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled'];

export const firebaseErrorMessage = (error) => {
  if (FIREBASE_ERRORS[error?.code]) return FIREBASE_ERRORS[error.code];
  if (error?.code) return `Không đăng nhập được (${error.code}).`;
  return 'Không đăng nhập được. Vui lòng thử lại.';
};

const friendlyError = (error) => {
  const wrapped = new Error(firebaseErrorMessage(error));
  wrapped.friendlyMessage = wrapped.message;
  wrapped.code = error?.code;
  wrapped.cancelled = CANCELLED_CODES.includes(error?.code);
  return wrapped;
};

let firebasePromise = null;

// The SDK is fetched on first use (sign-in pages preload it), so other pages never download it.
export const loadFirebase = () => {
  firebasePromise ||= Promise.all([import('firebase/app'), import('firebase/auth')])
    .then(([appModule, authModule]) => {
      const app = appModule.initializeApp(runtimeConfig.firebase);
      // initializeAuth has no popup support unless the resolver is passed in.
      const auth = authModule.initializeAuth(app, {
        persistence: authModule.inMemoryPersistence,
        popupRedirectResolver: authModule.browserPopupRedirectResolver,
      });
      auth.languageCode = 'vi';
      return { auth, authModule };
    })
    .catch((error) => {
      firebasePromise = null;
      throw error;
    });
  return firebasePromise;
};

const createProvider = (authModule, provider) => {
  if (provider === 'google') {
    const google = new authModule.GoogleAuthProvider();
    google.setCustomParameters({ prompt: 'select_account' });
    return google;
  }
  if (provider === 'facebook') {
    const facebook = new authModule.FacebookAuthProvider();
    facebook.addScope('email');
    return facebook;
  }
  throw new Error(`Unknown sign-in provider: ${provider}`);
};

// Opens the Google/Facebook popup and returns the Firebase ID token our backend verifies.
export const signInWithProvider = async (provider) => {
  let firebase;
  try {
    firebase = await loadFirebase();
  } catch (error) {
    throw friendlyError(error);
  }
  const { auth, authModule } = firebase;
  try {
    const credential = await authModule.signInWithPopup(auth, createProvider(authModule, provider));
    return await credential.user.getIdToken();
  } catch (error) {
    throw friendlyError(error);
  } finally {
    await authModule.signOut(auth).catch(() => {});
  }
};

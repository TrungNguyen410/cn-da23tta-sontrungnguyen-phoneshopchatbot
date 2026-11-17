import { useEffect, useState } from 'react';
import { FaFacebook } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { toast } from 'react-toastify';
import { ACCOUNT_EXISTS_CODE, loadFirebase, signInWithProvider } from '../../api/firebaseAuthApi';
import { useAuth } from '../../hooks/useAuth';
import { runtimeConfig } from '../../utils/runtimeConfig';

const PROVIDER_LABELS = { google: 'Google', facebook: 'Facebook' };

const PROVIDERS = [
  { id: 'google', label: 'Google', Icon: FcGoogle },
  { id: 'facebook', label: 'Facebook', Icon: FaFacebook },
];

// Google/Facebook sign-in through Firebase. Hidden in mock mode or when Firebase is not configured.
export default function SocialLoginButtons({ onSignedIn, disabled = false }) {
  const { loginWithSocial } = useAuth();
  const [pending, setPending] = useState('');
  // Set when Facebook/Google says the email already belongs to the other provider.
  const [linkRequest, setLinkRequest] = useState(null);

  // Download the SDK early: the popup must open right inside the click, or the browser blocks it.
  useEffect(() => {
    if (runtimeConfig.socialLogin) loadFirebase().catch(() => {});
  }, []);

  if (!runtimeConfig.socialLogin) return null;

  const signIn = async (provider) => {
    if (pending) return;
    setPending(provider);
    // Only the provider the account already uses can finish a pending link.
    const link = linkRequest?.existingProvider === provider ? linkRequest : null;
    try {
      const idToken = await signInWithProvider(provider, { link });
      const session = await loginWithSocial(idToken);
      setLinkRequest(null);
      if (link) toast.success(`Đã gộp ${PROVIDER_LABELS[link.pendingProvider]} vào tài khoản của bạn`);
      onSignedIn?.(session);
    } catch (error) {
      if (error.code === ACCOUNT_EXISTS_CODE && error.existingProvider) {
        setLinkRequest(error);
      } else if (!error.cancelled) {
        toast.error(error.friendlyMessage || error.message);
      }
    } finally {
      setPending('');
    }
  };

  return (
    <div className="social-login">
      <div className="social-login-divider"><span>hoặc</span></div>
      {linkRequest && (
        <div className="social-login-link-notice" role="alert">
          <p>{linkRequest.friendlyMessage}</p>
          <button type="button" className="social-login-link-cancel" onClick={() => setLinkRequest(null)}>Bỏ qua</button>
        </div>
      )}
      <div className="social-login-buttons">
        {PROVIDERS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`social-login-button social-login-${id}${linkRequest?.existingProvider === id ? ' is-suggested' : ''}`}
            onClick={() => signIn(id)}
            disabled={disabled || Boolean(pending)}
            aria-label={`Tiếp tục với ${label}`}
          >
            <Icon aria-hidden="true" />
            <span>{pending === id ? 'Đang kết nối…' : label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

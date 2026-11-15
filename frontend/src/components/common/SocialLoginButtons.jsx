import { useEffect, useState } from 'react';
import { FaFacebook } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { toast } from 'react-toastify';
import { loadFirebase, signInWithProvider } from '../../api/firebaseAuthApi';
import { useAuth } from '../../hooks/useAuth';
import { runtimeConfig } from '../../utils/runtimeConfig';

const PROVIDERS = [
  { id: 'google', label: 'Google', Icon: FcGoogle },
  { id: 'facebook', label: 'Facebook', Icon: FaFacebook },
];

// Google/Facebook sign-in through Firebase. Hidden in mock mode or when Firebase is not configured.
export default function SocialLoginButtons({ onSignedIn, disabled = false }) {
  const { loginWithSocial } = useAuth();
  const [pending, setPending] = useState('');

  // Download the SDK early: the popup must open right inside the click, or the browser blocks it.
  useEffect(() => {
    if (runtimeConfig.socialLogin) loadFirebase().catch(() => {});
  }, []);

  if (!runtimeConfig.socialLogin) return null;

  const signIn = async (provider) => {
    if (pending) return;
    setPending(provider);
    try {
      const idToken = await signInWithProvider(provider);
      const session = await loginWithSocial(idToken);
      onSignedIn?.(session);
    } catch (error) {
      if (!error.cancelled) toast.error(error.friendlyMessage || error.message);
    } finally {
      setPending('');
    }
  };

  return (
    <div className="social-login">
      <div className="social-login-divider"><span>hoặc</span></div>
      <div className="social-login-buttons">
        {PROVIDERS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`social-login-button social-login-${id}`}
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

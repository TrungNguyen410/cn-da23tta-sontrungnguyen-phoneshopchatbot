import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/authApi';
import { clearAuthSession, persistAuthSession } from '../utils/authSession';
import { STORAGE_KEYS } from '../utils/constants';
import { storage } from '../utils/storage';
import { mergeWishlists, normalizeWishlist, wishlistEquals } from '../utils/wishlist';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => storage.get(STORAGE_KEYS.currentUser));
  const [token, setToken] = useState(() => storage.get(STORAGE_KEYS.token));
  const [loading, setLoading] = useState(Boolean(token));

  const persistSession = useCallback((session) => {
    setToken(session.token);
    setUser(session.user);
    return persistAuthSession(session);
  }, []);

  const logout = useCallback(() => {
    const refreshToken = storage.get(STORAGE_KEYS.refreshToken);
    setToken(null);
    setUser(null);
    clearAuthSession();
    if (refreshToken) void authApi.logout(refreshToken).catch(() => {});
  }, []);

  const mergeLocalWishlist = useCallback(async (session) => {
    const localItems = storage.get(STORAGE_KEYS.wishlist, []);
    const remoteItems = session.user.wishlist || [];
    const mergedItems = mergeWishlists(remoteItems, localItems);
    try {
      const wishlist = wishlistEquals(mergedItems, remoteItems)
        ? remoteItems
        : await authApi.updateWishlist(session.user.id, mergedItems);
      const nextSession = { ...session, user: { ...session.user, wishlist } };
      setUser(nextSession.user);
      storage.set(STORAGE_KEYS.currentUser, nextSession.user);
      storage.set(STORAGE_KEYS.wishlist, wishlist);
      window.dispatchEvent(new CustomEvent('wishlist-updated'));
      return nextSession;
    } catch {
      storage.set(STORAGE_KEYS.wishlist, mergedItems);
      return session;
    }
  }, []);

  const loadCurrentUser = useCallback(async () => {
    const persistedUser = storage.get(STORAGE_KEYS.currentUser);
    if (!token || !persistedUser) {
      setLoading(false);
      return null;
    }
    try {
      const currentUser = await authApi.me(persistedUser);
      const session = { token, user: currentUser };
      setUser(currentUser);
      storage.set(STORAGE_KEYS.currentUser, currentUser);
      return mergeLocalWishlist(session);
    } catch {
      logout();
      return null;
    } finally {
      setLoading(false);
    }
  }, [logout, mergeLocalWishlist, token]);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  const login = useCallback(async (credentials) => {
    const session = persistSession(await authApi.login(credentials));
    return mergeLocalWishlist(session);
  }, [mergeLocalWishlist, persistSession]);
  const requestRegistrationOtp = useCallback((payload) => authApi.requestRegistrationOtp(payload), []);
  const verifyRegistrationOtp = useCallback(
    async (payload) => {
      const session = persistSession(await authApi.verifyRegistrationOtp(payload));
      return mergeLocalWishlist(session);
    },
    [mergeLocalWishlist, persistSession],
  );

  const updateProfile = useCallback(
    async (payload) => {
      const updatedUser = await authApi.updateProfile(user.id, payload);
      setUser(updatedUser);
      storage.set(STORAGE_KEYS.currentUser, updatedUser);
      return updatedUser;
    },
    [user],
  );

  const changePassword = useCallback(
    (payload) => authApi.changePassword(user.id, payload),
    [user],
  );

  const setWishlist = useCallback(async (items) => {
    const nextItems = normalizeWishlist(items);
    if (!user) {
      storage.set(STORAGE_KEYS.wishlist, nextItems);
      window.dispatchEvent(new CustomEvent('wishlist-updated'));
      return nextItems;
    }
    const savedItems = await authApi.updateWishlist(user.id, nextItems);
    const nextUser = { ...user, wishlist: savedItems };
    setUser(nextUser);
    storage.set(STORAGE_KEYS.currentUser, nextUser);
    storage.set(STORAGE_KEYS.wishlist, savedItems);
    window.dispatchEvent(new CustomEvent('wishlist-updated'));
    return savedItems;
  }, [user]);

  const toggleWishlist = useCallback(async (id) => {
    const current = user?.wishlist || storage.get(STORAGE_KEYS.wishlist, []);
    return setWishlist(current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }, [setWishlist, user?.wishlist]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user && token),
      isAdmin: user?.role === 'admin',
      login,
      requestRegistrationOtp,
      verifyRegistrationOtp,
      logout,
      updateProfile,
      changePassword,
      toggleWishlist,
      setWishlist,
      loadCurrentUser,
    }),
    [changePassword, loadCurrentUser, loading, login, logout, requestRegistrationOtp, setWishlist, token, toggleWishlist, updateProfile, user, verifyRegistrationOtp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

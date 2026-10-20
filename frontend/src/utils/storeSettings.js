import { STORAGE_KEYS } from './constants';
import { storage } from './storage';

export const DEFAULT_STORE_SETTINGS = {
  storeName: 'TechPhone',
  hotline: '1900 6868',
  email: 'support@techphone.vn',
  address: '123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
  logo: '',
  facebook: 'https://facebook.com/techphone',
  instagram: 'https://instagram.com/techphone',
  youtube: 'https://youtube.com/@techphone',
  zaloUrl: '',
};

export const STORE_SETTINGS_EVENT = 'store-settings-updated';

export const normalizeSettings = (settings) => {
  const values = Array.isArray(settings)
    ? Object.fromEntries(
        settings
          .filter((setting) => setting?.key)
          .map((setting) => [setting.key, setting.value]),
      )
    : settings || {};
  return {
    ...DEFAULT_STORE_SETTINGS,
    ...values,
  };
};

export const getStoreSettings = () => ({
  ...normalizeSettings(storage.get(STORAGE_KEYS.mockSettings, {})),
});

export const saveStoreSettings = (settings) => {
  const normalized = normalizeSettings(settings);
  storage.set(STORAGE_KEYS.mockSettings, normalized);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STORE_SETTINGS_EVENT, { detail: normalized }));
  }
  return normalized;
};

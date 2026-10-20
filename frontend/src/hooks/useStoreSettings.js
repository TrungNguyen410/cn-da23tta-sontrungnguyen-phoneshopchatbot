import { useEffect, useState } from 'react';
import { settingsApi } from '../api/settingsApi';
import {
  getStoreSettings,
  saveStoreSettings,
  STORE_SETTINGS_EVENT,
} from '../utils/storeSettings';

export function useStoreSettings() {
  const [settings, setSettings] = useState(getStoreSettings);

  useEffect(() => {
    const refresh = () => setSettings(getStoreSettings());
    let active = true;
    settingsApi.getPublic()
      .then((nextSettings) => {
        if (active) setSettings(saveStoreSettings(nextSettings));
      })
      .catch(() => {});
    window.addEventListener(STORE_SETTINGS_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      active = false;
      window.removeEventListener(STORE_SETTINGS_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return settings;
}

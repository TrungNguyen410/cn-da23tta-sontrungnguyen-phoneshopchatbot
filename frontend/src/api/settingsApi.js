import { USE_MOCK } from '../utils/constants';
import {
  getStoreSettings,
  normalizeSettings,
  saveStoreSettings,
} from '../utils/storeSettings';
import axiosClient from './axiosClient';

const settingMetadata = {
  storeName: { group: 'general', label: 'Store name' },
  hotline: { group: 'general', label: 'Hotline' },
  email: { group: 'general', label: 'Support email' },
  address: { group: 'general', label: 'Store address' },
  logo: { group: 'general', label: 'Store logo' },
  facebook: { group: 'social', label: 'Facebook URL' },
  instagram: { group: 'social', label: 'Instagram URL' },
  youtube: { group: 'social', label: 'YouTube URL' },
  zaloUrl: { group: 'social', label: 'Zalo URL' },
};

export const settingsApi = {
  async getPublic() {
    if (USE_MOCK) return getStoreSettings();
    return normalizeSettings(await axiosClient.get('/settings'));
  },

  async saveAll(settings) {
    if (USE_MOCK) return saveStoreSettings(settings);

    const existing = await axiosClient.get('/admin/settings');
    const byKey = new Map(existing.map((setting) => [setting.key, setting]));
    const saved = [];
    for (const [key, value] of Object.entries(settings)) {
      const current = byKey.get(key);
      if (current) {
        saved.push(await axiosClient.put(`/admin/settings/${current.id}`, { value }));
      } else {
        saved.push(await axiosClient.post('/admin/settings', {
          key,
          value,
          ...(settingMetadata[key] || { group: 'general', label: key }),
        }));
      }
    }
    return saveStoreSettings(normalizeSettings(saved));
  },
};

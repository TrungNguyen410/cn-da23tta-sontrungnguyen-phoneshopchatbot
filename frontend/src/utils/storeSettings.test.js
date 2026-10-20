import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_STORE_SETTINGS,
  getStoreSettings,
  normalizeSettings,
  saveStoreSettings,
} from './storeSettings';
import { STORAGE_KEYS } from './constants';

describe('store settings', () => {
  beforeEach(() => localStorage.clear());

  it('normalizes API setting documents over the defaults', () => {
    expect(normalizeSettings([
      { id: 'setting-1', key: 'storeName', value: 'Phone Lab' },
      { id: 'setting-2', key: 'hotline', value: '1900 0000' },
    ])).toMatchObject({
      ...DEFAULT_STORE_SETTINGS,
      storeName: 'Phone Lab',
      hotline: '1900 0000',
    });
  });

  it('accepts an already-normalized settings object and caches saved values', () => {
    const settings = normalizeSettings({ storeName: 'Phone Lab', hotline: '1800 1111' });
    saveStoreSettings(settings);

    expect(getStoreSettings()).toMatchObject(settings);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.mockSettings))).toMatchObject(settings);
  });
});

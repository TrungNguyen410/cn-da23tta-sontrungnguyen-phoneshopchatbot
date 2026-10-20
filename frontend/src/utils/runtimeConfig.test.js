import { describe, expect, it } from 'vitest';
import { createRuntimeConfig } from './runtimeConfig';

describe('createRuntimeConfig', () => {
  it('enables mock mode only for the exact string true', () => {
    expect(createRuntimeConfig({ VITE_USE_MOCK: 'true' }).useMock).toBe(true);
    expect(createRuntimeConfig({ VITE_USE_MOCK: 'false' }).useMock).toBe(false);
    expect(createRuntimeConfig({}).useMock).toBe(false);
  });

  it('requires an API URL for a production API build', () => {
    expect(() => createRuntimeConfig({ PROD: true, VITE_USE_MOCK: 'false' }))
      .toThrow('VITE_API_URL');
  });

  it('does not require an API URL for a production mock build', () => {
    expect(createRuntimeConfig({
      PROD: true,
      VITE_USE_MOCK: 'true',
      VITE_SITE_URL: 'https://shop.techphone.example',
    }).apiUrl).toBe('');
  });

  it('requires an absolute site URL instead of localhost fallback in production', () => {
    expect(() => createRuntimeConfig({
      PROD: true,
      VITE_USE_MOCK: 'false',
      VITE_API_URL: 'https://api.techphone.example/api',
      VITE_SITE_URL: '',
    })).toThrow('VITE_SITE_URL');

    expect(() => createRuntimeConfig({
      PROD: true,
      VITE_USE_MOCK: 'false',
      VITE_API_URL: '/api',
      VITE_SITE_URL: 'https://shop.techphone.example',
    })).toThrow('VITE_API_URL');
  });

  it('normalizes configured production URLs', () => {
    const config = createRuntimeConfig({
      PROD: true,
      VITE_USE_MOCK: 'false',
      VITE_API_URL: 'https://api.techphone.example/api/',
      VITE_SITE_URL: 'https://shop.techphone.example///',
    });

    expect(config.apiUrl).toBe('https://api.techphone.example/api');
    expect(config.siteUrl).toBe('https://shop.techphone.example');
  });

  it('defaults production to Render and rejects loopback canonical or API URLs', () => {
    expect(() => createRuntimeConfig({
      PROD: true,
      VITE_USE_MOCK: 'false',
      VITE_API_URL: 'http://127.0.0.2:5000/api',
      VITE_SITE_URL: 'https://shop.techphone.example',
    })).toThrow(/VITE_API_URL.*loopback/i);

    expect(() => createRuntimeConfig({
      PROD: true,
      VITE_USE_MOCK: 'false',
      VITE_API_URL: 'https://api.techphone.example/api',
      VITE_SITE_URL: 'http://localhost:3000',
    })).toThrow(/VITE_SITE_URL.*loopback/i);
  });

  it.each([
    'http://localhost.:5000/api',
    'http://[::ffff:127.0.0.1]:5000/api',
    'http://[::ffff:7f00:2]:5000/api',
  ])('rejects normalized loopback API forms on Render: %s', (apiUrl) => {
    expect(() => createRuntimeConfig({
      PROD: true,
      VITE_DEPLOYMENT_TARGET: 'render',
      VITE_USE_MOCK: 'false',
      VITE_API_URL: apiUrl,
      VITE_SITE_URL: 'https://shop.techphone.example',
    })).toThrow(/VITE_API_URL.*loopback/i);
  });

  it('allows intentional localhost URLs only for the Docker production target', () => {
    const config = createRuntimeConfig({
      PROD: true,
      VITE_DEPLOYMENT_TARGET: '  DOCKER ',
      VITE_USE_MOCK: 'false',
      VITE_API_URL: 'http://localhost:5000/api',
      VITE_SITE_URL: 'http://localhost:3000/',
    });

    expect(config.deploymentTarget).toBe('docker');
    expect(config.apiUrl).toBe('http://localhost:5000/api');
    expect(config.siteUrl).toBe('http://localhost:3000');
  });

  it('allows an explicit local-preview target for a local production build', () => {
    const config = createRuntimeConfig({
      PROD: true,
      VITE_DEPLOYMENT_TARGET: 'local-preview',
      VITE_USE_MOCK: 'true',
      VITE_SITE_URL: 'http://localhost:5173',
    });

    expect(config.deploymentTarget).toBe('local-preview');
    expect(config.siteUrl).toBe('http://localhost:5173');
  });

  it('rejects unknown and local deployment targets in production', () => {
    const baseEnv = {
      PROD: true,
      VITE_USE_MOCK: 'false',
      VITE_API_URL: 'https://api.techphone.example/api',
      VITE_SITE_URL: 'https://shop.techphone.example',
    };

    expect(() => createRuntimeConfig({
      ...baseEnv,
      VITE_DEPLOYMENT_TARGET: 'rendr',
    })).toThrow(/VITE_DEPLOYMENT_TARGET.*rendr.*not supported/i);
    expect(() => createRuntimeConfig({
      ...baseEnv,
      VITE_DEPLOYMENT_TARGET: 'local',
    })).toThrow(/VITE_DEPLOYMENT_TARGET.*local.*production/i);
  });

  it('requires the canonical site URL to be an origin', () => {
    expect(() => createRuntimeConfig({
      PROD: true,
      VITE_DEPLOYMENT_TARGET: 'render',
      VITE_USE_MOCK: 'false',
      VITE_API_URL: 'https://api.techphone.example/api',
      VITE_SITE_URL: 'https://shop.techphone.example/storefront',
    })).toThrow(/VITE_SITE_URL.*origin/i);
  });
});

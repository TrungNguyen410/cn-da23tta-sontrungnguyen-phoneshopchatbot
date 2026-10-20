import { normalizeDeploymentTarget, normalizePublicUrl } from './deploymentConfig';

export const createRuntimeConfig = (env = {}) => {
  const useMock = env.VITE_USE_MOCK === 'true';
  const production = Boolean(env.PROD);
  const deploymentTarget = normalizeDeploymentTarget(env, production);
  const normalizationOptions = { production, deploymentTarget };
  const apiUrl = normalizePublicUrl(
    'VITE_API_URL',
    env.VITE_API_URL,
    {
      ...normalizationOptions,
      fallback: production ? '' : 'http://localhost:5000/api',
    },
  );
  const siteUrl = normalizePublicUrl(
    'VITE_SITE_URL',
    env.VITE_SITE_URL,
    {
      ...normalizationOptions,
      fallback: production ? '' : 'http://localhost:5173',
      originOnly: true,
    },
  );

  if (production && !useMock && !apiUrl) {
    throw new Error('VITE_API_URL is required when VITE_USE_MOCK is false in production');
  }
  if (production && !siteUrl) {
    throw new Error('VITE_SITE_URL is required in production');
  }

  return {
    useMock,
    deploymentTarget,
    apiUrl,
    siteUrl,
    cloudinary: {
      cloudName: env.VITE_CLOUDINARY_CLOUD_NAME || '',
      uploadPreset: env.VITE_CLOUDINARY_UPLOAD_PRESET || '',
    },
  };
};

export const runtimeConfig = createRuntimeConfig(import.meta.env);

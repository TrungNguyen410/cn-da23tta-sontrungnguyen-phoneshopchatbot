import process from 'node:process';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createSiteMetadataAssets } from './scripts/generate-site-metadata.mjs';
import { normalizeDeploymentTarget, normalizePublicUrl } from './src/utils/deploymentConfig.js';

export default defineConfig(({ command, mode }) => {
  const production = command === 'build';
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const deploymentTarget = normalizeDeploymentTarget(env, production);
  const options = { production, deploymentTarget };
  const siteUrl = normalizePublicUrl('VITE_SITE_URL', env.VITE_SITE_URL, {
    ...options,
    fallback: production ? '' : 'http://localhost:5173',
    originOnly: true,
  });
  const apiUrl = normalizePublicUrl('VITE_API_URL', env.VITE_API_URL, options);
  const useMock = env.VITE_USE_MOCK === 'true';

  if (production && !siteUrl) throw new Error('VITE_SITE_URL is required in production');
  if (production && !useMock && !apiUrl) throw new Error('VITE_API_URL is required in production');

  const metadata = production
    ? createSiteMetadataAssets({ siteUrl, deploymentTarget })
    : null;

  return {
    plugins: [
      {
        name: 'techphone-site-metadata',
        enforce: 'pre',
        transformIndexHtml: (html) => html.replaceAll('%VITE_SITE_URL%', siteUrl),
        generateBundle() {
          if (!metadata) return;
          this.emitFile({ type: 'asset', fileName: 'robots.txt', source: metadata.robots });
          this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: metadata.sitemap });
        },
      },
      react(),
    ],
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
    },
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'react-vendor',
                test: /node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/,
              },
              {
                name: 'chart-vendor',
                test: /node_modules[\\/](chart\.js|react-chartjs-2)[\\/]/,
              },
              {
                name: 'ui-vendor',
                test: /node_modules[\\/](bootstrap|react-icons|react-toastify)[\\/]/,
              },
            ],
          },
        },
      },
    },
    server: {
      port: 5173,
      host: true,
    },
    preview: {
      port: 5173,
      host: true,
    },
  };
});

import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { normalizeDeploymentTarget, normalizePublicUrl } from '../src/utils/deploymentConfig.js';

export const normalizeSiteUrl = (value = '', deploymentTarget = 'render') => {
  const origin = normalizePublicUrl(
    'VITE_SITE_URL',
    value,
    { production: true, deploymentTarget, originOnly: true },
  );
  if (!origin) throw new Error('VITE_SITE_URL is required for a production build');
  return origin;
};

export const staticRoutes = [
  '/', '/products', '/accessories', '/compare', '/reviews',
  '/contact', '/order-lookup', '/policies/warranty', '/policies/returns',
  '/policies/shipping', '/policies/payment',
];

const routeEntries = staticRoutes.map((route) => `  <url><loc>{{origin}}${route}</loc></url>`).join('\n');

export const createSiteMetadataAssets = ({ siteUrl, deploymentTarget = 'render' } = {}) => {
  const target = normalizeDeploymentTarget(
    { VITE_DEPLOYMENT_TARGET: deploymentTarget },
    true,
  );
  const origin = normalizeSiteUrl(siteUrl, target);
  const robots = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account\nDisallow: /checkout\n\nSitemap: ${origin}/sitemap.xml\n`;
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routeEntries.replaceAll('{{origin}}', origin)}\n</urlset>\n`;

  return { robots, sitemap };
};

export const generateSiteMetadata = async ({
  outputDir = resolve(dirname(fileURLToPath(import.meta.url)), '../dist'),
  siteUrl = process.env.VITE_SITE_URL || '',
  deploymentTarget = process.env.VITE_DEPLOYMENT_TARGET || 'render',
} = {}) => {
  const { robots, sitemap } = createSiteMetadataAssets({ siteUrl, deploymentTarget });

  await Promise.all([
    writeFile(resolve(outputDir, 'robots.txt'), robots),
    writeFile(resolve(outputDir, 'sitemap.xml'), sitemap),
  ]);
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await generateSiteMetadata();
}

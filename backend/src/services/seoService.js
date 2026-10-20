const env = require('../config/env');
const productRepository = require('../repositories/productRepository');

const escapeXml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

class SeoService {
  async productSitemap() {
    const products = await productRepository.findAll({ status: 'active' }, { sort: { updatedAt: -1 } });
    const baseUrl = env.publicSiteUrl.replace(/\/+$/, '');
    const urls = products.map((product) => [
      '<url>',
      `<loc>${escapeXml(`${baseUrl}/products/${product.id}`)}</loc>`,
      `<lastmod>${new Date(product.updatedAt || product.createdAt).toISOString()}</lastmod>`,
      '<changefreq>weekly</changefreq>',
      '<priority>0.8</priority>',
      '</url>',
    ].join(''));
    return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`;
  }
}

module.exports = new SeoService();

const seoService = require('../services/seoService');
const asyncHandler = require('../utils/asyncHandler');

const productSitemap = asyncHandler(async (_req, res) => {
  const sitemap = await seoService.productSitemap();
  res.type('application/xml').status(200).send(sitemap);
});

module.exports = { productSitemap };

// Official brand logos served from public/brands/ (sources listed in public/brands/SOURCES.md).
export const FEATURED_BRANDS = [
  { name: 'Apple', logo: '/brands/apple.svg' },
  { name: 'Samsung', logo: '/brands/samsung.svg' },
  { name: 'Xiaomi', logo: '/brands/xiaomi.svg' },
  { name: 'OPPO', logo: '/brands/oppo.svg' },
  { name: 'Vivo', logo: '/brands/vivo.svg' },
  { name: 'Honor', logo: '/brands/honor.svg' },
  { name: 'Realme', logo: '/brands/realme.svg' },
  { name: 'Nothing', logo: '/brands/nothing.svg' },
  { name: 'Google', logo: '/brands/google.svg' },
  { name: 'OnePlus', logo: '/brands/oneplus.svg' },
  { name: 'Asus', logo: '/brands/asus.svg' },
  { name: 'Anker', logo: '/brands/anker.svg' },
  { name: 'Baseus', logo: '/brands/baseus.png' },
  { name: 'Sony', logo: '/brands/sony.svg' },
  { name: 'JBL', logo: '/brands/jbl.svg' },
];

const sameBrand = (item, name) => String(item?.brand || '').trim().toLowerCase() === name.toLowerCase();

// Keeps only brands that currently have items and links each one to phones first, accessories otherwise.
export const brandShowcase = (products = [], accessories = []) => FEATURED_BRANDS
  .map((brand) => {
    const query = encodeURIComponent(brand.name);
    if (products.some((item) => sameBrand(item, brand.name))) return { ...brand, path: `/products?brand=${query}` };
    if (accessories.some((item) => sameBrand(item, brand.name))) return { ...brand, path: `/accessories?brand=${query}` };
    return null;
  })
  .filter(Boolean);

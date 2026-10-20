const categoryNames = ['Điện thoại', 'Tai nghe', 'Sạc', 'Đồng hồ', 'Ốp lưng', 'Pin dự phòng', 'Cáp sạc', 'Loa', 'Bảo vệ màn hình', 'Giá đỡ'];
const brandNames = ['Apple', 'Samsung', 'Xiaomi', 'OPPO', 'Vivo', 'Honor', 'Realme', 'Nothing', 'Google', 'OnePlus', 'Asus', 'Anker', 'Baseus', 'TechPhone', 'Sony', 'JBL'];
const slugify = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const mockCategories = categoryNames.map((name, index) => ({ id: `category-${index + 1}`, name, slug: slugify(name), description: '', active: true }));
export const mockBrands = brandNames.map((name, index) => ({ id: `brand-${index + 1}`, name, slug: slugify(name), logo: '', description: '', active: true }));
export const categoryIdByName = Object.fromEntries(mockCategories.map(({ name, id }) => [name, id]));
export const brandIdByName = Object.fromEntries(mockBrands.map(({ name, id }) => [name, id]));

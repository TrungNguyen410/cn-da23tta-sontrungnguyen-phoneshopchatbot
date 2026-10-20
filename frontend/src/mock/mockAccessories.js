import { makeAccessoryImage } from './imageFactory';
import { brandIdByName, categoryIdByName } from './mockTaxonomy';

const accessoryCatalog = [
  ['AirPods Pro 2 USB-C', 'Apple', 'Tai nghe', 5290000, 5990000, '#2563eb'],
  ['Galaxy Buds3 Pro', 'Samsung', 'Tai nghe', 3990000, 4690000, '#7c3aed'],
  ['Sạc nhanh GaN 65W', 'Anker', 'Sạc', 1090000, 1390000, '#0f766e'],
  ['Pin dự phòng 20.000mAh', 'Baseus', 'Pin dự phòng', 890000, 1190000, '#f97316'],
  ['Apple Watch Series 10', 'Apple', 'Đồng hồ', 9990000, 11990000, '#0ea5e9'],
  ['Galaxy Watch7', 'Samsung', 'Đồng hồ', 5990000, 6990000, '#1d4ed8'],
  ['Ốp lưng MagSafe trong suốt', 'TechPhone', 'Ốp lưng', 390000, 590000, '#14b8a6'],
  ['Cáp USB-C bện 100W', 'Anker', 'Cáp sạc', 350000, 490000, '#ef4444'],
  ['Tai nghe Sony WH-1000XM5', 'Sony', 'Tai nghe', 7490000, 8990000, '#111827'],
  ['Loa JBL Flip 6', 'JBL', 'Loa', 2590000, 3290000, '#06b6d4'],
  ['Kính cường lực Privacy', 'TechPhone', 'Bảo vệ màn hình', 250000, 350000, '#64748b'],
  ['Giá đỡ điện thoại ô tô', 'Baseus', 'Giá đỡ', 450000, 650000, '#f59e0b'],
];

export const mockAccessories = accessoryCatalog.map(
  ([name, brand, category, price, oldPrice, color], index) => {
    const image = makeAccessoryImage(name, color);
    return {
      id: `accessory-${index + 1}`,
      name,
      brand,
      category,
      brandId: brandIdByName[brand],
      categoryId: categoryIdByName[category],
      price,
      oldPrice,
      discountPercent: Math.round(((oldPrice - price) / oldPrice) * 100),
      image,
      images: [image],
      description: `${name} chính hãng, tương thích tốt, thiết kế bền đẹp và được bảo hành tại TechPhone.`,
      specifications: {
        'Thương hiệu': brand,
        'Loại phụ kiện': category,
        'Bảo hành': '12 tháng',
      },
      stock: 12 + index * 5,
      sold: 40 + index * 31,
      rating: Number((4.3 + (index % 6) / 10).toFixed(1)),
      status: 'active',
      createdAt: new Date(2026, 4, 12 - index).toISOString(),
    };
  },
);

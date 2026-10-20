import { afterEach, describe, expect, it } from 'vitest';
import { mockAccessories } from './mockAccessories';
import { mockDb } from './mockDb';
import { mockProducts } from './mockProducts';
import {
  brandIdByName,
  categoryIdByName,
  mockBrands,
  mockCategories,
} from './mockTaxonomy';

describe('mock taxonomy linkage', () => {
  afterEach(() => mockDb.reset());

  it('resolves every catalog brand and category to the shared IDs', () => {
    expect(mockCategories).toHaveLength(10);
    expect(mockBrands).toHaveLength(16);
    for (const item of [...mockProducts, ...mockAccessories]) {
      expect(item.brandId).toBe(brandIdByName[item.brand]);
      expect(item.categoryId).toBe(categoryIdByName[item.category]);
    }
  });

  it('generates taxonomy slugs in the mock save path', async () => {
    const category = await mockDb.save('categories', {
      name: 'Phụ kiện thử nghiệm',
      description: 'Danh mục mới',
      active: true,
    });
    expect(category.slug).toBe('phu-kien-thu-nghiem');
  });
});

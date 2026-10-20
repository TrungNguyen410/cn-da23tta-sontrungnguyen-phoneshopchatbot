# Carousel, Taxonomy Linkage, and Payment Methods Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an autoplaying, accessible homepage category carousel; complete Brand/Category admin management; link Product/Accessory to Brand/Category by ID with a dropdown-based admin form; and add functional `momo`/`card` payment flows end to end.

**Architecture:** Frontend-only carousel component; backend schema/service change (`brand`/`category` free-text → `brandId`/`categoryId` FK, denormalized back to display-name strings in API responses so unrelated read-only UI stays untouched); mirrored change in mock-data mode via a new shared `mockTaxonomy.js` source of truth; Checkout/OrderManagement UI extended for the two already-declared-but-unimplemented payment methods.

**Tech Stack:** React 19 + Vite (frontend), Vitest + React Testing Library (frontend tests), Express + Mongoose (backend), Jest + mongodb-memory-server (backend tests, `--runInBand`).

## Global Constraints

- Dual-mode: every data-shape change must be mirrored in `frontend/src/mock/` so `VITE_USE_MOCK=true` (the dev default) and the real backend behave identically.
- All UI copy is Vietnamese, matching existing tone (see any file already in this plan for phrasing).
- No real payment gateway integration — `momo`/`card` are UI-only simulated confirmation steps, matching how `bank` already works today.
- Backend layering must not be skipped: routes → controllers → services → repositories → models (see `CLAUDE.md`).
- `BaseRepository` already appends `isDeleted: false` and calls `.toJSON()`; do not duplicate that logic in services.
- No carousel prev/next buttons or dots (explicit scope exclusion).
- Existing consumers of `product.brand` / `product.category` as plain display strings (`ProductCard.jsx`, `ProductDetail.jsx`, `Products.jsx`, `Accessories.jsx`, `ProductFilter.jsx`, `CatalogManagement.jsx`) must keep working unmodified — the API/mock layer must keep serving `brand`/`category` as name strings, with `brandId`/`categoryId` added alongside for the admin form.

---

### Task 1: Homepage category carousel (autoplay, a11y)

**Files:**
- Create: `frontend/src/components/home/CategoryCarousel.jsx`
- Create: `frontend/src/components/home/CategoryCarousel.test.jsx`
- Modify: `frontend/src/pages/Home.jsx`

**Interfaces:**
- Produces: `export default function CategoryCarousel({ categories })` where each `categories` entry is `{ name: string, icon: ComponentType, query?: string, path?: string, color: string }` (the shape already defined by the `categories` array in `Home.jsx`).

- [ ] **Step 1: Write the component**

Create `frontend/src/components/home/CategoryCarousel.jsx`:

```jsx
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';

const AUTOPLAY_INTERVAL_MS = 3500;
const RESUME_DELAY_MS = 4000;

function usePrefersReducedMotion() {
  const getMatch = () =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [reduced, setReduced] = useState(getMatch);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event) => setReduced(event.matches);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  return reduced;
}

export default function CategoryCarousel({ categories }) {
  const trackRef = useRef(null);
  const resumeTimerRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const autoplayEnabled = !reducedMotion && categories.length > 1;

  const pause = () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    setPaused(true);
  };

  const scheduleResume = () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => setPaused(false), RESUME_DELAY_MS);
  };

  useEffect(() => {
    if (!autoplayEnabled || paused) return undefined;
    const track = trackRef.current;
    if (!track) return undefined;

    const timer = setInterval(() => {
      const firstCard = track.children[0];
      if (!firstCard) return;
      const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
      const step = firstCard.getBoundingClientRect().width + gap;
      const halfWidth = track.scrollWidth / 2;

      track.scrollBy({ left: step, behavior: 'smooth' });

      if (track.scrollLeft + step >= halfWidth) {
        setTimeout(() => {
          track.scrollTo({ left: track.scrollLeft - halfWidth, behavior: 'auto' });
        }, 400);
      }
    }, AUTOPLAY_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [autoplayEnabled, paused]);

  useEffect(
    () => () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    },
    [],
  );

  const renderCard = (category, cloneIndex) => {
    const { name, icon: Icon, query, path, color } = category;
    const isClone = cloneIndex !== undefined;
    return (
      <Link
        key={isClone ? `${name}-clone-${cloneIndex}` : name}
        to={path || `/products?brand=${query}`}
        className="category-card"
        aria-hidden={isClone || undefined}
        tabIndex={isClone ? -1 : undefined}
      >
        <div className={`category-icon ${color}`}>
          <Icon />
        </div>
        <strong>{name}</strong>
        <span>
          Khám phá <FiArrowRight />
        </span>
      </Link>
    );
  };

  return (
    <div
      className="category-marquee"
      role="region"
      aria-roledescription="carousel"
      aria-label="Danh mục nổi bật"
      onMouseEnter={pause}
      onMouseLeave={scheduleResume}
      onFocus={pause}
      onBlur={scheduleResume}
      onTouchStart={pause}
      onTouchEnd={scheduleResume}
    >
      <div className="category-marquee-track" ref={trackRef}>
        {categories.map((category) => renderCard(category))}
        {autoplayEnabled && categories.map((category, index) => renderCard(category, index))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into Home.jsx**

In `frontend/src/pages/Home.jsx`, add the import near the other local imports:

```jsx
import CategoryCarousel from '../components/home/CategoryCarousel';
```

Replace the existing inline track markup:

```jsx
        <div className="category-marquee">
          <div className="category-marquee-track">
            {categories.map(({ name, icon: Icon, query, path, color }) => (
              <Link
                key={name}
                to={path || `/products?brand=${query}`}
                className="category-card"
              >
                <div className={`category-icon ${color}`}><Icon /></div>
                <strong>{name}</strong>
                <span>Khám phá <FiArrowRight /></span>
              </Link>
            ))}
          </div>
        </div>
```

with:

```jsx
        <CategoryCarousel categories={categories} />
```

`FiArrowRight` is still used elsewhere in `Home.jsx` (e.g. `Xem tất cả <FiArrowRight />`), so leave that import in place.

- [ ] **Step 3: Write the test**

Create `frontend/src/components/home/CategoryCarousel.test.jsx`:

```jsx
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FiSmartphone } from 'react-icons/fi';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CategoryCarousel from './CategoryCarousel';

const categories = [
  { name: 'iPhone', icon: FiSmartphone, query: 'Apple', color: 'blue' },
  { name: 'Samsung', icon: FiSmartphone, query: 'Samsung', color: 'violet' },
];

function mockMatchMedia(matches) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
}

describe('CategoryCarousel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Element.prototype.scrollBy = vi.fn();
    Element.prototype.scrollTo = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('duplicates cards for a seamless loop, hiding the clones from assistive tech', () => {
    mockMatchMedia(false);
    render(
      <MemoryRouter>
        <CategoryCarousel categories={categories} />
      </MemoryRouter>,
    );

    const links = screen.getAllByText('iPhone');
    expect(links).toHaveLength(2);

    const originalLink = links[0].closest('a');
    const cloneLink = links[1].closest('a');
    expect(originalLink).not.toHaveAttribute('aria-hidden');
    expect(cloneLink).toHaveAttribute('aria-hidden', 'true');
    expect(cloneLink).toHaveAttribute('tabindex', '-1');
  });

  it('disables autoplay and clones when prefers-reduced-motion is set', () => {
    mockMatchMedia(true);
    render(
      <MemoryRouter>
        <CategoryCarousel categories={categories} />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('iPhone')).toHaveLength(1);

    vi.advanceTimersByTime(10000);
    expect(Element.prototype.scrollBy).not.toHaveBeenCalled();
  });

  it('pauses autoplay on hover and resumes after the resume delay', () => {
    mockMatchMedia(false);
    render(
      <MemoryRouter>
        <CategoryCarousel categories={categories} />
      </MemoryRouter>,
    );

    vi.advanceTimersByTime(3500);
    expect(Element.prototype.scrollBy).toHaveBeenCalledTimes(1);

    fireEvent.mouseEnter(screen.getByRole('region'));
    vi.advanceTimersByTime(3500);
    expect(Element.prototype.scrollBy).toHaveBeenCalledTimes(1);

    fireEvent.mouseLeave(screen.getByRole('region'));
    vi.advanceTimersByTime(4000 + 3500);
    expect(Element.prototype.scrollBy).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 4: Run the tests**

Run: `cd frontend && npx vitest run src/components/home/CategoryCarousel.test.jsx`
Expected: 3 passed.

- [ ] **Step 5: Run the existing Home test to confirm no regression**

Run: `cd frontend && npx vitest run src/pages/Home.test.jsx`
Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/home/CategoryCarousel.jsx frontend/src/components/home/CategoryCarousel.test.jsx frontend/src/pages/Home.jsx
git commit -m "feat: autoplay homepage category carousel with reduced-motion and a11y support"
```

---

### Task 2: Taxonomy admin form fields + shared mock taxonomy data

**Files:**
- Create: `frontend/src/mock/mockTaxonomy.js`
- Modify: `frontend/src/mock/mockDb.js`
- Modify: `frontend/src/components/admin/TaxonomyManagement.jsx`
- Create: `frontend/src/components/admin/TaxonomyManagement.test.jsx`

**Interfaces:**
- Produces: `mockCategories` (array of `{ id, name, slug, description, active }`, 10 entries), `mockBrands` (array of `{ id, name, slug, logo, description, active }`, 16 entries), `categoryIdByName`, `brandIdByName` (plain `{ [name]: id }` maps) — all exported from `frontend/src/mock/mockTaxonomy.js`. Task 5 imports `brandIdByName`/`categoryIdByName` from this file.

This task also expands the taxonomy catalog beyond the original 5 categories / 7 brands so every brand/category name already used by `mockProducts.js` and `mockAccessories.js` (read in Task 5) has a matching taxonomy record — decided with the user because switching Accessory to a required `categoryId` otherwise leaves most existing accessory categories (Pin dự phòng, Cáp sạc, Loa, Bảo vệ màn hình, Giá đỡ) without a match.

- [ ] **Step 1: Create the shared mock taxonomy module**

Create `frontend/src/mock/mockTaxonomy.js`:

```js
const categorySeeds = [
  { name: 'Điện thoại', slug: 'dien-thoai', description: 'Điện thoại và thiết bị di động' },
  { name: 'Tai nghe', slug: 'tai-nghe', description: 'Tai nghe có dây và không dây' },
  { name: 'Sạc', slug: 'sac', description: 'Sạc nhanh và bộ đổi nguồn' },
  { name: 'Đồng hồ', slug: 'dong-ho', description: 'Đồng hồ thông minh' },
  { name: 'Ốp lưng', slug: 'op-lung', description: 'Ốp lưng và phụ kiện bảo vệ' },
  { name: 'Pin dự phòng', slug: 'pin-du-phong', description: 'Pin sạc dự phòng di động' },
  { name: 'Cáp sạc', slug: 'cap-sac', description: 'Cáp sạc và cáp truyền dữ liệu' },
  { name: 'Loa', slug: 'loa', description: 'Loa di động và loa Bluetooth' },
  { name: 'Bảo vệ màn hình', slug: 'bao-ve-man-hinh', description: 'Kính cường lực và dán màn hình' },
  { name: 'Giá đỡ', slug: 'gia-do', description: 'Giá đỡ điện thoại' },
];

const brandNames = [
  'Apple', 'Samsung', 'Xiaomi', 'OPPO', 'Vivo', 'Honor', 'Realme',
  'Nothing', 'Google', 'OnePlus', 'Asus', 'Anker', 'Baseus', 'TechPhone', 'Sony', 'JBL',
];

export const mockCategories = categorySeeds.map((category, index) => ({
  id: `category-${index + 1}`,
  active: true,
  ...category,
}));

export const mockBrands = brandNames.map((name, index) => ({
  id: `brand-${index + 1}`,
  name,
  slug: name.toLowerCase().replace(/\s+/g, '-'),
  logo: '',
  description: `Sản phẩm chính hãng ${name} tại TechPhone.`,
  active: true,
}));

export const categoryIdByName = Object.fromEntries(mockCategories.map((category) => [category.name, category.id]));
export const brandIdByName = Object.fromEntries(mockBrands.map((brand) => [brand.name, brand.id]));
```

- [ ] **Step 2: Point mockDb.js at the shared taxonomy**

In `frontend/src/mock/mockDb.js`, add the import:

```js
import { mockBrands, mockCategories } from './mockTaxonomy';
```

Replace the `categories` and `brands` entries inside the `collections` object:

```js
  categories: [STORAGE_KEYS.mockCategories, mockCategories],
  brands: [STORAGE_KEYS.mockBrands, mockBrands],
```

(removing the old inline arrays that built `{ id, name, active }` from a plain name list).

- [ ] **Step 3: Extend the admin taxonomy form**

Replace the full contents of `frontend/src/components/admin/TaxonomyManagement.jsx`:

```jsx
import SimpleCrudPage from './SimpleCrudPage';

export default function TaxonomyManagement({ api, type }) {
  const isBrand = type === 'brand';
  const label = type === 'category' ? 'Danh mục' : 'Thương hiệu';

  const createDefaults = isBrand
    ? { name: '', logo: '', description: '', active: true }
    : { name: '', description: '', active: true };

  const fields = [
    { key: 'name', label: `Tên ${label.toLowerCase()}`, required: true, full: true },
    ...(isBrand ? [{ key: 'logo', label: 'URL logo', full: true }] : []),
    { key: 'description', label: 'Mô tả', type: 'textarea', full: true },
    { key: 'active', label: 'Đang hoạt động', type: 'checkbox' },
  ];

  const columns = [
    { key: 'name', label },
    {
      key: 'active',
      label: 'Trạng thái',
      render: (item) => (
        <span className={`status-badge ${item.active ? 'status-completed' : 'status-cancelled'}`}>
          {item.active ? 'Hoạt động' : 'Tạm ẩn'}
        </span>
      ),
    },
  ];

  return (
    <SimpleCrudPage
      api={api}
      title={`Danh sách ${label.toLowerCase()}`}
      singular={label}
      createDefaults={createDefaults}
      fields={fields}
      columns={columns}
    />
  );
}
```

(`slug` is intentionally left out of the form — the backend `TaxonomyService` auto-generates it from `name`; the mock `mockDb.save` path is updated in Step 4 to do the same.)

- [ ] **Step 4: Auto-generate slug in mock save path**

`mockDb.save` (in `frontend/src/mock/mockDb.js`) currently stores whatever payload it's given verbatim. Add slug generation so mock-mode Brand/Category creation matches the backend's `TaxonomyService` behavior. Add this helper near the top of `frontend/src/mock/mockDb.js`, after the existing `clone` helper:

```js
const slugify = (value = '') =>
  value
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
```

Then in the `save(name, payload)` method, before building `item`/`updated`, add:

```js
    if ((name === 'categories' || name === 'brands') && payload.name && !payload.slug) {
      payload = { ...payload, slug: slugify(payload.name) };
    }
```

(placed as the first line inside `async save(name, payload) {`).

- [ ] **Step 5: Write the form field test**

Create `frontend/src/components/admin/TaxonomyManagement.test.jsx`:

```jsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TaxonomyManagement from './TaxonomyManagement';

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const buildApi = () => ({
  getAll: vi.fn().mockResolvedValue([]),
  create: vi.fn().mockResolvedValue({}),
  update: vi.fn().mockResolvedValue({}),
  remove: vi.fn().mockResolvedValue({}),
});

describe('TaxonomyManagement', () => {
  it('shows a logo field for brands but not for categories', async () => {
    const api = buildApi();
    render(<TaxonomyManagement api={api} type="brand" />);
    fireEvent.click(await screen.findByRole('button', { name: /thêm thương hiệu/i }));
    expect(screen.getByText('URL logo')).toBeInTheDocument();
    expect(screen.getByText('Mô tả')).toBeInTheDocument();
  });

  it('omits the logo field for categories', async () => {
    const api = buildApi();
    render(<TaxonomyManagement api={api} type="category" />);
    fireEvent.click(await screen.findByRole('button', { name: /thêm danh mục/i }));
    expect(screen.queryByText('URL logo')).not.toBeInTheDocument();
    expect(screen.getByText('Mô tả')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the tests**

Run: `cd frontend && npx vitest run src/components/admin/TaxonomyManagement.test.jsx`
Expected: 2 passed.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/mock/mockTaxonomy.js frontend/src/mock/mockDb.js frontend/src/components/admin/TaxonomyManagement.jsx frontend/src/components/admin/TaxonomyManagement.test.jsx
git commit -m "feat: expand taxonomy admin form fields and centralize mock brand/category data"
```

---

### Task 3: Backend Product/Accessory reference Brand/Category by ID

**Files:**
- Modify: `backend/src/models/Product.js`
- Modify: `backend/src/models/Accessory.js`
- Modify: `backend/src/services/catalogService.js`
- Modify: `backend/src/services/index.js`
- Modify: `backend/src/validators/catalogValidators.js`
- Modify: `backend/src/seed/seed.js`
- Modify: `backend/tests/catalog.test.js`

**Interfaces:**
- Produces: `CatalogService` constructor signature becomes `new CatalogService(repository, { brandRepository, categoryRepository })`. Every item returned by `productService`/`accessoryService` (`list`, `getById`, `create`, `update`) now has `brandId`, `categoryId` (raw FK ids) **and** `brand`, `category` (denormalized display names) fields. `create`/`update` payloads must send `brandId`/`categoryId` instead of `brand`/`category`.

This is one deliverable split into ordered steps because the schema, service, validators, seed data, and existing test all have to move together to stay green.

- [ ] **Step 1: Update the Product and Accessory schemas**

In `backend/src/models/Product.js`, replace:

```js
    brand: { type: String, required: true, trim: true, index: true },
    category: { type: String, required: true, trim: true, index: true },
```

with:

```js
    brandId: { type: String, ref: 'Brand', required: true, index: true },
    categoryId: { type: String, ref: 'Category', required: true, index: true },
```

Apply the identical change in `backend/src/models/Accessory.js` (same two lines, same replacement).

- [ ] **Step 2: Rewrite CatalogService to denormalize brand/category names**

Replace the full contents of `backend/src/services/catalogService.js`:

```js
const AppError = require('../utils/AppError');
const { buildRegex, parsePagination } = require('../utils/query');

const sortMap = {
  newest: { createdAt: -1 },
  'price-asc': { price: 1 },
  'price-desc': { price: -1 },
  'best-selling': { sold: -1 },
  rating: { rating: -1 },
};

class CatalogService {
  constructor(repository, taxonomyRepositories = {}) {
    this.repository = repository;
    this.brandRepository = taxonomyRepositories.brandRepository;
    this.categoryRepository = taxonomyRepositories.categoryRepository;
  }

  async resolveTaxonomyId(repository, name) {
    if (!repository || !name) return undefined;
    const matches = await repository.findAll({ name });
    return matches[0]?.id;
  }

  async buildFilter(query = {}) {
    const filter = {};
    const keyword = query.q || query.search || query.keyword;
    if (keyword) {
      filter.name = buildRegex(keyword);
    }
    if (query.category) {
      const categoryId = await this.resolveTaxonomyId(this.categoryRepository, query.category);
      filter.categoryId = categoryId || '__no-match__';
    }
    if (query.brand) {
      const brandId = await this.resolveTaxonomyId(this.brandRepository, query.brand);
      filter.brandId = brandId || '__no-match__';
    }
    if (query.status) filter.status = query.status;
    return filter;
  }

  async denormalizeTaxonomy(items) {
    if (!items || !this.brandRepository || !this.categoryRepository) return items;
    const list = Array.isArray(items) ? items : [items];
    const brandIds = [...new Set(list.map((item) => item.brandId).filter(Boolean))];
    const categoryIds = [...new Set(list.map((item) => item.categoryId).filter(Boolean))];
    const [brands, categories] = await Promise.all([
      Promise.all(brandIds.map((id) => this.brandRepository.findById(id))),
      Promise.all(categoryIds.map((id) => this.categoryRepository.findById(id))),
    ]);
    const brandNames = new Map(brands.filter(Boolean).map((brand) => [brand.id, brand.name]));
    const categoryNames = new Map(categories.filter(Boolean).map((category) => [category.id, category.name]));
    const withNames = list.map((item) => ({
      ...item,
      brand: brandNames.get(item.brandId) || '',
      category: categoryNames.get(item.categoryId) || '',
    }));
    return Array.isArray(items) ? withNames : withNames[0];
  }

  async list(query = {}) {
    const filter = await this.buildFilter(query);
    const pagination = parsePagination(query);
    const sort = sortMap[query.sort] || sortMap.newest;

    if (!pagination) {
      const items = await this.repository.findAll(filter, { sort });
      return this.denormalizeTaxonomy(items);
    }

    const skip = (pagination.page - 1) * pagination.limit;
    const [rawItems, total] = await Promise.all([
      this.repository.findAll(filter, { sort, skip, limit: pagination.limit }),
      this.repository.count(filter),
    ]);
    const items = await this.denormalizeTaxonomy(rawItems);

    return {
      items,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  async getById(id) {
    const item = await this.repository.findById(id);
    if (!item) throw new AppError('Resource not found', 404);
    return this.denormalizeTaxonomy(item);
  }

  async create(payload) {
    const created = await this.repository.create(payload);
    return this.denormalizeTaxonomy(created);
  }

  async update(id, payload) {
    const updated = await this.repository.update(id, payload);
    return this.denormalizeTaxonomy(updated);
  }

  async remove(id) {
    return this.repository.softDelete(id);
  }
}

module.exports = CatalogService;
```

Note: keyword search now matches `name` only (it previously also matched the raw `brand`/`category` strings, which no longer hold searchable text since they're ids).

- [ ] **Step 3: Wire taxonomy repositories into the catalog services**

In `backend/src/services/index.js`, change:

```js
  productService: new CatalogService(productRepository),
  accessoryService: new CatalogService(accessoryRepository),
```

to:

```js
  productService: new CatalogService(productRepository, { brandRepository, categoryRepository }),
  accessoryService: new CatalogService(accessoryRepository, { brandRepository, categoryRepository }),
```

- [ ] **Step 4: Update catalog validators to validate brandId/categoryId**

Replace the full contents of `backend/src/validators/catalogValidators.js`:

```js
const { body, query } = require('express-validator');
const { paginationQuery } = require('./commonValidators');
const brandRepository = require('../repositories/brandRepository');
const categoryRepository = require('../repositories/categoryRepository');

const list = [
  ...paginationQuery,
  query('q').optional().trim(),
  query('search').optional().trim(),
  query('category').optional().trim(),
  query('brand').optional().trim(),
  query('status').optional().isIn(['active', 'inactive']).withMessage('status is invalid'),
  query('sort')
    .optional()
    .isIn(['newest', 'price-asc', 'price-desc', 'best-selling', 'rating'])
    .withMessage('sort is invalid'),
];

const activeBrandExists = async (value) => {
  const brand = await brandRepository.findById(value);
  if (!brand || !brand.active) throw new Error('brandId is invalid or inactive');
  return true;
};

const activeCategoryExists = async (value) => {
  const category = await categoryRepository.findById(value);
  if (!category || !category.active) throw new Error('categoryId is invalid or inactive');
  return true;
};

const create = [
  body('name').trim().notEmpty().withMessage('name is required'),
  body('brandId').trim().notEmpty().withMessage('brandId is required').bail().custom(activeBrandExists),
  body('categoryId').trim().notEmpty().withMessage('categoryId is required').bail().custom(activeCategoryExists),
  body('price').isFloat({ min: 0 }).withMessage('price must be positive'),
  body('oldPrice').optional().isFloat({ min: 0 }).withMessage('oldPrice must be positive'),
  body('discountPercent').optional().isFloat({ min: 0 }).withMessage('discountPercent must be positive'),
  body('image').optional().isString(),
  body('images').optional().isArray().withMessage('images must be an array'),
  body('stock').optional().isInt({ min: 0 }).withMessage('stock must be positive'),
  body('sold').optional().isInt({ min: 0 }).withMessage('sold must be positive'),
  body('rating').optional().isFloat({ min: 0, max: 5 }).withMessage('rating must be between 0 and 5'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('status is invalid'),
];

const update = [
  body('name').optional().trim().notEmpty().withMessage('name cannot be empty'),
  body('brandId').optional().trim().notEmpty().withMessage('brandId cannot be empty').bail().custom(activeBrandExists),
  body('categoryId').optional().trim().notEmpty().withMessage('categoryId cannot be empty').bail().custom(activeCategoryExists),
  body('price').optional().isFloat({ min: 0 }).withMessage('price must be positive'),
  body('oldPrice').optional().isFloat({ min: 0 }).withMessage('oldPrice must be positive'),
  body('discountPercent').optional().isFloat({ min: 0 }).withMessage('discountPercent must be positive'),
  body('image').optional().isString(),
  body('images').optional().isArray().withMessage('images must be an array'),
  body('stock').optional().isInt({ min: 0 }).withMessage('stock must be positive'),
  body('sold').optional().isInt({ min: 0 }).withMessage('sold must be positive'),
  body('rating').optional().isFloat({ min: 0, max: 5 }).withMessage('rating must be between 0 and 5'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('status is invalid'),
];

module.exports = { list, create, update };
```

- [ ] **Step 5: Rebuild seed data around brandId/categoryId**

Replace the full contents of `backend/src/seed/seed.js`:

```js
const bcrypt = require('bcrypt');
const { connectDB, disconnectDB } = require('../config/database');
const Accessory = require('../models/Accessory');
const Banner = require('../models/Banner');
const Brand = require('../models/Brand');
const Category = require('../models/Category');
const Contact = require('../models/Contact');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Product = require('../models/Product');
const RefreshToken = require('../models/RefreshToken');
const Review = require('../models/Review');
const Setting = require('../models/Setting');
const User = require('../models/User');
const Voucher = require('../models/Voucher');

const imageFor = (label, color = '2563eb') =>
  `https://placehold.co/800x800/${color}/ffffff?text=${encodeURIComponent(label)}`;

const categorySeeds = [
  { _id: 'category-1', name: 'Dien thoai', slug: 'dien-thoai', description: 'Smartphones and flagship devices', active: true },
  { _id: 'category-2', name: 'Tai nghe', slug: 'tai-nghe', description: 'Wireless earbuds and audio gear', active: true },
  { _id: 'category-3', name: 'Sac', slug: 'sac', description: 'Chargers and cables', active: true },
  { _id: 'category-4', name: 'Dong ho', slug: 'dong-ho', description: 'Smart watches and wearables', active: true },
  { _id: 'category-5', name: 'Phu kien', slug: 'phu-kien', description: 'General accessories', active: false },
  { _id: 'category-6', name: 'Pin du phong', slug: 'pin-du-phong', description: 'Power banks and portable batteries', active: true },
];
const categoryIdByName = Object.fromEntries(categorySeeds.map((category) => [category.name, category._id]));

const brandNames = ['Apple', 'Samsung', 'Xiaomi', 'OPPO', 'Vivo', 'Honor', 'Realme', 'Google', 'Anker', 'Baseus', 'TechPhone'];
const brandSeeds = brandNames.map((name, index) => ({
  _id: `brand-${index + 1}`,
  name,
  slug: name.toLowerCase(),
  logo: imageFor(name, index % 2 ? '2563eb' : '0f766e'),
  description: `${name} products available at TechPhone.`,
  active: name !== 'TechPhone',
}));
const brandIdByName = Object.fromEntries(brandSeeds.map((brand) => [brand.name, brand._id]));

const products = [
  ['phone-1', 'iPhone 16 Pro Max', 'Apple', 33990000, 36990000, '8GB', '256GB', '2563eb'],
  ['phone-2', 'Galaxy S25 Ultra', 'Samsung', 30990000, 33990000, '12GB', '256GB', '1d4ed8'],
  ['phone-3', 'Xiaomi 15 Ultra', 'Xiaomi', 29990000, 32990000, '16GB', '512GB', '111827'],
  ['phone-4', 'OPPO Find X8 Pro', 'OPPO', 27990000, 30990000, '16GB', '512GB', '0f766e'],
  ['phone-5', 'vivo X200 Pro', 'Vivo', 25990000, 29990000, '16GB', '512GB', '2563eb'],
  ['phone-6', 'HONOR Magic7 Pro', 'Honor', 24990000, 27990000, '12GB', '512GB', '1e40af'],
  ['phone-7', 'realme GT 7 Pro', 'Realme', 18990000, 21990000, '16GB', '512GB', 'f59e0b'],
  ['phone-8', 'Google Pixel 9 Pro', 'Google', 23990000, 26990000, '16GB', '256GB', '3b82f6'],
].map(([id, name, brand, price, oldPrice, ram, storage, color], index) => {
  const image = imageFor(name, color);
  return {
    _id: id,
    name,
    brandId: brandIdByName[brand],
    categoryId: categoryIdByName['Dien thoai'],
    price,
    oldPrice,
    discountPercent: Math.round(((oldPrice - price) / oldPrice) * 100),
    image,
    images: [image, imageFor(`${brand} back`, '0f172a')],
    ram,
    storage,
    screen: `${(6.3 + index * 0.1).toFixed(1)} inch OLED, 120Hz`,
    battery: `${4500 + index * 120} mAh`,
    camera: `${48 + index * 4}MP camera system`,
    chip: 'Flagship 8-core chipset',
    description: `${name} is a premium smartphone with strong performance, bright display, and official TechPhone warranty.`,
    specifications: {
      Display: `${(6.3 + index * 0.1).toFixed(1)} inch OLED`,
      RAM: ram,
      Storage: storage,
      Battery: `${4500 + index * 120} mAh`,
      Connectivity: '5G, Wi-Fi 6, Bluetooth 5.3',
    },
    stock: 10 + index * 4,
    sold: 70 + index * 33,
    rating: Number((4.4 + (index % 4) / 10).toFixed(1)),
    status: 'active',
  };
});

const accessories = [
  ['accessory-1', 'AirPods Pro 2 USB-C', 'Apple', 'Tai nghe', 5290000, 5990000, '2563eb'],
  ['accessory-2', 'Galaxy Buds3 Pro', 'Samsung', 'Tai nghe', 3990000, 4690000, '7c3aed'],
  ['accessory-3', 'Anker GaN Charger 65W', 'Anker', 'Sac', 1090000, 1390000, '0f766e'],
  ['accessory-4', 'Baseus Power Bank 20000mAh', 'Baseus', 'Pin du phong', 890000, 1190000, 'f97316'],
].map(([id, name, brand, category, price, oldPrice, color], index) => {
  const image = imageFor(name, color);
  return {
    _id: id,
    name,
    brandId: brandIdByName[brand],
    categoryId: categoryIdByName[category],
    price,
    oldPrice,
    discountPercent: Math.round(((oldPrice - price) / oldPrice) * 100),
    image,
    images: [image],
    description: `${name} is an official accessory with TechPhone warranty.`,
    specifications: { Brand: brand, Type: category, Warranty: '12 months' },
    stock: 20 + index * 8,
    sold: 50 + index * 20,
    rating: 4.6,
    status: 'active',
  };
});

const run = async () => {
  await connectDB();

  await Promise.all([
    Accessory.deleteMany({}),
    Banner.deleteMany({}),
    Brand.deleteMany({}),
    Category.deleteMany({}),
    Contact.deleteMany({}),
    Order.deleteMany({}),
    OrderItem.deleteMany({}),
    Product.deleteMany({}),
    RefreshToken.deleteMany({}),
    Review.deleteMany({}),
    Setting.deleteMany({}),
    User.deleteMany({}),
    Voucher.deleteMany({}),
  ]);

  const password = await bcrypt.hash('123456', 12);
  await User.insertMany([
    {
      _id: 'user-admin',
      fullName: 'Quan tri TechPhone',
      email: 'admin@gmail.com',
      phone: '0900000000',
      password,
      role: 'admin',
      status: 'active',
      address: '123 Nguyen Hue, District 1, Ho Chi Minh City',
      avatar: imageFor('Admin', '1d4ed8'),
    },
    {
      _id: 'user-customer',
      fullName: 'Nguyen Minh Anh',
      email: 'user@gmail.com',
      phone: '0911111111',
      password,
      role: 'customer',
      status: 'active',
      address: '45 Le Loi, District 1, Ho Chi Minh City',
      avatar: imageFor('Minh Anh', '0f766e'),
    },
    {
      _id: 'user-customer-2',
      fullName: 'Tran Hoang Nam',
      email: 'nam@gmail.com',
      phone: '0922222222',
      password,
      role: 'customer',
      status: 'active',
      address: '21 Hai Ba Trung, District 3, Ho Chi Minh City',
      avatar: imageFor('Hoang Nam', '7c3aed'),
    },
    {
      _id: 'user-locked',
      fullName: 'Le Thu Trang',
      email: 'locked@gmail.com',
      phone: '0933333333',
      password,
      role: 'customer',
      status: 'locked',
      address: '9 Nguyen Trai, District 5, Ho Chi Minh City',
      avatar: imageFor('Locked', 'ef4444'),
    },
    {
      _id: 'user-inactive',
      fullName: 'Pham Gia Bao',
      email: 'inactive@gmail.com',
      phone: '0944444444',
      password,
      role: 'customer',
      status: 'inactive',
      address: '72 Cach Mang Thang 8, District 10, Ho Chi Minh City',
      avatar: imageFor('Inactive', '64748b'),
    },
  ]);

  await Category.insertMany(categorySeeds);
  await Brand.insertMany(brandSeeds);

  await Product.insertMany([
    ...products,
    {
      _id: 'phone-9',
      name: 'iPhone 15',
      brandId: brandIdByName.Apple,
      categoryId: categoryIdByName['Dien thoai'],
      price: 16990000,
      oldPrice: 19990000,
      discountPercent: 15,
      image: imageFor('iPhone 15', '0284c7'),
      images: [imageFor('iPhone 15', '0284c7')],
      ram: '6GB',
      storage: '128GB',
      screen: '6.1 inch OLED',
      battery: '3349 mAh',
      camera: '48MP dual camera',
      chip: 'A16 Bionic',
      description: 'A compact iPhone option for catalog filtering and low-stock checks.',
      specifications: { Display: '6.1 inch OLED', RAM: '6GB', Storage: '128GB', Warranty: '12 months' },
      stock: 2,
      sold: 210,
      rating: 4.5,
      status: 'active',
    },
    {
      _id: 'phone-inactive',
      name: 'Demo Hidden Phone',
      brandId: brandIdByName.TechPhone,
      categoryId: categoryIdByName['Dien thoai'],
      price: 9990000,
      oldPrice: 0,
      discountPercent: 0,
      image: imageFor('Hidden Phone', '475569'),
      images: [imageFor('Hidden Phone', '475569')],
      ram: '8GB',
      storage: '128GB',
      description: 'Inactive product for admin status tests.',
      stock: 0,
      sold: 0,
      rating: 0,
      status: 'inactive',
    },
  ]);
  await Accessory.insertMany([
    ...accessories,
    {
      _id: 'accessory-5',
      name: 'Apple Watch Series 10',
      brandId: brandIdByName.Apple,
      categoryId: categoryIdByName['Dong ho'],
      price: 10990000,
      oldPrice: 12990000,
      discountPercent: 15,
      image: imageFor('Apple Watch Series 10', 'db2777'),
      images: [imageFor('Apple Watch Series 10', 'db2777')],
      description: 'Smartwatch accessory for category and cart testing.',
      specifications: { Brand: 'Apple', Type: 'Dong ho', Warranty: '12 months' },
      stock: 12,
      sold: 44,
      rating: 4.7,
      status: 'active',
    },
    {
      _id: 'accessory-inactive',
      name: 'Demo Hidden Accessory',
      brandId: brandIdByName.TechPhone,
      categoryId: categoryIdByName['Phu kien'],
      price: 199000,
      oldPrice: 0,
      discountPercent: 0,
      image: imageFor('Hidden Accessory', '475569'),
      images: [imageFor('Hidden Accessory', '475569')],
      description: 'Inactive accessory for admin status tests.',
      stock: 0,
      sold: 0,
      rating: 0,
      status: 'inactive',
    },
  ]);
  await Voucher.insertMany([
    { _id: 'voucher-1', code: 'TECH10', type: 'percent', value: 10, minOrder: 5000000, maxDiscount: 1000000, quantity: 100, used: 12, startDate: '2026-01-01', endDate: '2026-12-31', active: true },
    { _id: 'voucher-2', code: 'GIAM200K', type: 'fixed', value: 200000, minOrder: 3000000, maxDiscount: 200000, quantity: 200, used: 28, startDate: '2026-01-01', endDate: '2026-12-31', active: true },
    { _id: 'voucher-3', code: 'FREESHIP', type: 'shipping', value: 30000, minOrder: 500000, maxDiscount: 30000, quantity: 500, used: 75, startDate: '2026-01-01', endDate: '2026-12-31', active: true },
    { _id: 'voucher-4', code: 'EXPIRED50', type: 'percent', value: 50, minOrder: 1000000, maxDiscount: 500000, quantity: 20, used: 4, startDate: '2025-01-01', endDate: '2025-12-31', active: true },
    { _id: 'voucher-5', code: 'USEDUP', type: 'fixed', value: 500000, minOrder: 5000000, maxDiscount: 500000, quantity: 10, used: 10, startDate: '2026-01-01', endDate: '2026-12-31', active: true },
    { _id: 'voucher-6', code: 'OFFLINE', type: 'percent', value: 5, minOrder: 1000000, maxDiscount: 200000, quantity: 50, used: 0, startDate: '2026-01-01', endDate: '2026-12-31', active: false },
  ]);
  await Banner.insertMany([
    { _id: 'banner-1', title: 'Flagship upgrade', description: 'Trade in and save up to 4 million VND', image: imageFor('Flagship upgrade', '1d4ed8'), link: '/products', position: 1, active: true },
    { _id: 'banner-2', title: 'Mid-year sale', description: 'Save up to 30% on phones and accessories', image: imageFor('Mid-year sale', '7c3aed'), link: '/products', position: 2, active: true },
    { _id: 'banner-3', title: 'Accessory bundle', description: 'Bundle earbuds and charger for extra savings', image: imageFor('Accessory bundle', '0f766e'), link: '/accessories', position: 3, active: true },
    { _id: 'banner-hidden', title: 'Hidden campaign', description: 'Inactive banner for admin tests', image: imageFor('Hidden campaign', '475569'), link: '/', position: 99, active: false },
  ]);

  const customers = {
    minhAnh: {
      fullName: 'Nguyen Minh Anh',
      email: 'user@gmail.com',
      phone: '0911111111',
      address: '45 Le Loi, District 1, Ho Chi Minh City',
    },
    hoangNam: {
      fullName: 'Tran Hoang Nam',
      email: 'nam@gmail.com',
      phone: '0922222222',
      address: '21 Hai Ba Trung, District 3, Ho Chi Minh City',
    },
  };
  const orderSeeds = [
    {
      _id: 'order-pending',
      orderNumber: 'TP26062001',
      userId: 'user-customer',
      status: 'pending',
      paymentMethod: 'cod',
      customer: customers.minhAnh,
      voucherCode: 'TECH10',
      discount: 1000000,
      shippingFee: 30000,
      note: 'Please call before delivery.',
      items: [
        { id: 'phone-2', productId: 'phone-2', name: products[1].name, image: products[1].image, price: products[1].price, quantity: 1, type: 'product' },
        { id: 'accessory-3', accessoryId: 'accessory-3', name: accessories[2].name, image: accessories[2].image, price: accessories[2].price, quantity: 2, type: 'accessory' },
      ],
    },
    {
      _id: 'order-confirmed',
      orderNumber: 'TP26062002',
      userId: 'user-customer-2',
      status: 'confirmed',
      paymentMethod: 'bank',
      customer: customers.hoangNam,
      voucherCode: 'GIAM200K',
      discount: 200000,
      shippingFee: 0,
      note: 'Bank transfer received.',
      items: [
        { id: 'phone-3', productId: 'phone-3', name: products[2].name, image: products[2].image, price: products[2].price, quantity: 1, type: 'product' },
      ],
    },
    {
      _id: 'order-shipping',
      orderNumber: 'TP26062003',
      userId: 'user-customer',
      status: 'shipping',
      paymentMethod: 'momo',
      customer: customers.minhAnh,
      voucherCode: 'FREESHIP',
      discount: 30000,
      shippingFee: 30000,
      note: 'Out for delivery.',
      items: [
        { id: 'accessory-1', accessoryId: 'accessory-1', name: accessories[0].name, image: accessories[0].image, price: accessories[0].price, quantity: 1, type: 'accessory' },
      ],
    },
    {
      _id: 'order-delivered',
      orderNumber: 'TP26062004',
      userId: 'user-customer-2',
      status: 'delivered',
      paymentMethod: 'card',
      customer: customers.hoangNam,
      voucherCode: null,
      discount: 0,
      shippingFee: 0,
      note: 'Delivered, waiting completion confirmation.',
      items: [
        { id: 'phone-4', productId: 'phone-4', name: products[3].name, image: products[3].image, price: products[3].price, quantity: 1, type: 'product' },
      ],
    },
    {
      _id: 'order-completed',
      orderNumber: 'TP260601',
      userId: 'user-customer',
      status: 'completed',
      paymentMethod: 'cod',
      customer: customers.minhAnh,
      voucherCode: null,
      discount: 0,
      shippingFee: 0,
      note: 'Completed sample order.',
      items: [
        { id: 'phone-1', productId: 'phone-1', name: products[0].name, image: products[0].image, price: products[0].price, quantity: 1, type: 'product' },
      ],
    },
    {
      _id: 'order-cancelled',
      orderNumber: 'TP26062006',
      userId: 'user-customer-2',
      status: 'cancelled',
      paymentMethod: 'cod',
      customer: customers.hoangNam,
      voucherCode: null,
      discount: 0,
      shippingFee: 30000,
      note: 'Customer cancelled before confirmation.',
      items: [
        { id: 'phone-5', productId: 'phone-5', name: products[4].name, image: products[4].image, price: products[4].price, quantity: 1, type: 'product' },
      ],
    },
  ].map((order) => {
    const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return {
      ...order,
      subtotal,
      total: Math.max(subtotal + order.shippingFee - order.discount, 0),
    };
  });
  await Order.insertMany(orderSeeds);
  await OrderItem.insertMany(orderSeeds.flatMap((order) =>
    order.items.map((item, index) => ({
      _id: `${order._id}-item-${index + 1}`,
      orderId: order._id,
      productId: item.productId || null,
      accessoryId: item.accessoryId || null,
      name: item.name,
      image: item.image,
      price: item.price,
      quantity: item.quantity,
      type: item.type,
      total: item.price * item.quantity,
    })),
  ));

  await Review.insertMany([
    { _id: 'review-1', userId: 'user-customer', userName: 'Nguyen Minh Anh', productId: 'phone-1', rating: 5, comment: 'Great product quality and fast delivery.', status: 'approved' },
    { _id: 'review-2', userId: 'user-customer', userName: 'Nguyen Minh Anh', productId: 'general', rating: 5, comment: 'Helpful staff and transparent warranty policy.', status: 'approved' },
    { _id: 'review-3', userId: 'user-customer-2', userName: 'Tran Hoang Nam', productId: 'phone-3', rating: 4, comment: 'Good camera, waiting for admin approval.', status: 'pending' },
    { _id: 'review-4', userId: 'user-customer-2', userName: 'Tran Hoang Nam', productId: 'phone-5', rating: 2, comment: 'Rejected review sample for moderation tests.', status: 'rejected' },
    { _id: 'review-5', userId: 'user-customer', userName: 'Nguyen Minh Anh', productId: 'general', accessoryId: 'accessory-1', rating: 5, comment: 'Noise cancellation works very well.', status: 'approved' },
  ]);
  await Contact.insertMany([
    { _id: 'contact-1', fullName: 'Nguyen Minh Anh', email: 'user@gmail.com', phone: '0911111111', subject: 'Bao hanh san pham', message: 'Toi muon hoi ve chinh sach bao hanh iPhone.', status: 'new' },
    { _id: 'contact-2', fullName: 'Tran Hoang Nam', email: 'nam@gmail.com', phone: '0922222222', subject: 'Kiem tra don hang', message: 'Vui long cap nhat trang thai giao hang.', status: 'read', adminNote: 'Called customer, shipment is on the way.' },
    { _id: 'contact-3', fullName: 'Le Thu Trang', email: 'trang@example.com', phone: '0933333333', subject: 'Tu van phu kien', message: 'Can tu van sac nhanh phu hop.', status: 'resolved', adminNote: 'Suggested Anker 65W charger.' },
  ]);
  await Setting.insertMany([
    { _id: 'setting-1', key: 'storeName', value: 'TechPhone', group: 'general', label: 'Store name' },
    { _id: 'setting-2', key: 'hotline', value: '1900 6868', group: 'general', label: 'Hotline' },
    { _id: 'setting-3', key: 'email', value: 'support@techphone.vn', group: 'general', label: 'Support email' },
    { _id: 'setting-4', key: 'address', value: '123 Nguyen Hue, District 1, Ho Chi Minh City', group: 'general', label: 'Store address' },
    { _id: 'setting-5', key: 'freeShippingThreshold', value: 10000000, group: 'checkout', label: 'Free shipping threshold' },
    { _id: 'setting-6', key: 'maintenanceMode', value: false, group: 'system', label: 'Maintenance mode' },
  ]);

  console.log('TechPhone seed data inserted successfully.');
  await disconnectDB();
};

run().catch(async (error) => {
  console.error(error);
  await disconnectDB();
  process.exit(1);
});
```

- [ ] **Step 6: Update the existing catalog test for the new schema**

Replace the full contents of `backend/tests/catalog.test.js`:

```js
const request = require('supertest');
const Brand = require('../src/models/Brand');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const { app, createUser, login } = require('./helpers');

const seedTaxonomy = async () => {
  const [apple, samsung, google] = await Brand.insertMany([
    { name: 'Apple', slug: 'apple', active: true },
    { name: 'Samsung', slug: 'samsung', active: true },
    { name: 'Google', slug: 'google', active: true },
  ]);
  const [phones] = await Category.insertMany([{ name: 'Dien thoai', slug: 'dien-thoai', active: true }]);
  return { apple, samsung, google, phones };
};

describe('Product API', () => {
  it('lists products and supports search filters', async () => {
    const { apple, samsung, phones } = await seedTaxonomy();
    await Product.create({
      name: 'iPhone 16 Pro Max',
      brandId: apple.id,
      categoryId: phones.id,
      price: 33990000,
      status: 'active',
    });
    await Product.create({
      name: 'Galaxy S25 Ultra',
      brandId: samsung.id,
      categoryId: phones.id,
      price: 30990000,
      status: 'active',
    });

    const response = await request(app).get('/api/products?q=iphone&brand=Apple');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].brand).toBe('Apple');
  });

  it('lets admins create products and blocks customers', async () => {
    const { google, phones } = await seedTaxonomy();
    await createUser({ email: 'admin@test.com', phone: '0900000000', role: 'admin' });
    await createUser({ email: 'customer@test.com', phone: '0911111111', role: 'customer' });
    const adminToken = await login('admin@test.com');
    const customerToken = await login('customer@test.com');

    const payload = {
      name: 'Pixel 9 Pro',
      brandId: google.id,
      categoryId: phones.id,
      price: 23990000,
      stock: 10,
    };

    const forbidden = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(payload);
    expect(forbidden.status).toBe(403);

    const created = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(created.status).toBe(201);
    expect(created.body.data.name).toBe('Pixel 9 Pro');
    expect(created.body.data.brand).toBe('Google');
  });
});
```

- [ ] **Step 7: Run the backend tests**

Run: `cd backend && npx jest tests/catalog.test.js --runInBand`
Expected: 2 passed.

- [ ] **Step 8: Run the full backend suite to catch cross-file regressions**

Run: `cd backend && npm test`
Expected: all suites pass. If `order-dashboard.test.js` or any other suite creates `Product`/`Accessory` documents directly with `brand`/`category` string fields, update those calls to use `brandId`/`categoryId` referencing a `Brand`/`Category` created in the same test (mirror the `seedTaxonomy` pattern from Step 6).

- [ ] **Step 9: Re-seed the local database**

Run: `cd backend && npm run seed`
Expected: `TechPhone seed data inserted successfully.` with no errors.

- [ ] **Step 10: Commit**

```bash
git add backend/src/models/Product.js backend/src/models/Accessory.js backend/src/services/catalogService.js backend/src/services/index.js backend/src/validators/catalogValidators.js backend/src/seed/seed.js backend/tests/catalog.test.js
git commit -m "feat: link Product and Accessory to Brand/Category by id on the backend"
```

---

### Task 4: Product/Accessory admin form uses Brand/Category dropdowns

**Files:**
- Modify: `frontend/src/components/admin/ProductFormModal.jsx`
- Create: `frontend/src/components/admin/ProductFormModal.test.jsx`

**Interfaces:**
- Consumes: `adminApi.brands.getAll()` / `adminApi.categories.getAll()` (from `frontend/src/api/adminApi.js`, unchanged) resolving to arrays of `{ id, name, active, ... }`.
- Produces: `onSubmit` payload now includes `brandId`, `categoryId` instead of `brand`, `category` free text.

- [ ] **Step 1: Rewrite ProductFormModal**

Replace the full contents of `frontend/src/components/admin/ProductFormModal.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import { adminApi } from '../../api/adminApi';
import { makeAccessoryImage, makeProductImage } from '../../mock/imageFactory';

const emptyProduct = {
  name: '',
  brandId: '',
  categoryId: '',
  price: '',
  oldPrice: '',
  ram: '8GB',
  storage: '256GB',
  screen: '6.7 inch OLED, 120Hz',
  battery: '5000 mAh',
  camera: '50MP',
  chip: 'Chip 8 nhân hiệu năng cao',
  stock: 10,
  status: 'active',
  description: '',
  image: '',
};

export default function ProductFormModal({ open, item, kind = 'product', onClose, onSubmit }) {
  const [form, setForm] = useState(emptyProduct);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (!open) return;
    Promise.all([adminApi.brands.getAll(), adminApi.categories.getAll()]).then(([brandList, categoryList]) => {
      setBrands(brandList.filter((brand) => brand.active));
      setCategories(categoryList.filter((category) => category.active));
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setForm(item || { ...emptyProduct });
  }, [item, kind, open]);

  if (!open) return null;
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event) => {
    event.preventDefault();
    const price = Number(form.price);
    const oldPrice = Number(form.oldPrice || form.price);
    const image =
      form.image ||
      (kind === 'accessory'
        ? makeAccessoryImage(form.name || 'Phụ kiện')
        : makeProductImage(form.name || 'Điện thoại'));
    const brandName = brands.find((brand) => brand.id === form.brandId)?.name || '';
    const categoryName = categories.find((category) => category.id === form.categoryId)?.name || '';
    onSubmit({
      ...form,
      price,
      oldPrice,
      stock: Number(form.stock),
      image,
      images: form.images?.length ? form.images : [image],
      discountPercent: oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0,
      rating: form.rating || 5,
      sold: form.sold || 0,
      specifications:
        kind === 'accessory'
          ? { 'Thương hiệu': brandName, 'Loại phụ kiện': categoryName, 'Bảo hành': '12 tháng' }
          : {
              'Màn hình': form.screen,
              RAM: form.ram,
              'Bộ nhớ trong': form.storage,
              Pin: form.battery,
              Camera: form.camera,
              Chip: form.chip,
            },
    });
  };

  return (
    <div className="modal-backdrop-custom" onMouseDown={onClose}>
      <form className="admin-form-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="admin-modal-head">
          <div><span>{item ? 'Chỉnh sửa dữ liệu' : 'Tạo dữ liệu mới'}</span><h2>{item ? item.name : kind === 'product' ? 'Thêm sản phẩm' : 'Thêm phụ kiện'}</h2></div>
          <button type="button" onClick={onClose}><FiX /></button>
        </div>
        <div className="form-grid">
          <label className="form-field full"><span>Tên {kind === 'product' ? 'sản phẩm' : 'phụ kiện'} *</span><input required value={form.name} onChange={(event) => update('name', event.target.value)} /></label>
          <label className="form-field">
            <span>Thương hiệu *</span>
            <select required value={form.brandId} onChange={(event) => update('brandId', event.target.value)}>
              <option value="">Chọn thương hiệu</option>
              {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
            </select>
          </label>
          <label className="form-field">
            <span>Danh mục *</span>
            <select required value={form.categoryId} onChange={(event) => update('categoryId', event.target.value)}>
              <option value="">Chọn danh mục</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label className="form-field"><span>Giá bán *</span><input required min="0" type="number" value={form.price} onChange={(event) => update('price', event.target.value)} /></label>
          <label className="form-field"><span>Giá cũ</span><input min="0" type="number" value={form.oldPrice} onChange={(event) => update('oldPrice', event.target.value)} /></label>
          <label className="form-field"><span>Tồn kho *</span><input required min="0" type="number" value={form.stock} onChange={(event) => update('stock', event.target.value)} /></label>
          <label className="form-field"><span>Trạng thái</span><select value={form.status} onChange={(event) => update('status', event.target.value)}><option value="active">Đang bán</option><option value="inactive">Ngừng bán</option></select></label>
          {kind === 'product' && <>
            <label className="form-field"><span>RAM</span><input value={form.ram} onChange={(event) => update('ram', event.target.value)} /></label>
            <label className="form-field"><span>Bộ nhớ</span><input value={form.storage} onChange={(event) => update('storage', event.target.value)} /></label>
            <label className="form-field"><span>Màn hình</span><input value={form.screen} onChange={(event) => update('screen', event.target.value)} /></label>
            <label className="form-field"><span>Pin</span><input value={form.battery} onChange={(event) => update('battery', event.target.value)} /></label>
            <label className="form-field"><span>Camera</span><input value={form.camera} onChange={(event) => update('camera', event.target.value)} /></label>
            <label className="form-field"><span>Chip</span><input value={form.chip} onChange={(event) => update('chip', event.target.value)} /></label>
          </>}
          <label className="form-field full"><span>URL hình ảnh (để trống dùng ảnh mẫu)</span><input value={form.image} onChange={(event) => update('image', event.target.value)} /></label>
          <label className="form-field full"><span>Mô tả *</span><textarea required rows="4" value={form.description} onChange={(event) => update('description', event.target.value)} /></label>
        </div>
        <div className="admin-modal-actions"><button type="button" className="btn btn-light" onClick={onClose}>Hủy</button><button className="btn btn-primary">{item ? 'Lưu thay đổi' : 'Thêm mới'}</button></div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Write the test**

Create `frontend/src/components/admin/ProductFormModal.test.jsx`:

```jsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProductFormModal from './ProductFormModal';
import { adminApi } from '../../api/adminApi';

vi.mock('../../api/adminApi', () => ({
  adminApi: {
    brands: { getAll: vi.fn() },
    categories: { getAll: vi.fn() },
  },
}));

describe('ProductFormModal', () => {
  it('submits the selected brandId and categoryId instead of free text', async () => {
    adminApi.brands.getAll.mockResolvedValue([
      { id: 'brand-1', name: 'Apple', active: true },
      { id: 'brand-2', name: 'Samsung', active: true },
    ]);
    adminApi.categories.getAll.mockResolvedValue([
      { id: 'category-1', name: 'Điện thoại', active: true },
    ]);
    const onSubmit = vi.fn();

    render(<ProductFormModal open item={null} kind="product" onClose={vi.fn()} onSubmit={onSubmit} />);

    await waitFor(() => expect(screen.getByText('Apple')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/tên sản phẩm/i), { target: { value: 'iPhone Test' } });
    fireEvent.change(screen.getByLabelText(/thương hiệu/i), { target: { value: 'brand-2' } });
    fireEvent.change(screen.getByLabelText(/danh mục/i), { target: { value: 'category-1' } });
    fireEvent.change(screen.getByLabelText(/giá bán/i), { target: { value: '1000' } });
    fireEvent.change(screen.getByLabelText(/tồn kho/i), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(/mô tả/i), { target: { value: 'demo' } });

    fireEvent.click(screen.getByRole('button', { name: 'Thêm mới' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.brandId).toBe('brand-2');
    expect(payload.categoryId).toBe('category-1');
    expect(payload.brand).toBeUndefined();
    expect(payload.category).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run the test**

Run: `cd frontend && npx vitest run src/components/admin/ProductFormModal.test.jsx`
Expected: 1 passed.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/admin/ProductFormModal.jsx frontend/src/components/admin/ProductFormModal.test.jsx
git commit -m "feat: select brand and category from taxonomy dropdowns in the product form"
```

---

### Task 5: Wire mock Product/Accessory catalog data to brandId/categoryId

**Files:**
- Modify: `frontend/src/mock/mockProducts.js`
- Modify: `frontend/src/mock/mockAccessories.js`

**Interfaces:**
- Consumes: `brandIdByName`, `categoryIdByName` from `frontend/src/mock/mockTaxonomy.js` (Task 2).
- Produces: every mock product/accessory now has `brandId`, `categoryId` (matching the ids in `mockTaxonomy.js`) in addition to the existing `brand`, `category` display-name fields — mirroring the backend's denormalized shape from Task 3.

- [ ] **Step 1: Add brandId/categoryId to mockProducts.js**

In `frontend/src/mock/mockProducts.js`, add the import:

```js
import { brandIdByName, categoryIdByName } from './mockTaxonomy';
```

In the `mockProducts` mapping, add `brandId` and `categoryId` alongside the existing `brand`/`category` fields:

```js
export const mockProducts = catalog.map(([name, brand, price, oldPrice, ram, storage, color], index) => {
  const id = `phone-${index + 1}`;
  const image = makeProductImage(name, color);
  return {
    id,
    name,
    brandId: brandIdByName[brand],
    brand,
    categoryId: categoryIdByName['Điện thoại'],
    category: 'Điện thoại',
    price,
```

(keep every other field in the returned object exactly as it is today — only the object literal's opening lines change).

- [ ] **Step 2: Add brandId/categoryId to mockAccessories.js**

In `frontend/src/mock/mockAccessories.js`, add the import:

```js
import { brandIdByName, categoryIdByName } from './mockTaxonomy';
```

In the `mockAccessories` mapping, add `brandId`/`categoryId`:

```js
export const mockAccessories = accessoryCatalog.map(
  ([name, brand, category, price, oldPrice, color], index) => {
    const image = makeAccessoryImage(name, color);
    return {
      id: `accessory-${index + 1}`,
      name,
      brandId: brandIdByName[brand],
      brand,
      categoryId: categoryIdByName[category],
      category,
      price,
```

(keep the rest of the returned object unchanged).

- [ ] **Step 3: Verify every brand/category name in the catalogs resolves**

Run: `cd frontend && node -e "
const { mockProducts } = require('./src/mock/mockProducts.js');
" 2>&1 | head -5`

This project uses ES modules, so instead verify via a quick Vitest smoke check — create a throwaway test run:

Run: `cd frontend && npx vitest run --reporter=verbose src/pages/Home.test.jsx`
Expected: still 1 passed (Home renders using `productApi`/`accessoryApi`, which in a real run would hit `mockProducts`/`mockAccessories`; the existing test mocks those modules directly, so this only confirms no import-time crash was introduced elsewhere in the bundle graph).

Then add a temporary sanity check by running the dev server and visiting `/products` and `/accessories` in the browser (documented in Task 9's manual verification step) — every card's brand/category badge should render a real name, not `undefined`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/mock/mockProducts.js frontend/src/mock/mockAccessories.js
git commit -m "feat: link mock product and accessory catalog data to brandId/categoryId"
```

---

### Task 6: Checkout momo/card payment confirmation flow

**Files:**
- Modify: `frontend/src/pages/Checkout.jsx`
- Create: `frontend/src/pages/Checkout.test.jsx`

**Interfaces:**
- Consumes: `PAYMENT_METHODS` from `frontend/src/utils/constants.js` (unchanged, already lists `momo`/`card`).

- [ ] **Step 1: Generalize the confirmation step state**

In `frontend/src/pages/Checkout.jsx`, replace:

```jsx
  const [bankTransferStep, setBankTransferStep] = useState(false);
  const [paymentReference] = useState(() => `TP${Date.now().toString().slice(-8)}`);
  const bankTransferRef = useRef(null);
```

with:

```jsx
  const [paymentConfirmStep, setPaymentConfirmStep] = useState(false);
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '' });
  const [paymentReference] = useState(() => `TP${Date.now().toString().slice(-8)}`);
  const paymentConfirmRef = useRef(null);
```

Add a constant near the top of the file, above `const paymentHint = ...`:

```jsx
const PAYMENT_CONFIRM_METHODS = ['bank', 'momo', 'card'];
```

- [ ] **Step 2: Update paymentHint for momo/card**

Replace:

```jsx
const paymentHint = (method) => {
  if (method === 'cod') return 'Thanh toán trực tiếp cho nhân viên giao hàng';
  if (method === 'bank') return 'Quét mã QR và xác nhận đã chuyển khoản trước khi đặt hàng';
  return 'Thông tin thanh toán sẽ được hướng dẫn sau khi đặt hàng';
};
```

with:

```jsx
const paymentHint = (method) => {
  if (method === 'cod') return 'Thanh toán trực tiếp cho nhân viên giao hàng';
  if (method === 'bank') return 'Quét mã QR và xác nhận đã chuyển khoản trước khi đặt hàng';
  if (method === 'momo') return 'Quét mã QR trong ứng dụng MoMo và xác nhận trước khi đặt hàng';
  if (method === 'card') return 'Nhập thông tin thẻ demo và xác nhận trước khi đặt hàng';
  return 'Thông tin thanh toán sẽ được hướng dẫn sau khi đặt hàng';
};
```

Add a MoMo QR URL memo next to the existing `bankQrUrl` memo:

```jsx
  const momoQrUrl = useMemo(
    () => `https://placehold.co/300x300/a50064/ffffff?text=${encodeURIComponent(`MoMo ${transferContent}`)}`,
    [transferContent],
  );
```

- [ ] **Step 3: Update the `update`, `createOrder`, and `submit` handlers**

Replace:

```jsx
  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
    if (key === 'paymentMethod') setBankTransferStep(false);
  };
```

with:

```jsx
  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
    if (key === 'paymentMethod') setPaymentConfirmStep(false);
  };
```

Replace the `note` line inside `createOrder`:

```jsx
        note: [form.note.trim(), form.paymentMethod === 'bank' ? `Ma chuyen khoan: ${transferContent}` : '']
          .filter(Boolean)
          .join('\n'),
```

with:

```jsx
        note: [
          form.note.trim(),
          form.paymentMethod === 'bank' ? `Ma chuyen khoan: ${transferContent}` : '',
          form.paymentMethod === 'momo' ? `Ma giao dich MoMo: ${transferContent}` : '',
          form.paymentMethod === 'card' ? 'Da xac nhan thanh toan the (demo)' : '',
        ]
          .filter(Boolean)
          .join('\n'),
```

Replace the `submit` function:

```jsx
  const submit = async (event) => {
    event.preventDefault();
    if (!validateCheckout()) return;

    if (form.paymentMethod === 'bank' && !bankTransferStep) {
      setBankTransferStep(true);
      toast.info('Vui lòng quét mã QR và bấm đã chuyển khoản sau khi thanh toán.');
      requestAnimationFrame(() => bankTransferRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }

    await createOrder();
  };
```

with:

```jsx
  const submit = async (event) => {
    event.preventDefault();
    if (!validateCheckout()) return;

    if (PAYMENT_CONFIRM_METHODS.includes(form.paymentMethod) && !paymentConfirmStep) {
      setPaymentConfirmStep(true);
      toast.info('Vui lòng xác nhận thanh toán trước khi hoàn tất đơn hàng.');
      requestAnimationFrame(() => paymentConfirmRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }

    await createOrder();
  };
```

- [ ] **Step 4: Replace the bank-only confirmation section with per-method sections**

Replace:

```jsx
            {bankTransferStep && (
              <section className="panel checkout-section bank-transfer-section" ref={bankTransferRef}>
                <h2><FiCreditCard /> Thanh toán chuyển khoản</h2>
                <div className="bank-transfer-grid">
                  <div className="bank-qr-card">
                    <img src={bankQrUrl} alt="Mã QR chuyển khoản TechPhone" />
                  </div>
                  <div className="bank-transfer-info">
                    <span>Quét QR hoặc chuyển khoản thủ công</span>
                    <h3>{BANK_TRANSFER.bankName}</h3>
                    <div><small>Số tài khoản</small><strong>{BANK_TRANSFER.accountNumber}</strong></div>
                    <div><small>Chủ tài khoản</small><strong>{BANK_TRANSFER.accountName}</strong></div>
                    <div><small>Chi nhánh</small><strong>{BANK_TRANSFER.branch}</strong></div>
                    <div><small>Số tiền</small><strong>{formatCurrency(cart.total)}</strong></div>
                    <div><small>Nội dung chuyển khoản</small><strong>{transferContent}</strong></div>
                  </div>
                </div>
                <p className="bank-transfer-note">
                  Sau khi chuyển khoản, bấm <strong>Tôi đã chuyển khoản</strong> để hoàn tất đơn hàng.
                  Nhân viên TechPhone sẽ đối soát và xác nhận thanh toán.
                </p>
              </section>
            )}
```

with:

```jsx
            {paymentConfirmStep && form.paymentMethod === 'bank' && (
              <section className="panel checkout-section bank-transfer-section" ref={paymentConfirmRef}>
                <h2><FiCreditCard /> Thanh toán chuyển khoản</h2>
                <div className="bank-transfer-grid">
                  <div className="bank-qr-card">
                    <img src={bankQrUrl} alt="Mã QR chuyển khoản TechPhone" />
                  </div>
                  <div className="bank-transfer-info">
                    <span>Quét QR hoặc chuyển khoản thủ công</span>
                    <h3>{BANK_TRANSFER.bankName}</h3>
                    <div><small>Số tài khoản</small><strong>{BANK_TRANSFER.accountNumber}</strong></div>
                    <div><small>Chủ tài khoản</small><strong>{BANK_TRANSFER.accountName}</strong></div>
                    <div><small>Chi nhánh</small><strong>{BANK_TRANSFER.branch}</strong></div>
                    <div><small>Số tiền</small><strong>{formatCurrency(cart.total)}</strong></div>
                    <div><small>Nội dung chuyển khoản</small><strong>{transferContent}</strong></div>
                  </div>
                </div>
                <p className="bank-transfer-note">
                  Sau khi chuyển khoản, bấm <strong>Tôi đã chuyển khoản</strong> để hoàn tất đơn hàng.
                  Nhân viên TechPhone sẽ đối soát và xác nhận thanh toán.
                </p>
              </section>
            )}

            {paymentConfirmStep && form.paymentMethod === 'momo' && (
              <section className="panel checkout-section bank-transfer-section" ref={paymentConfirmRef}>
                <h2><FiCreditCard /> Thanh toán qua MoMo</h2>
                <div className="bank-transfer-grid">
                  <div className="bank-qr-card">
                    <img src={momoQrUrl} alt="Mã QR thanh toán MoMo" />
                  </div>
                  <div className="bank-transfer-info">
                    <span>Quét mã trong ứng dụng MoMo</span>
                    <h3>Ví MoMo TechPhone</h3>
                    <div><small>Số điện thoại nhận</small><strong>0900 000 000</strong></div>
                    <div><small>Số tiền</small><strong>{formatCurrency(cart.total)}</strong></div>
                    <div><small>Nội dung chuyển</small><strong>{transferContent}</strong></div>
                  </div>
                </div>
                <p className="bank-transfer-note">
                  Sau khi thanh toán trong app MoMo, bấm <strong>Tôi đã thanh toán</strong> để hoàn tất đơn hàng.
                </p>
              </section>
            )}

            {paymentConfirmStep && form.paymentMethod === 'card' && (
              <section className="panel checkout-section bank-transfer-section" ref={paymentConfirmRef}>
                <h2><FiCreditCard /> Thanh toán bằng thẻ</h2>
                <div className="form-grid">
                  <label className="form-field full">
                    <span>Số thẻ</span>
                    <input
                      inputMode="numeric"
                      placeholder="4242 4242 4242 4242"
                      value={cardDetails.number}
                      onChange={(event) => setCardDetails((current) => ({ ...current, number: event.target.value }))}
                    />
                  </label>
                  <label className="form-field">
                    <span>Ngày hết hạn</span>
                    <input
                      placeholder="MM/YY"
                      value={cardDetails.expiry}
                      onChange={(event) => setCardDetails((current) => ({ ...current, expiry: event.target.value }))}
                    />
                  </label>
                  <label className="form-field">
                    <span>CVV</span>
                    <input
                      placeholder="123"
                      value={cardDetails.cvv}
                      onChange={(event) => setCardDetails((current) => ({ ...current, cvv: event.target.value }))}
                    />
                  </label>
                </div>
                <p className="bank-transfer-note">
                  Đây là form thẻ giả lập cho mục đích demo, không kết nối cổng thanh toán thật và không được lưu lại.
                  Bấm <strong>Tôi đã thanh toán</strong> để hoàn tất đơn hàng.
                </p>
              </section>
            )}
```

- [ ] **Step 5: Update the submit button and back link**

Replace:

```jsx
            <button className="btn btn-primary checkout-button" disabled={submitting}>
              {submitting
                ? 'Đang tạo đơn hàng...'
                : bankTransferStep
                  ? 'Tôi đã chuyển khoản'
                  : form.paymentMethod === 'bank'
                    ? 'Tiếp tục thanh toán'
                    : 'Xác nhận đặt hàng'}
            </button>
            {bankTransferStep && (
              <>
                <button type="button" className="bank-edit-button" onClick={() => setBankTransferStep(false)}>
                  Quay lại sửa thông tin
                </button>
                <p className="checkout-address-note">
                  <FiCheckCircle /> Chưa tạo đơn hàng cho tới khi bạn xác nhận đã chuyển khoản
                </p>
              </>
            )}
```

with:

```jsx
            <button className="btn btn-primary checkout-button" disabled={submitting}>
              {submitting
                ? 'Đang tạo đơn hàng...'
                : paymentConfirmStep
                  ? 'Tôi đã thanh toán'
                  : PAYMENT_CONFIRM_METHODS.includes(form.paymentMethod)
                    ? 'Tiếp tục thanh toán'
                    : 'Xác nhận đặt hàng'}
            </button>
            {paymentConfirmStep && (
              <>
                <button type="button" className="bank-edit-button" onClick={() => setPaymentConfirmStep(false)}>
                  Quay lại sửa thông tin
                </button>
                <p className="checkout-address-note">
                  <FiCheckCircle /> Chưa tạo đơn hàng cho tới khi bạn xác nhận đã thanh toán
                </p>
              </>
            )}
```

- [ ] **Step 6: Write the test**

Create `frontend/src/pages/Checkout.test.jsx`:

```jsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Checkout from './Checkout';
import { orderApi } from '../api/orderApi';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';

vi.mock('../api/orderApi', () => ({ orderApi: { create: vi.fn() } }));
vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../hooks/useCart', () => ({ useCart: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), info: vi.fn() } }));

const cartItem = { id: 'phone-1', name: 'iPhone Test', image: 'img.png', price: 1000000, quantity: 1 };

describe('Checkout momo/card flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { fullName: 'Test User', email: 'test@example.com', phone: '0911111111', address: 'Test address' } });
    useCart.mockReturnValue({
      cartItems: [cartItem],
      cartCount: 1,
      subtotal: 1000000,
      shippingFee: 30000,
      discount: 0,
      total: 1030000,
      voucher: null,
      clearCart: vi.fn(),
    });
    orderApi.create.mockResolvedValue({ id: 'order-1' });
  });

  it('shows a MoMo confirmation step before creating the order', async () => {
    render(<MemoryRouter><Checkout /></MemoryRouter>);

    fireEvent.click(screen.getByLabelText(/ví điện tử momo/i));
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục thanh toán' }));

    expect(await screen.findByRole('heading', { name: /thanh toán qua momo/i })).toBeInTheDocument();
    expect(orderApi.create).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Tôi đã thanh toán' }));

    await waitFor(() => expect(orderApi.create).toHaveBeenCalledTimes(1));
    expect(orderApi.create.mock.calls[0][0].paymentMethod).toBe('momo');
  });

  it('shows a card confirmation step before creating the order', async () => {
    render(<MemoryRouter><Checkout /></MemoryRouter>);

    fireEvent.click(screen.getByLabelText(/thẻ ngân hàng/i));
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục thanh toán' }));

    expect(await screen.findByRole('heading', { name: /thanh toán bằng thẻ/i })).toBeInTheDocument();
    expect(orderApi.create).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Tôi đã thanh toán' }));

    await waitFor(() => expect(orderApi.create).toHaveBeenCalledTimes(1));
    expect(orderApi.create.mock.calls[0][0].paymentMethod).toBe('card');
  });
});
```

- [ ] **Step 7: Run the test**

Run: `cd frontend && npx vitest run src/pages/Checkout.test.jsx`
Expected: 2 passed.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/Checkout.jsx frontend/src/pages/Checkout.test.jsx
git commit -m "feat: add simulated MoMo and card payment confirmation steps to checkout"
```

---

### Task 7: Admin order list/detail shows payment method

**Files:**
- Modify: `frontend/src/pages/admin/OrderManagement.jsx`
- Create: `frontend/src/pages/admin/OrderManagement.test.jsx`

- [ ] **Step 1: Add the paymentMethod column and detail row**

In `frontend/src/pages/admin/OrderManagement.jsx`, add the import:

```jsx
import { ORDER_STATUSES, PAYMENT_METHODS } from '../../utils/constants';
```

(replacing the existing `import { ORDER_STATUSES } from '../../utils/constants';` line).

Add a helper above the component:

```jsx
const paymentMethodLabel = (value) => PAYMENT_METHODS.find((method) => method.value === value)?.label || value;
```

In the `columns` array, insert a new column after `total` and before `status`:

```jsx
    { key: 'total', label: 'Tổng tiền', render: (order) => <strong>{formatCurrency(order.total)}</strong> },
    { key: 'paymentMethod', label: 'Thanh toán', render: (order) => <span className="payment-method-badge">{paymentMethodLabel(order.paymentMethod)}</span> },
    { key: 'status', label: 'Trạng thái', render: (order) => <select className={`status-select ${getOrderStatus(order.status).className}`} value={order.status} onChange={(event) => updateStatus(order, event.target.value)}>{ORDER_STATUSES.map((status) => <option value={status} key={status}>{getOrderStatus(status).label}</option>)}</select> },
```

In the order-detail modal JSX, add a payment-method row right after the customer info block and before the item list. Replace:

```jsx
<div className="admin-order-customer"><div><small>Khách hàng</small><strong>{selectedOrder.customer.fullName}</strong><span>{selectedOrder.customer.phone}</span></div><div><small>Địa chỉ giao hàng</small><strong>{selectedOrder.customer.address}</strong></div></div>
```

with:

```jsx
<div className="admin-order-customer"><div><small>Khách hàng</small><strong>{selectedOrder.customer.fullName}</strong><span>{selectedOrder.customer.phone}</span></div><div><small>Địa chỉ giao hàng</small><strong>{selectedOrder.customer.address}</strong></div><div><small>Phương thức thanh toán</small><strong>{paymentMethodLabel(selectedOrder.paymentMethod)}</strong></div></div>
```

- [ ] **Step 2: Write the test**

Create `frontend/src/pages/admin/OrderManagement.test.jsx`:

```jsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import OrderManagement from './OrderManagement';
import { orderApi } from '../../api/orderApi';

vi.mock('../../api/orderApi', () => ({
  orderApi: { getAllAdmin: vi.fn(), updateStatus: vi.fn() },
}));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn() } }));

const order = {
  id: 'order-1',
  orderNumber: 'TP260601',
  customer: { fullName: 'Nguyen Van A', phone: '0911111111', address: '123 Test St' },
  createdAt: '2026-06-01T00:00:00.000Z',
  items: [{ id: 'item-1', name: 'iPhone Test', image: 'img.png', price: 1000000, quantity: 1 }],
  total: 1000000,
  status: 'pending',
  paymentMethod: 'momo',
};

describe('OrderManagement payment method display', () => {
  it('shows the payment method in the list and detail modal', async () => {
    orderApi.getAllAdmin.mockResolvedValue([order]);

    render(<OrderManagement />);

    expect(await screen.findByText('Ví điện tử MoMo')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '' }));

    expect(await screen.findByText('Phương thức thanh toán')).toBeInTheDocument();
    expect(screen.getAllByText('Ví điện tử MoMo').length).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 3: Run the test**

Run: `cd frontend && npx vitest run src/pages/admin/OrderManagement.test.jsx`
Expected: 1 passed.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/admin/OrderManagement.jsx frontend/src/pages/admin/OrderManagement.test.jsx
git commit -m "feat: show payment method in the admin order list and detail modal"
```

---

### Task 8: Mock order sample data covers all four payment methods

**Files:**
- Modify: `frontend/src/mock/mockOrders.js`

**Interfaces:** none (internal mock data only).

- [ ] **Step 1: Cycle through all four payment methods**

In `frontend/src/mock/mockOrders.js`, replace:

```js
    paymentMethod: index % 2 ? 'bank' : 'cod',
```

with:

```js
    paymentMethod: ['cod', 'bank', 'momo', 'card'][index % 4],
```

- [ ] **Step 2: Manually verify in mock mode**

Run: `cd frontend && npm run dev`
Then, with the dev server running and `VITE_USE_MOCK=true` (the default), log in as `admin@gmail.com` / `123456`, open **Quản lý đơn hàng**, and confirm the payment-method column shows a mix of COD / Chuyển khoản / MoMo / Thẻ across the 5 seeded mock orders. Stop the dev server afterward.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/mock/mockOrders.js
git commit -m "feat: cycle mock order sample data through all four payment methods"
```

---

### Task 9: Final verification pass

**Files:** none (verification only; fix any files as needed if a check fails).

- [ ] **Step 1: Frontend lint**

Run: `cd frontend && npm run lint`
Expected: no errors. Fix any reported issues in files touched by this plan and re-run.

- [ ] **Step 2: Frontend full test suite**

Run: `cd frontend && npm run test:run`
Expected: all suites pass, including every test file created in Tasks 1–8.

- [ ] **Step 3: Frontend production build**

Run: `cd frontend && npm run build`
Expected: build completes with no errors.

- [ ] **Step 4: Backend full test suite**

Run: `cd backend && npm test`
Expected: all suites pass (this re-confirms Task 3 Step 8 after all later frontend-only tasks, since none of them touch the backend).

- [ ] **Step 5: Backend coverage gate**

Run: `cd backend && npm run test:coverage`
Expected: passes the existing 80% threshold on `src/utils` and `voucherService` (this plan does not touch those files, so this should be unaffected — run it to confirm no regression).

- [ ] **Step 6: Dependency audit**

Run: `cd frontend && npm audit --production` and `cd backend && npm audit --production`
Expected: no new high/critical vulnerabilities introduced by this work (this plan adds no new dependencies). Report any pre-existing findings to the user rather than attempting unrelated dependency upgrades.

- [ ] **Step 7: Docker end-to-end smoke check**

Run: `docker compose up -d --build`
Then: `docker compose exec backend npm run seed`
Then manually verify in a browser with `VITE_USE_MOCK=false` (or by hitting the containerized frontend at `http://localhost:3000`):
- Homepage category carousel autoplays and pauses on hover.
- Admin → Thương hiệu/Danh mục: create/edit a brand with a logo URL and a category with a description.
- Admin → Sản phẩm: add/edit a product using the brand/category dropdowns.
- Checkout: complete an order with `momo` and with `card`, confirming each shows its confirmation step before the order is created.
- Admin → Đơn hàng: confirm the payment method column and detail modal show the correct label for the orders just created.

Run: `docker compose down` when done.

- [ ] **Step 8: Fix any regressions found**

If any step above fails, diagnose and fix in the relevant file from Tasks 1–8, re-run the failing step, and repeat until every step in this task passes cleanly.

- [ ] **Step 9: Final commit (if fixes were needed)**

```bash
git add -A
git commit -m "fix: address regressions found during final verification pass"
```

(Skip this step if Steps 1–7 all passed without requiring changes.)

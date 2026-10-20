# Frontend Review Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. All implementation steps below are checked after verification.

**Goal:** Resolve the reviewed deployment, security, checkout, data-contract, accessibility, design-system, and performance defects so the TechPhone course demo behaves reliably in both mock mode and API mode.

**Architecture:** Keep the existing React/Vite and Express/MongoDB layers. Add small pure helpers for runtime configuration, pricing, order transitions, session storage, and settings normalization so behavior can be tested without mounting the whole app. Preserve all routes and API envelopes; use the existing backend services and repositories instead of bypassing layers.

**Tech Stack:** React 19, React Router 7, Vite 8, Vitest/Testing Library, Axios, Express 5, Mongoose 9, Jest/Supertest, Netlify frontend, Vercel-compatible backend.

## Global Constraints

- Work on the current non-main branch `devnguyen`; do not stage or overwrite unrelated untracked files under `docs/deployment/`.
- Follow TDD for behavior changes: add one failing regression test, confirm the expected failure, implement the smallest fix, then rerun the focused test.
- Preserve route slugs, Vietnamese UI copy intent, API envelope `{ success, message, data }`, and backend layering `routes → controllers → services → repositories → models`.
- `VITE_USE_MOCK=true` is the only value that enables mock mode; an absent value must never silently enable it.
- Real payment methods are visible only when their required merchant configuration exists.
- Keep `design.md` authoritative: modern-minimal Cobalt, Space Grotesk display, IBM Plex Sans body, JetBrains Mono metadata, 4-point spacing, token-only colors, and `overflow-x: clip`.
- Do not delete production files or routes.
- No deployment, push, or external service mutation is part of this plan.

---

### Task 1: Deployment and demo-safety blockers

**Files:**
- Create: `frontend/public/_redirects`
- Create: `frontend/src/utils/runtimeConfig.js`
- Create: `frontend/src/utils/runtimeConfig.test.js`
- Create: `frontend/src/pages/Login.test.jsx`
- Create: `frontend/scripts/generate-site-metadata.mjs`
- Create: `frontend/scripts/generate-site-metadata.test.js`
- Create: `backend/src/utils/seedCredentials.js`
- Create: `backend/tests/seed-credentials.test.js`
- Modify: `frontend/src/utils/constants.js`
- Modify: `frontend/src/pages/Login.jsx`
- Modify: `frontend/package.json`
- Modify: `frontend/index.html`
- Modify: `frontend/public/robots.txt`
- Modify: `frontend/public/sitemap.xml`
- Modify: `backend/src/seed/seed.js`
- Modify: `frontend/.env.example`
- Modify: `backend/.env.example`

**Interfaces:**
- Produces: `createRuntimeConfig(env)` returning `{ useMock, apiUrl, siteUrl, cloudinary }`.
- Produces: `resolveSeedPassword(env)` returning the local demo password or a validated production password.
- Consumers: all frontend API adapters continue importing `USE_MOCK` and `API_URL` from `constants.js`.

- [x] **Step 1: Write failing runtime configuration tests**

```js
import { describe, expect, it } from 'vitest';
import { createRuntimeConfig } from './runtimeConfig';

describe('createRuntimeConfig', () => {
  it('enables mock mode only for the exact string true', () => {
    expect(createRuntimeConfig({ VITE_USE_MOCK: 'true' }).useMock).toBe(true);
    expect(createRuntimeConfig({ VITE_USE_MOCK: 'false' }).useMock).toBe(false);
    expect(createRuntimeConfig({}).useMock).toBe(false);
  });

  it('requires an API URL for a production API build', () => {
    expect(() => createRuntimeConfig({ PROD: true, VITE_USE_MOCK: 'false' }))
      .toThrow('VITE_API_URL');
  });
});
```

- [x] **Step 2: Run the test and confirm RED**

Run: `cd frontend && npm run test:run -- src/utils/runtimeConfig.test.js`

Expected: FAIL because `runtimeConfig.js` does not exist.

- [x] **Step 3: Implement strict runtime configuration**

```js
export const createRuntimeConfig = (env = {}) => {
  const useMock = env.VITE_USE_MOCK === 'true';
  const apiUrl = env.VITE_API_URL || '';
  if (env.PROD && !useMock && !apiUrl) {
    throw new Error('VITE_API_URL is required when VITE_USE_MOCK is false');
  }
  return {
    useMock,
    apiUrl: apiUrl || 'http://localhost:5000/api',
    siteUrl: env.VITE_SITE_URL || 'http://localhost:5173',
    cloudinary: {
      cloudName: env.VITE_CLOUDINARY_CLOUD_NAME || '',
      uploadPreset: env.VITE_CLOUDINARY_UPLOAD_PRESET || '',
    },
  };
};

export const runtimeConfig = createRuntimeConfig(import.meta.env);
```

Update `constants.js` to export values from `runtimeConfig`.

- [x] **Step 4: Add the Netlify fallback and login regression test**

`frontend/public/_redirects` must contain exactly:

```text
/* /index.html 200
```

The Login test mounts with mock mode disabled and asserts that `admin@gmail.com` and `123456` are absent. `Login.jsx` renders `.mock-accounts` only when `USE_MOCK` is true.

- [x] **Step 5: Generate deployment-aware SEO metadata**

Add a `prebuild` script that runs `node scripts/generate-site-metadata.mjs`. The script normalizes `VITE_SITE_URL`, then writes `robots.txt` and `sitemap.xml` with that origin and the known static routes. `index.html` uses Vite’s `%VITE_SITE_URL%` replacement for canonical and structured-data URLs.

```js
export const normalizeSiteUrl = (value = 'http://localhost:5173') =>
  value.trim().replace(/\/+$/, '');

export const staticRoutes = [
  '/', '/products', '/accessories', '/compare', '/reviews',
  '/contact', '/order-lookup',
];
```

The generator test uses a temporary directory and asserts every emitted absolute URL uses the supplied Netlify origin.

- [x] **Step 6: Protect production seeding**

```js
const isStrong = (value = '') => value.length >= 12 && !['123456', 'password'].includes(value);

const resolveSeedPassword = (env = process.env) => {
  if ((env.NODE_ENV || 'development') !== 'production') return env.SEED_DEMO_PASSWORD || '123456';
  if (!isStrong(env.SEED_DEMO_PASSWORD)) {
    throw new Error('SEED_DEMO_PASSWORD must contain at least 12 characters in production');
  }
  return env.SEED_DEMO_PASSWORD;
};

module.exports = { resolveSeedPassword };
```

Use the returned password in `seed.js`. Document `SEED_DEMO_PASSWORD` in `backend/.env.example` and deployment-facing frontend variables in `frontend/.env.example`.

- [x] **Step 7: Verify GREEN**

Run:

```bash
cd frontend && npm run test:run -- src/utils/runtimeConfig.test.js src/pages/Login.test.jsx scripts/generate-site-metadata.test.js
cd backend && npx jest tests/seed-credentials.test.js --runInBand
```

Expected: all focused tests PASS.

- [x] **Step 8: Commit Task 1**

```bash
git add docs/superpowers/plans/2026-07-29-frontend-review-remediation.md frontend/public/_redirects frontend/src/utils/runtimeConfig.js frontend/src/utils/runtimeConfig.test.js frontend/src/utils/constants.js frontend/src/pages/Login.jsx frontend/src/pages/Login.test.jsx frontend/scripts/generate-site-metadata.mjs frontend/scripts/generate-site-metadata.test.js frontend/package.json frontend/index.html frontend/public/robots.txt frontend/public/sitemap.xml frontend/.env.example backend/src/utils/seedCredentials.js backend/src/seed/seed.js backend/tests/seed-credentials.test.js backend/.env.example
git commit -m "fix: secure demo deployment defaults"
```

---

### Task 2: Session refresh, logout, and safe return routing

**Files:**
- Create: `frontend/src/utils/authSession.js`
- Create: `frontend/src/utils/authSession.test.js`
- Create: `frontend/src/api/axiosClient.test.js`
- Modify: `frontend/src/utils/constants.js`
- Modify: `frontend/src/api/authApi.js`
- Modify: `frontend/src/api/axiosClient.js`
- Modify: `frontend/src/context/AuthContext.jsx`
- Modify: `frontend/src/pages/Login.jsx`
- Modify: `frontend/src/pages/Account.jsx`

**Interfaces:**
- Produces: `persistAuthSession(session)`, `clearAuthSession()`, and `safeInternalRedirect(value, fallback)`.
- `authApi.refresh(refreshToken)` returns a normal session.
- `authApi.logout(refreshToken)` revokes the backend refresh token.
- Axios retries one original request after a successful token refresh and redirects only after refresh failure.

- [x] **Step 1: Write failing pure-session tests**

```js
it('accepts only same-origin application paths', () => {
  expect(safeInternalRedirect('/checkout?step=payment', '/')).toBe('/checkout?step=payment');
  expect(safeInternalRedirect('//evil.example', '/')).toBe('/');
  expect(safeInternalRedirect('https://evil.example', '/')).toBe('/');
});

it('stores both access and refresh tokens', () => {
  persistAuthSession({ token: 'access', refreshToken: 'refresh', user: { id: 'u1' } });
  expect(storage.get(STORAGE_KEYS.token)).toBe('access');
  expect(storage.get(STORAGE_KEYS.refreshToken)).toBe('refresh');
});
```

- [x] **Step 2: Run and confirm RED**

Run: `cd frontend && npm run test:run -- src/utils/authSession.test.js`

Expected: FAIL because the helper and refresh-token storage key do not exist.

- [x] **Step 3: Implement session persistence and interceptor refresh**

Add `refreshToken` to `STORAGE_KEYS`. The interceptor must:

```js
if (status === 401 && !originalRequest._retry && refreshToken && !isAuthRefreshRequest) {
  originalRequest._retry = true;
  const session = await refreshSessionOnce(refreshToken);
  originalRequest.headers.Authorization = `Bearer ${session.token}`;
  return axiosClient(originalRequest);
}
```

Only one shared `refreshPromise` may run at a time. A failed refresh clears storage and redirects to:

```js
const intended = `${window.location.pathname}${window.location.search}${window.location.hash}`;
window.location.assign(`/login?redirect=${encodeURIComponent(intended)}`);
```

- [x] **Step 4: Connect AuthContext and Login**

`AuthContext.persistSession` stores both tokens. `logout` clears local state immediately and invokes `authApi.logout(refreshToken)` best-effort. Login resolves either router state or the `redirect` query with `safeInternalRedirect`.

Make the Account email input read-only and omit `email` from the update payload because the backend intentionally does not support unverified email changes.

- [x] **Step 5: Verify GREEN**

Run:

```bash
cd frontend && npm run test:run -- src/utils/authSession.test.js src/api/axiosClient.test.js src/pages/Login.test.jsx
```

Expected: safe redirects, refresh retry, refresh failure, and token persistence tests PASS.

- [x] **Step 6: Commit Task 2**

```bash
git add frontend/src/utils/authSession.js frontend/src/utils/authSession.test.js frontend/src/utils/constants.js frontend/src/api/authApi.js frontend/src/api/axiosClient.js frontend/src/api/axiosClient.test.js frontend/src/context/AuthContext.jsx frontend/src/pages/Login.jsx frontend/src/pages/Account.jsx frontend/src/pages/Login.test.jsx
git commit -m "fix: refresh expired frontend sessions"
```

---

### Task 3: Authoritative checkout totals and idempotent order creation

**Files:**
- Create: `frontend/src/utils/checkoutPricing.js`
- Create: `frontend/src/utils/checkoutPricing.test.js`
- Modify: `frontend/src/context/CartContext.jsx`
- Modify: `frontend/src/pages/Checkout.jsx`
- Modify: `frontend/src/pages/Checkout.test.jsx`
- Modify: `frontend/src/pages/PaymentResult.jsx`
- Modify: `frontend/src/pages/PaymentResult.test.jsx`
- Modify: `frontend/src/mock/mockDb.js`
- Modify: `frontend/src/api/orderApi.js`
- Modify: `frontend/src/api/paymentApi.js`
- Modify: `backend/src/models/Order.js`
- Modify: `backend/src/repositories/orderRepository.js`
- Modify: `backend/src/services/orderService.js`
- Modify: `backend/src/controllers/orderController.js`
- Modify: `backend/src/services/paymentService.js`
- Modify: `backend/src/config/env.js`
- Modify: `backend/.env.example`
- Modify: `backend/tests/order-dashboard.test.js`
- Modify: `backend/tests/payment.test.js`

**Interfaces:**
- Produces: `calculateVoucherDiscount(voucher, subtotal, shippingFee)`.
- `orderApi.create(payload, idempotencyKey)` sends the `Idempotency-Key` header.
- `Order.idempotencyKey` is sparse and unique; duplicate requests return the existing order without decrementing inventory twice.
- `/payments/config` returns enabled providers and only public merchant display data.

- [x] **Step 1: Write failing pricing tests**

```js
it('caps a shipping voucher at the province-specific fee', () => {
  const voucher = { type: 'shipping', value: 30000 };
  expect(calculateVoucherDiscount(voucher, 1000000, 20000)).toBe(20000);
});

it('invalidates a voucher after subtotal drops below its minimum', () => {
  const voucher = { type: 'fixed', value: 200000, minOrder: 3000000 };
  expect(calculateVoucherDiscount(voucher, 2000000, 30000)).toBe(0);
});
```

- [x] **Step 2: Run and confirm RED**

Run: `cd frontend && npm run test:run -- src/utils/checkoutPricing.test.js`

Expected: FAIL because the pricing helper does not exist.

- [x] **Step 3: Implement shared checkout pricing**

```js
export const calculateVoucherDiscount = (voucher, subtotal, shippingFee) => {
  if (!voucher || subtotal < Number(voucher.minOrder || 0)) return 0;
  if (voucher.type === 'percent') {
    return Math.min((subtotal * voucher.value) / 100, voucher.maxDiscount || Infinity);
  }
  if (voucher.type === 'fixed') return Math.min(voucher.value, subtotal);
  if (voucher.type === 'shipping') return Math.min(voucher.value, shippingFee);
  return 0;
};
```

Use it in both CartContext and Checkout. Checkout recalculates against `shipping.fee`; it does not reuse a discount calculated against the cart’s default shipping fee.

- [x] **Step 4: Add idempotent order creation RED tests**

The backend test sends two `POST /api/orders` requests with the same `Idempotency-Key` and asserts:

```js
expect(second.body.data.id).toBe(first.body.data.id);
expect(productAfter.stock).toBe(stockBefore - 1);
```

Run: `cd backend && npx jest tests/order-dashboard.test.js --runInBand`

Expected: FAIL because the second request creates another order.

- [x] **Step 5: Implement backend idempotency**

Add `idempotencyKey` to `Order`, add `findByIdempotencyKey`, pass request metadata from controller to service, and check before item normalization/inventory decrement:

```js
const key = String(metadata.idempotencyKey || '').trim().slice(0, 120);
if (key) {
  const existing = await orderRepository.findByIdempotencyKey(key);
  if (existing) return existing;
}
```

Persist `idempotencyKey: key || undefined` on the created order. Checkout keeps a stable key in a ref and uses a synchronous in-flight ref guard.

- [x] **Step 6: Preserve cart through VNPay failure**

Do not clear the cart in `startVnpayCheckout`. Store pending payment metadata plus the order ID. `PaymentResult` parses storage through the existing safe storage helper, clears the cart and pending key only when the callback is valid and has success code `00`; cancelled, invalid, stale, or malformed returns leave the cart intact and expose a retry link.

- [x] **Step 7: Hide unconfigured bank and MoMo**

Add backend env keys:

```text
BANK_NAME=
BANK_BIN=
BANK_ACCOUNT_NUMBER=
BANK_ACCOUNT_NAME=
MOMO_PHONE=
MOMO_ACCOUNT_NAME=
```

`paymentService.getConfig()` marks `bank` and `momo` enabled only when all required fields exist. Checkout renders only enabled providers and uses returned public display values; no demo account or phone is hardcoded in API mode.

- [x] **Step 8: Preserve production invariants in mock checkout**

`mockDb.createOrder` resolves each submitted item from the current mock catalog, rejects inactive/insufficient-stock lines, uses current prices, computes shipping and voucher discount with the same pure rules, and decrements stock only once per idempotency key.

- [x] **Step 9: Verify GREEN**

Run:

```bash
cd frontend && npm run test:run -- src/utils/checkoutPricing.test.js src/pages/Checkout.test.jsx src/pages/PaymentResult.test.jsx
cd backend && npx jest tests/order-dashboard.test.js tests/payment.test.js --runInBand
```

Expected: all focused tests PASS, duplicate requests return one order, and failed VNPay paths retain the cart.

- [x] **Step 10: Commit Task 3**

```bash
git add frontend/src/utils/checkoutPricing.js frontend/src/utils/checkoutPricing.test.js frontend/src/context/CartContext.jsx frontend/src/pages/Checkout.jsx frontend/src/pages/Checkout.test.jsx frontend/src/pages/PaymentResult.jsx frontend/src/pages/PaymentResult.test.jsx frontend/src/api/orderApi.js frontend/src/api/paymentApi.js frontend/src/mock/mockDb.js backend/src/models/Order.js backend/src/repositories/orderRepository.js backend/src/services/orderService.js backend/src/controllers/orderController.js backend/src/services/paymentService.js backend/src/config/env.js backend/.env.example backend/tests/order-dashboard.test.js backend/tests/payment.test.js
git commit -m "fix: make checkout totals and orders reliable"
```

---

### Task 4: Settings persistence and order-state contract

**Files:**
- Create: `frontend/src/api/settingsApi.js`
- Create: `frontend/src/utils/storeSettings.test.js`
- Create: `frontend/src/utils/orderStatus.test.js`
- Modify: `frontend/src/utils/storeSettings.js`
- Modify: `frontend/src/hooks/useStoreSettings.js`
- Modify: `frontend/src/pages/admin/SettingManagement.jsx`
- Modify: `frontend/src/utils/constants.js`
- Modify: `frontend/src/utils/orderStatus.js`
- Modify: `frontend/src/pages/admin/OrderManagement.jsx`
- Modify: `frontend/src/pages/admin/OrderManagement.test.jsx`
- Modify: `frontend/src/components/admin/SimpleCrudPage.jsx`
- Modify: `frontend/src/components/admin/CatalogManagement.jsx`
- Modify: `frontend/src/mock/mockDb.js`

**Interfaces:**
- `settingsApi.getPublic()` returns the normalized store-settings object.
- `settingsApi.saveAll(settings)` updates existing setting IDs or creates missing keys.
- `ORDER_STATUS_TRANSITIONS[current]` lists only legal next states.
- `getOrderStatus('delivered')` returns a delivered label instead of falling back to pending.

- [x] **Step 1: Write failing settings normalization and order-state tests**

```js
expect(normalizeSettings([
  { key: 'storeName', value: 'Phone Lab' },
  { key: 'hotline', value: '1900 0000' },
])).toMatchObject({ storeName: 'Phone Lab', hotline: '1900 0000' });

expect(getOrderStatus('delivered').label).toBe('Đã giao hàng');
expect(getNextOrderStatuses('pending')).toEqual(['confirmed', 'cancelled']);
```

- [x] **Step 2: Run and confirm RED**

Run: `cd frontend && npm run test:run -- src/utils/storeSettings.test.js src/utils/orderStatus.test.js`

Expected: settings normalizer and delivered transition helper are missing.

- [x] **Step 3: Implement API-backed settings**

In API mode, `settingsApi.getPublic()` calls `/settings`. In mock mode, it returns local settings. `saveAll` fetches `/admin/settings`, updates matching IDs, and creates missing keys. `useStoreSettings` first renders cached/default values, then refreshes from API and publishes a window event after successful saves.

`SettingManagement` owns loading/saving/error states, awaits writes, disables duplicate submits, and reports errors.

- [x] **Step 4: Implement one shared order-status contract**

```js
export const ORDER_STATUS_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipping', 'cancelled'],
  shipping: ['delivered', 'completed'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
};
```

OrderManagement renders the current status plus only legal next options, disables the select during mutation, restores the previous value on failure, and shows the backend error.

- [x] **Step 5: Guard core admin mutations**

SimpleCrudPage and CatalogManagement keep an in-flight mutation key, disable the affected action, catch validation/network failures, retain the current row/form on failure, and reload only after a confirmed write. Add focused assertions to the closest existing component tests.

- [x] **Step 6: Verify GREEN**

Run:

```bash
cd frontend && npm run test:run -- src/utils/storeSettings.test.js src/utils/orderStatus.test.js src/pages/admin/OrderManagement.test.jsx
```

Expected: all focused tests PASS.

- [x] **Step 7: Commit Task 4**

```bash
git add frontend/src/api/settingsApi.js frontend/src/utils/storeSettings.js frontend/src/utils/storeSettings.test.js frontend/src/hooks/useStoreSettings.js frontend/src/pages/admin/SettingManagement.jsx frontend/src/utils/constants.js frontend/src/utils/orderStatus.js frontend/src/utils/orderStatus.test.js frontend/src/pages/admin/OrderManagement.jsx frontend/src/pages/admin/OrderManagement.test.jsx frontend/src/components/admin/SimpleCrudPage.jsx frontend/src/components/admin/CatalogManagement.jsx frontend/src/mock/mockDb.js
git commit -m "fix: persist settings and align order states"
```

---

### Task 5: Catalog search, URL state, reorder, and API failure states

**Files:**
- Create: `frontend/src/components/common/LoadError.jsx`
- Create: `frontend/src/pages/Products.test.jsx`
- Create: `frontend/src/pages/Accessories.test.jsx`
- Create: `frontend/src/pages/Account.test.jsx`
- Modify: `frontend/src/pages/Products.jsx`
- Modify: `frontend/src/pages/Accessories.jsx`
- Modify: `frontend/src/pages/Favorites.jsx`
- Modify: `frontend/src/pages/Account.jsx`
- Modify: `frontend/src/pages/ProductCompare.jsx`
- Modify: `frontend/src/components/common/Header.jsx`
- Modify: `frontend/src/components/common/HeaderSearch.test.jsx`
- Modify: `backend/src/services/catalogService.js`
- Modify: `backend/tests/catalog.test.js`

**Interfaces:**
- Catalog URL parameters are the source of truth for `q`, `brand`, and `category`.
- `LoadError` accepts `{ message, onRetry }`.
- Backend keyword search matches product/accessory name, denormalized brand, and denormalized category.
- Reorder resolves each historical line through the current product/accessory API before adding available inventory.

- [x] **Step 1: Write failing URL synchronization tests**

The Products test navigates from `/products?q=iphone` to `/products?q=samsung` without remounting and asserts the search input changes to `samsung`. The Accessories test covers `brand` and `category`.

- [x] **Step 2: Run and confirm RED**

Run: `cd frontend && npm run test:run -- src/pages/Products.test.jsx src/pages/Accessories.test.jsx`

Expected: FAIL because component state is initialized from the URL only once.

- [x] **Step 3: Make URL parameters authoritative**

Derive filter state from `searchParams`, or add a guarded synchronization effect that updates local input/filter values when navigation changes. User edits update the URL after debounce without overwriting browser back/forward changes.

- [x] **Step 4: Add backend cross-field search test and implementation**

Test:

```js
const response = await request(app).get('/api/products?q=Apple');
expect(response.body.data.some((item) => item.brand === 'Apple')).toBe(true);
```

`CatalogService.buildFilter` builds an `$or` filter containing name regex and taxonomy IDs matched by brand/category names.

- [x] **Step 5: Distinguish errors from empty states**

Products, Accessories, Favorites, Account orders, and ProductCompare track `{ loading, error }`. A rejected request renders `LoadError` with a retry button; `EmptyState` is rendered only after a successful empty response.

- [x] **Step 6: Refresh historical reorder data**

For every order line, call `productApi.getById` or `accessoryApi.getById`. Add only items where `status === 'active'` and `stock > 0`, using current price/stock. Show one error toast listing unavailable item names.

- [x] **Step 7: Verify GREEN**

Run:

```bash
cd frontend && npm run test:run -- src/pages/Products.test.jsx src/pages/Accessories.test.jsx src/pages/Account.test.jsx src/components/common/HeaderSearch.test.jsx src/pages/Favorites.test.jsx
cd backend && npx jest tests/catalog.test.js --runInBand
```

Expected: all focused tests PASS.

- [x] **Step 8: Commit Task 5**

```bash
git add frontend/src/components/common/LoadError.jsx frontend/src/pages/Products.jsx frontend/src/pages/Products.test.jsx frontend/src/pages/Accessories.jsx frontend/src/pages/Accessories.test.jsx frontend/src/pages/Favorites.jsx frontend/src/pages/Account.jsx frontend/src/pages/Account.test.jsx frontend/src/pages/ProductCompare.jsx frontend/src/components/common/Header.jsx frontend/src/components/common/HeaderSearch.test.jsx backend/src/services/catalogService.js backend/tests/catalog.test.js
git commit -m "fix: keep catalog state and failures truthful"
```

---

### Task 6: Keyboard-safe cards, banners, drawers, dialogs, and forms

**Files:**
- Create: `frontend/src/components/common/AccessibleDialog.jsx`
- Create: `frontend/src/components/common/AccessibleDialog.test.jsx`
- Create: `frontend/src/components/product/ProductCard.test.jsx`
- Modify: `frontend/src/components/common/ConfirmModal.jsx`
- Modify: `frontend/src/components/common/Header.jsx`
- Modify: `frontend/src/components/common/Header.test.jsx`
- Modify: `frontend/src/components/common/Pagination.jsx`
- Modify: `frontend/src/components/product/ProductCard.jsx`
- Modify: `frontend/src/pages/Home.jsx`
- Modify: `frontend/src/pages/Home.test.jsx`
- Modify: `frontend/src/components/home/CategoryCarousel.jsx`
- Modify: `frontend/src/components/home/CategoryCarousel.test.jsx`
- Modify: `frontend/src/pages/Account.jsx`
- Modify: `frontend/src/components/admin/ProductFormModal.jsx`
- Modify: `frontend/src/components/admin/SimpleCrudPage.jsx`
- Modify: `frontend/src/pages/Checkout.jsx`

**Interfaces:**
- `AccessibleDialog` accepts `{ open, title, onClose, children, initialFocusRef, className }`.
- Closed drawers are absent from the DOM.
- Product card action buttons are siblings of the product-detail link.
- Inactive hero slides have `aria-hidden`, `tabIndex=-1`, `visibility:hidden`, and `pointer-events:none`.

- [x] **Step 1: Write failing accessibility tests**

```jsx
expect(screen.queryByRole('dialog', { name: /menu/i })).not.toBeInTheDocument();
await user.click(screen.getByRole('button', { name: /mở menu/i }));
expect(screen.getByRole('dialog', { name: /menu/i })).toBeInTheDocument();
await user.keyboard('{Escape}');
expect(screen.queryByRole('dialog', { name: /menu/i })).not.toBeInTheDocument();
```

ProductCard test asserts no button has an anchor ancestor. Home test asserts every inactive banner link has `tabindex="-1"` and `aria-hidden="true"`.

- [x] **Step 2: Run and confirm RED**

Run:

```bash
cd frontend && npm run test:run -- src/components/common/AccessibleDialog.test.jsx src/components/product/ProductCard.test.jsx src/components/common/Header.test.jsx src/pages/Home.test.jsx
```

Expected: tests FAIL on the current mounted drawer, nested actions, and focusable hidden slides.

- [x] **Step 3: Implement reusable accessible overlays**

Use native `<dialog>` when available, with a fallback for jsdom. On open call `showModal()`, focus the first meaningful control, close on native cancel/backdrop click, and restore focus to the trigger. Migrate ConfirmModal, product form, order details, and SimpleCrudPage overlays.

- [x] **Step 4: Fix drawer and search semantics**

Conditionally mount the mobile drawer, set `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-expanded` and `aria-controls` on the trigger, close on Escape, and restore trigger focus. Header search becomes a labelled combobox/listbox with `aria-expanded`, keyboard ArrowUp/ArrowDown selection, Enter, and Escape.

- [x] **Step 5: Fix cards, hero, pagination, and form errors**

Split ProductCard markup so image/title are the link and actions are sibling buttons. Add inactive slide semantics and CSS visibility/pointer-event rules. Give homepage and category autoplay a persistent pause/resume control, pause on hover/focus, and disable spatial autoplay for reduced-motion users. Add `aria-current="page"` to Pagination. Checkout/profile fields set `aria-invalid` and `aria-describedby` for inline errors.

- [x] **Step 6: Verify GREEN**

Run:

```bash
cd frontend && npm run test:run -- src/components/common/AccessibleDialog.test.jsx src/components/product/ProductCard.test.jsx src/components/common/Header.test.jsx src/components/common/HeaderSearch.test.jsx src/pages/Home.test.jsx src/components/home/CategoryCarousel.test.jsx src/pages/Checkout.test.jsx src/components/admin/ProductFormModal.test.jsx
```

Expected: all keyboard and semantic regression tests PASS.

- [x] **Step 7: Commit Task 6**

```bash
git add frontend/src/components/common/AccessibleDialog.jsx frontend/src/components/common/AccessibleDialog.test.jsx frontend/src/components/common/ConfirmModal.jsx frontend/src/components/common/Header.jsx frontend/src/components/common/Header.test.jsx frontend/src/components/common/HeaderSearch.test.jsx frontend/src/components/common/Pagination.jsx frontend/src/components/product/ProductCard.jsx frontend/src/components/product/ProductCard.test.jsx frontend/src/pages/Home.jsx frontend/src/pages/Home.test.jsx frontend/src/components/home/CategoryCarousel.jsx frontend/src/components/home/CategoryCarousel.test.jsx frontend/src/pages/Account.jsx frontend/src/components/admin/ProductFormModal.jsx frontend/src/components/admin/ProductFormModal.test.jsx frontend/src/components/admin/SimpleCrudPage.jsx frontend/src/pages/Checkout.jsx frontend/src/pages/Checkout.test.jsx
git commit -m "fix: make storefront interactions keyboard safe"
```

---

### Task 7: Hallmark token discipline, responsive safety, lazy routes, and durable image input

**Files:**
- Create: `frontend/src/assets/styles/designSystem.test.js`
- Create: `frontend/src/routes/LazyRoutes.test.jsx`
- Modify: `frontend/src/assets/styles/tokens.css`
- Modify: `frontend/src/assets/styles/main.css`
- Modify: `frontend/src/assets/styles/admin.css`
- Modify: `frontend/src/assets/styles/responsive.css`
- Modify: `frontend/src/assets/styles/redesign.css`
- Modify: `frontend/src/routes/AppRoutes.jsx`
- Modify: `frontend/src/api/uploadApi.js`
- Modify: `frontend/src/components/admin/AdminImageUpload.jsx`
- Modify: `frontend/src/components/admin/AdminImageUpload.test.jsx`
- Modify: `frontend/.env.example`

**Interfaces:**
- All color/font declarations outside `tokens.css` reference CSS variables.
- Both `html` and `body` use `overflow-x: clip`.
- Every page route is loaded with `React.lazy`; shared chrome and route guards remain eager.
- API-mode image upload uses configured Cloudinary unsigned upload, or accepts a durable external URL; it never silently stores Vercel-local URLs.

- [x] **Step 1: Write failing static design-system tests**

```js
it('keeps raw color values inside tokens.css only', () => {
  for (const file of ['main.css', 'admin.css', 'responsive.css', 'redesign.css']) {
    const css = readFileSync(resolve(stylesDir, file), 'utf8');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(/i);
  }
});

it('clips horizontal overflow without creating a scroll container', () => {
  const css = readFileSync(resolve(stylesDir, 'main.css'), 'utf8');
  expect(css).toMatch(/html[^}]*overflow-x:\s*clip/s);
  expect(css).toMatch(/body[^}]*overflow-x:\s*clip/s);
  expect(css).not.toMatch(/overflow-x:\s*hidden/);
});
```

- [x] **Step 2: Run and confirm RED**

Run: `cd frontend && npm run test:run -- src/assets/styles/designSystem.test.js`

Expected: FAIL on legacy hex/rgb values, Inter, and `overflow-x:hidden`.

- [x] **Step 3: Consolidate tokens**

Add semantic Cobalt tokens for every currently used surface, ink, status, overlay, and shadow. Convert `main.css`, `admin.css`, `responsive.css`, and `redesign.css` to `var(--token)` references. Replace `font-family: Inter` with `var(--font-body)`, replace freestyle z-index values with named z tokens, specify transition properties, and preserve the existing Hallmark macrostructure stamp.

- [x] **Step 4: Add route-level lazy loading**

Keep `Header`, `Footer`, guards, and layouts eager. Replace page imports with:

```jsx
const Home = lazy(() => import('../pages/Home'));
const Dashboard = lazy(() => import('../pages/admin/Dashboard'));
```

Wrap route output in one accessible `Suspense` fallback using the existing `Loading` component. Verify the built `index.html` no longer module-preloads Chart.js for storefront routes.

- [x] **Step 5: Prevent ephemeral image URLs**

If both Cloudinary variables exist, post the file directly to:

```js
`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
```

with `upload_preset`. In mock mode retain FileReader behavior. In API mode without Cloudinary, hide the file picker and render a labelled URL input; validate `https://` URLs before `onChange`. Do not call the Vercel filesystem endpoint in that state.

- [x] **Step 6: Verify GREEN**

Run:

```bash
cd frontend && npm run test:run -- src/assets/styles/designSystem.test.js src/routes/LazyRoutes.test.jsx src/components/admin/AdminImageUpload.test.jsx
cd frontend && npm run build
```

Expected: design-system tests PASS, lazy-route tests PASS, build exits 0, and the HTML entry does not preload the admin chart vendor.

- [x] **Step 7: Commit Task 7**

```bash
git add frontend/src/assets/styles/tokens.css frontend/src/assets/styles/main.css frontend/src/assets/styles/admin.css frontend/src/assets/styles/responsive.css frontend/src/assets/styles/redesign.css frontend/src/assets/styles/designSystem.test.js frontend/src/routes/AppRoutes.jsx frontend/src/routes/LazyRoutes.test.jsx frontend/src/api/uploadApi.js frontend/src/components/admin/AdminImageUpload.jsx frontend/src/components/admin/AdminImageUpload.test.jsx frontend/.env.example
git commit -m "fix: align frontend with the locked design system"
```

---

### Task 8: Whole-branch verification and review

**Files:**
- Modify only if verification exposes a concrete defect covered by a failing test.

**Interfaces:**
- Produces fresh evidence for lint, frontend tests, frontend build, backend tests, Netlify rewrite, and final code review.

- [x] **Step 1: Run frontend lint**

Run: `cd frontend && npm run lint`

Expected: exit 0 with no ESLint errors.

- [x] **Step 2: Run all frontend tests**

Run: `cd frontend && npm run test:run`

Expected: all test files PASS with zero failures.

- [x] **Step 3: Run production frontend build**

Run:

```bash
cd frontend
$env:VITE_USE_MOCK='false'
$env:VITE_API_URL='https://example-api.vercel.app/api'
npm run build
```

Expected: exit 0; `dist/_redirects` exists; storefront entry does not preload Chart.js.

- [x] **Step 4: Run all backend tests**

Run: `cd backend && npm test -- --runInBand`

Expected: all Jest suites PASS with zero failures.

- [x] **Step 5: Run final code review**

Review the complete branch diff against this plan. Critical and Important findings must be fixed with a new failing regression test and the relevant focused suite rerun. Minor findings are reported explicitly.

- [x] **Step 6: Run Hallmark handoff checks**

Load `references/slop-test.md` and `references/contract.md`. Verify token-only colors/fonts, responsive widths 320/375/414/768, keyboard navigation, reduced motion, contrast pair usage, and the existing `design.md` contract.

- [x] **Step 7: Record final repository state**

Run:

```bash
git status --short
git log --oneline --decorate -10
git diff --check
```

Expected: no unstaged implementation changes, no whitespace errors, and unrelated `docs/deployment/` files remain untouched.

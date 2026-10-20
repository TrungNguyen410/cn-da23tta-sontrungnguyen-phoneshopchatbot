# TechPhone Store Visual Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a cohesive, responsive TechPhone storefront and operations admin without changing routes, API contracts, or business behavior.

**Architecture:** Keep React route and API ownership unchanged. Add a token-based CSS foundation and focused shared presentation components, then restyle existing pages in three families: commerce, task flow, and admin workbench. Verify API behavior through the current Jest/Supertest suite and add frontend interaction coverage with Vitest.

**Tech Stack:** React 19, Vite 8, React Router 7, CSS custom properties, Bootstrap utility compatibility, Vitest, Testing Library, Express, MongoDB memory server, Jest, Supertest.

## Global Constraints

- Preserve every path in `frontend/src/routes/AppRoutes.jsx` exactly.
- Preserve public navigation labels, form field names, API module signatures, and backend architecture layers.
- Do not delete production files.
- Consume named tokens from `frontend/src/assets/styles/tokens.css`. Do not introduce inline color or font values in redesigned CSS.
- Use existing product, accessory, and banner imagery. Do not invent metrics or testimonials.
- Respect `prefers-reduced-motion` and keep interactions to transform and opacity.
- Keep desktop controls and links on one line. Verify 320px, 375px, 414px, and 768px layouts.
- Maintain `design.md` as the design-system source of truth.

## File Structure

- Create: `frontend/src/assets/styles/tokens.css` - semantic color, typography, spacing, radius, duration, and easing tokens.
- Create: `frontend/src/test/setup.js` - Testing Library matchers and browser API setup.
- Create: `frontend/src/test/renderWithProviders.jsx` - router and context test helper.
- Create: `frontend/src/components/common/SectionHeading.jsx` - reusable accessible heading/action pattern.
- Create: `frontend/src/components/common/StatusPill.jsx` - semantic order/review/status treatment.
- Modify: `frontend/package.json`, `frontend/vite.config.js` - test tooling and scripts.
- Modify: `frontend/src/main.jsx`, `frontend/src/assets/styles/main.css`, `responsive.css`, `admin.css` - token imports and global/shell styling.
- Modify: storefront pages and product/cart components under `frontend/src/pages/` and `frontend/src/components/` - design family presentation only.
- Modify: admin pages and components under `frontend/src/pages/admin/` and `frontend/src/components/admin/` - workbench presentation only.
- Modify: `backend/tests/swagger.test.js` and domain tests only when a test exposes a real API defect; fixes remain in the matching backend layer.

### Task 1: Establish frontend test harness and guard current routing

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.js`
- Create: `frontend/src/test/setup.js`
- Create: `frontend/src/test/renderWithProviders.jsx`
- Create: `frontend/src/routes/AppRoutes.test.jsx`

- [ ] **Step 1: Write failing route-contract tests**

```jsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppRoutes from './AppRoutes';

describe('store routes', () => {
  it('keeps the product detail path available', async () => {
    render(<MemoryRouter initialEntries={['/products/product-1']}><AppRoutes /></MemoryRouter>);
    expect(await screen.findByText(/iPhone|sản phẩm/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails because Vitest is not configured**

Run: `cd frontend && npm run test:run`

Expected: script-not-found failure.

- [ ] **Step 3: Add minimal Vitest configuration and setup**

```js
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', setupFiles: './src/test/setup.js' },
});
```

```js
// src/test/setup.js
import '@testing-library/jest-dom/vitest';
```

Add `test` and `test:run` scripts and the required Vitest, jsdom, and Testing Library development dependencies.

- [ ] **Step 4: Run route tests and the existing quality gate**

Run: `cd frontend && npm run test:run && npm run lint && npm run build`

Expected: all commands exit 0.

### Task 2: Add locked design tokens and modernize the shared shell

**Files:**
- Create: `frontend/src/assets/styles/tokens.css`
- Modify: `frontend/src/main.jsx`
- Modify: `frontend/src/assets/styles/main.css`
- Modify: `frontend/src/assets/styles/responsive.css`
- Modify: `frontend/src/components/common/Header.jsx`
- Modify: `frontend/src/components/common/Footer.jsx`
- Test: `frontend/src/components/common/Header.test.jsx`

- [ ] **Step 1: Write a failing header interaction test**

```jsx
it('opens and closes the mobile navigation', async () => {
  const user = userEvent.setup();
  render(<Header />, { wrapper: AppProviders });
  await user.click(screen.getByRole('button', { name: /mở menu/i }));
  expect(screen.getByRole('navigation', { name: /điều hướng di động/i })).toBeVisible();
  await user.click(screen.getByRole('button', { name: /đóng menu/i }));
  expect(screen.getByRole('navigation', { name: /điều hướng di động/i })).not.toBeVisible();
});
```

- [ ] **Step 2: Run the test and confirm the accessible contract is missing**

Run: `cd frontend && npm run test:run -- Header.test.jsx`

Expected: failure for the missing labelled mobile navigation or close button.

- [ ] **Step 3: Implement tokens and the shared-shell accessibility contract**

Create `tokens.css` using the values in `design.md`, import it before the existing stylesheet, then replace global hard-coded design values in `main.css` with token aliases. Add `aria-label="Điều hướng di động"` to the drawer nav and an explicit close label. Keep all existing links and submit behavior unchanged.

- [ ] **Step 4: Verify shell behavior, lint, and build**

Run: `cd frontend && npm run test:run -- Header.test.jsx && npm run lint && npm run build`

Expected: all commands exit 0 and no new horizontal overflow rules use `hidden`.

### Task 3: Rebuild the home and catalog discovery surfaces

**Files:**
- Create: `frontend/src/components/common/SectionHeading.jsx`
- Modify: `frontend/src/pages/Home.jsx`
- Modify: `frontend/src/pages/Products.jsx`
- Modify: `frontend/src/pages/Accessories.jsx`
- Modify: `frontend/src/components/product/ProductCard.jsx`
- Modify: `frontend/src/components/product/ProductGrid.jsx`
- Modify: `frontend/src/components/product/ProductFilter.jsx`
- Modify: `frontend/src/components/product/ProductSort.jsx`
- Test: `frontend/src/components/product/ProductCard.test.jsx`

- [ ] **Step 1: Write failing product-card tests**

```jsx
it('links to its product detail route and exposes add-to-cart action', async () => {
  render(<ProductCard product={product} />);
  expect(screen.getByRole('link', { name: new RegExp(product.name, 'i') }))
    .toHaveAttribute('href', `/products/${product.id}`);
  expect(screen.getByRole('button', { name: /thêm vào giỏ/i })).toBeEnabled();
});
```

- [ ] **Step 2: Run the test and record the current failure**

Run: `cd frontend && npm run test:run -- ProductCard.test.jsx`

Expected: failure until test fixtures and accessible action names are supplied.

- [ ] **Step 3: Implement the commerce presentation layer**

Use the locked tokens to create an asymmetric image-led home hero, varied category rail, product collection sections, and compact service assurance strip. Keep API requests, banner links, sorting, filters, and detail links unchanged. Refactor repeated section-heading markup into `SectionHeading` without replacing existing route components.

- [ ] **Step 4: Verify product discovery regressions**

Run: `cd frontend && npm run test:run -- ProductCard.test.jsx && npm run lint && npm run build`

Expected: product cards retain detail and cart actions and the build exits 0.

### Task 4: Rebuild product, accessory, cart, and checkout task flows

**Files:**
- Modify: `frontend/src/pages/ProductDetail.jsx`
- Modify: `frontend/src/pages/AccessoryDetail.jsx`
- Modify: `frontend/src/pages/Cart.jsx`
- Modify: `frontend/src/pages/Checkout.jsx`
- Modify: `frontend/src/pages/OrderSuccess.jsx`
- Modify: `frontend/src/components/cart/CartItem.jsx`
- Modify: `frontend/src/components/cart/CartSummary.jsx`
- Modify: `frontend/src/components/cart/VoucherBox.jsx`
- Test: `frontend/src/pages/Cart.test.jsx`
- Test: `frontend/src/pages/Checkout.test.jsx`

- [ ] **Step 1: Write failing cart and checkout tests**

```jsx
it('updates a cart line quantity from its visible control', async () => {
  const user = userEvent.setup();
  render(<Cart />, { wrapper: CartTestProviders });
  await user.click(screen.getByRole('button', { name: /tăng số lượng/i }));
  expect(screen.getByText(/tạm tính/i)).toBeInTheDocument();
});

it('keeps the named checkout fields available', () => {
  render(<Checkout />, { wrapper: CheckoutTestProviders });
  expect(screen.getByLabelText(/họ và tên/i)).toBeRequired();
  expect(screen.getByLabelText(/số điện thoại/i)).toBeRequired();
});
```

- [ ] **Step 2: Run the focused tests to confirm the needed accessibility hooks**

Run: `cd frontend && npm run test:run -- Cart.test.jsx Checkout.test.jsx`

Expected: failure until existing controls and labels have stable accessible names.

- [ ] **Step 3: Implement task-flow layouts without changing behavior**

Apply the Guided Task Flow family: gallery plus purchase panel for details, two-column cart summary, checkout focus order, and a calm confirmation page. Preserve cart context calls, payment values, voucher validation, form names, validation, and order submission data exactly.

- [ ] **Step 4: Verify interaction behavior and build**

Run: `cd frontend && npm run test:run -- Cart.test.jsx Checkout.test.jsx && npm run lint && npm run build`

Expected: cart and checkout contracts pass without console errors.

### Task 5: Rebuild account, order lookup, auth, reviews, and contact pages

**Files:**
- Modify: `frontend/src/pages/Account.jsx`
- Modify: `frontend/src/pages/OrderLookup.jsx`
- Modify: `frontend/src/pages/Login.jsx`
- Modify: `frontend/src/pages/Register.jsx`
- Modify: `frontend/src/pages/Reviews.jsx`
- Modify: `frontend/src/pages/Contact.jsx`
- Modify: `frontend/src/pages/NotFound.jsx`
- Test: `frontend/src/pages/OrderLookup.test.jsx`

- [ ] **Step 1: Write a failing order-lookup contract test**

```jsx
it('submits order number and phone to the lookup API', async () => {
  const user = userEvent.setup();
  render(<OrderLookup />);
  await user.type(screen.getByLabelText(/mã đơn hàng/i), 'TP260601');
  await user.type(screen.getByLabelText(/số điện thoại/i), '0911111111');
  await user.click(screen.getByRole('button', { name: /tra cứu/i }));
  expect(await screen.findByText(/trạng thái/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify fixture or accessibility gaps**

Run: `cd frontend && npm run test:run -- OrderLookup.test.jsx`

Expected: a meaningful red test before any behavior adjustments.

- [ ] **Step 3: Apply focused task-flow and content-page styling**

Restyle account navigation, lookup result, auth panels, review composition, contact actions, and empty/not-found states using tokens. Do not alter authentication calls, lookup parameters, review submit payloads, or contact form names.

- [ ] **Step 4: Verify the task-flow suite**

Run: `cd frontend && npm run test:run -- OrderLookup.test.jsx && npm run lint && npm run build`

Expected: all commands exit 0.

### Task 6: Rebuild admin dashboard and management workbench

**Files:**
- Modify: `frontend/src/pages/admin/AdminLayout.jsx`
- Modify: `frontend/src/components/admin/AdminSidebar.jsx`
- Modify: `frontend/src/components/admin/AdminHeader.jsx`
- Modify: `frontend/src/components/admin/DataTable.jsx`
- Modify: `frontend/src/components/admin/CatalogManagement.jsx`
- Modify: `frontend/src/components/admin/ProductFormModal.jsx`
- Modify: `frontend/src/components/admin/SimpleCrudPage.jsx`
- Modify: `frontend/src/components/admin/StatCard.jsx`
- Modify: all pages under `frontend/src/pages/admin/`
- Test: `frontend/src/components/admin/DataTable.test.jsx`

- [ ] **Step 1: Write a failing data-table action test**

```jsx
it('keeps the supplied row action available to keyboard users', async () => {
  const onEdit = vi.fn();
  render(<DataTable columns={columns} rows={rows} onEdit={onEdit} />);
  await userEvent.tab();
  expect(screen.getByRole('button', { name: /sửa/i })).toHaveFocus();
});
```

- [ ] **Step 2: Run the test and verify the expected failure**

Run: `cd frontend && npm run test:run -- DataTable.test.jsx`

Expected: failure until table actions have labels and deterministic tab access.

- [ ] **Step 3: Implement the Operations Workbench presentation**

Unify sidebar, header, dashboard cards, charts, filters, tables, modal forms, status selectors, and all management screens around the locked tokens. Preserve every admin route, API call, table action, filter value, validation rule, upload behavior, and modal submit behavior.

- [ ] **Step 4: Verify admin interaction and responsive behavior**

Run: `cd frontend && npm run test:run -- DataTable.test.jsx && npm run lint && npm run build`

Expected: all commands exit 0; sidebar remains usable at 768px and below.

### Task 7: Verify Swagger and repair only demonstrated backend defects

**Files:**
- Test: `backend/tests/swagger.test.js`
- Test: matching existing domain test in `backend/tests/`
- Modify only if a red test proves a defect: matching controller, service, validator, repository, or `backend/src/config/swagger.js`

- [ ] **Step 1: Run Swagger metadata tests first**

Run: `cd backend && npx jest tests/swagger.test.js --runInBand`

Expected: pass. If it fails, retain the full error output as the root-cause evidence.

- [ ] **Step 2: If a failure occurs, add the narrowest regression test**

```js
it('documents every mounted API operation with a unique operationId', () => {
  expect(operationIds).toHaveLength(new Set(operationIds).size);
});
```

Run: `cd backend && npx jest tests/swagger.test.js --runInBand`

Expected: fail for the observed metadata defect only.

- [ ] **Step 3: Fix the root cause in the correct architecture layer**

Keep controllers calling services, services calling repositories, and validators at route boundaries. Do not change a response envelope or HTTP status without a failing regression test.

- [ ] **Step 4: Run all backend tests**

Run: `cd backend && npm test`

Expected: all suites pass.

### Task 8: Run the Hallmark and release verification gates

**Files:**
- Modify: `.hallmark/log.json` only if the selected macrostructure family changes
- Verify: `design.md`, `frontend/src/assets/styles/tokens.css`, CSS stamps, all test outputs

- [ ] **Step 1: Run the Hallmark 58-gate review after the implementation**

Check the redesigned CSS against the installed `slop-test.md`, with app-level consistency rules from `design.md` taking precedence over per-page diversification.

- [ ] **Step 2: Run final frontend and backend commands**

Run:

```powershell
cd frontend; npm run test:run; npm run lint; npm run build
cd ..\backend; npm test
```

Expected: every command exits 0.

- [ ] **Step 3: Smoke-test API and responsive routes**

Start backend with API mode enabled, visit Swagger at `/api/docs`, and smoke-test the home, catalog, detail, cart, checkout, lookup, account, dashboard, and one admin management route at 320px, 375px, 414px, and 768px.

- [ ] **Step 4: Review the diff and report factual verification evidence**

Run: `git diff --check; git status --short`

Expected: no whitespace errors and only intended files changed.

# TechPhone Store Visual Overhaul Design

## Goal

Replace the legacy Bootstrap-like visual layer across storefront and admin while preserving every current route, API contract, data shape, authenticated flow, and business rule.

## Audit summary

- Storefront routes cover home, products, accessories, product details, cart, checkout, account, order lookup, reviews, contact, and authentication.
- Admin routes cover dashboard, catalog, orders, customers, vouchers, banners, taxonomies, reviews, and store settings.
- The current UI centralizes many visual rules in `main.css`, `responsive.css`, and `admin.css`, but uses inconsistent spacing, default card grids, and a separate-looking admin palette.
- Backend tests currently cover auth, catalog, orders, vouchers, reviews, dashboard, and Swagger metadata. Frontend has lint and build checks but no component test runner.

## Design system

The source of truth is root `design.md`. It defines a cool neutral paper surface, cobalt accent, Space Grotesk display typography, DM Sans body typography, 4-point spacing, and 16px surface radii. All new CSS must consume named tokens from `tokens.css` rather than hard-coded color or font values.

## Page families

| Family | Routes | Layout intent |
| --- | --- | --- |
| Storefront | `/`, `/products`, `/accessories`, detail routes, reviews, contact | Image-led product discovery with varied section rhythm |
| Task flow | `/cart`, `/checkout`, `/order-success/:orderId`, `/account`, `/order-lookup`, auth | One primary action with compact supporting content |
| Admin | `/admin/*` | Workbench navigation, efficient data tables, clear status and actions |

## Implementation boundaries

- Do not rename or remove routes, public navigation labels, form field names, API modules, repositories, services, controllers, or models.
- Do not delete existing production files. Introduce focused presentation components only where they avoid copying layout code.
- Preserve existing catalog, banner, and product images. Do not fabricate business metrics, testimonials, or availability claims.
- Add frontend interaction tests before changing behavior. Existing backend test suites remain the regression gate for API and Swagger.

## Verification

- Backend: `npm test` and explicit `tests/swagger.test.js`.
- Frontend: lint, production build, and new route/component tests for shared navigation, cart, checkout, lookup, and admin actions.
- Responsive checks at 320, 375, 414, and 768px with no horizontal page scroll.
- Manual API-mode smoke test with `VITE_USE_MOCK=false` after backend tests pass.

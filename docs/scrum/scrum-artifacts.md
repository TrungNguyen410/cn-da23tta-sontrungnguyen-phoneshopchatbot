# Scrum Artifacts

## Product Vision

TechPhone Store helps customers discover, compare, review, and order official smartphones and accessories while giving store administrators a focused dashboard to manage products, orders, customers, reviews, promotions, banners, taxonomy, and settings.

## Personas

| Persona | Goal | Pain Point | Success Signal |
| --- | --- | --- | --- |
| Online Customer | Find a reliable phone quickly | Confusing specs and unclear warranty | Places an order with confidence |
| Returning Customer | Track orders and manage account | Needs quick status visibility | Finds order status by account or phone |
| Store Admin | Manage daily operations | Manual product/order updates | Updates catalog and order status in minutes |
| Course Evaluator | Review engineering process | Missing artifacts and weak traceability | Finds docs, tests, Docker, and API docs in one repo |

## User Stories

| ID | Story | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| US-01 | As a customer, I want to browse products so I can compare phones. | High | Products list supports search, filters, sort, and detail page. |
| US-02 | As a customer, I want to add items to cart so I can prepare checkout. | High | Cart persists locally and calculates subtotal, shipping, discount, total. |
| US-03 | As a customer, I want to register and log in so I can place orders. | High | JWT login/register returns user and token. |
| US-04 | As a customer, I want to apply vouchers so I can receive promotions. | Medium | Voucher validation checks active dates, quantity, min order. |
| US-05 | As a customer, I want to create orders so I can buy products. | High | Order contains customer info, items, totals, payment method, status. |
| US-06 | As a customer, I want to look up an order so I can track delivery. | Medium | Lookup by order number and phone returns matching order. |
| US-07 | As a customer, I want to submit reviews so I can share feedback. | Medium | Review is created as pending and requires admin approval. |
| US-08 | As an admin, I want to manage products and accessories so the catalog stays current. | High | Admin can create, update, soft delete, and list catalog items. |
| US-09 | As an admin, I want to update order status so customers know progress. | High | Admin can move orders through pending, confirmed, shipping, completed, cancelled. |
| US-10 | As an admin, I want dashboard statistics so I can monitor store health. | Medium | Dashboard shows users, orders, revenue, products, monthly sales, recent orders. |

## Product Backlog

| Rank | Item | Type | Story Points | Priority |
| --- | --- | --- | --- | --- |
| 1 | Preserve existing React storefront routes and mock mode | Feature | 5 | High |
| 2 | Build Express backend foundation | Feature | 8 | High |
| 3 | Implement MongoDB schemas with soft delete | Feature | 8 | High |
| 4 | Implement JWT auth and RBAC | Feature | 8 | High |
| 5 | Implement catalog APIs | Feature | 8 | High |
| 6 | Implement order and voucher APIs | Feature | 8 | High |
| 7 | Implement reviews, banners, contacts, settings APIs | Feature | 8 | Medium |
| 8 | Implement admin dashboard statistics | Feature | 5 | Medium |
| 9 | Add Swagger documentation | Documentation | 3 | Medium |
| 10 | Add Jest/Supertest tests | Quality | 8 | High |
| 11 | Add Docker Compose deployment | DevOps | 5 | High |
| 12 | Generate Scrum/Jira/report artifacts | Documentation | 5 | Medium |

## Sprint Backlog

| Sprint | Goal | Backlog Items |
| --- | --- | --- |
| Sprint 1 | Frontend completion and compatibility review | Preserve routes, audit API modules, keep mock mode |
| Sprint 2 | Backend APIs | Express app, auth, RBAC, catalog, admin aliases |
| Sprint 3 | Database integration | Mongoose models, repositories, seed data, order items |
| Sprint 4 | Testing, Docker, deployment | Jest/Supertest, Swagger, Docker Compose, deployment docs |

## Definition of Ready

- User story has a clear user, goal, and value.
- Acceptance criteria are testable.
- API contract or UI behavior is identified.
- Dependencies and risks are known.
- Story is small enough to complete within one sprint.

## Definition of Done

- Code is implemented and committed-ready.
- Existing frontend route behavior is preserved.
- API returns the standard response format.
- Auth and admin-only routes are protected.
- Validation and global error handling are applied.
- Tests pass for changed backend behavior.
- Docker deployment path is documented.
- Swagger or project documentation is updated.

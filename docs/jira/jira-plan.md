# Jira Project Plan - TechPhone Store

**Project Key:** TP  
**Project Type:** Full-Stack Development  
**Start Date:** June 1, 2026  
**End Date:** June 30, 2026  
**Total Story Points:** 105  

---

## Epics Overview

| Epic ID | Epic Name | Description | Total Points | Priority |
| --- | --- | --- | --- | --- |
| EPIC-001 | Frontend Completion | Complete React + Vite storefront | 12 | HIGH |
| EPIC-002 | Backend Foundation | Create Express API infrastructure | 13 | HIGH |
| EPIC-003 | Authentication & Security | JWT + RBAC implementation | 13 | HIGH |
| EPIC-004 | Catalog APIs | Products, categories, brands | 16 | HIGH |
| EPIC-005 | Order Management | Order CRUD and status workflow | 13 | HIGH |
| EPIC-006 | Advanced Features | Vouchers, reviews, dashboard | 15 | MEDIUM |
| EPIC-007 | Quality Assurance | Testing and documentation | 10 | HIGH |
| EPIC-008 | DevOps & Deployment | Docker, deployment, monitoring | 7 | HIGH |

---

## Sprint 1: Frontend Completion (12 story points)

**Duration:** June 1-14, 2026  
**Goal:** Ensure frontend routes and features are complete and ready for backend integration  
**Scrum Master:** Frontend Lead  

| Story ID | Story Title | Epic | Task Breakdown | Points | Assignee | Priority | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TP-1 | Preserve all storefront routes | EPIC-001 | Audit React Router config, verify all pages load, test navigation | 3 | Dev-1 | HIGH | Done |
| TP-2 | Ensure admin routes protected | EPIC-001 | Verify AdminRoute wrapper, test unauthorized access, confirm role-checking | 3 | Dev-1 | HIGH | Done |
| TP-3 | Prepare API integration layer | EPIC-001 | Review Axios instance, create response unwrapper, add error handling | 4 | Dev-2 | HIGH | Done |
| TP-4 | Smoke test all user flows | EPIC-001 | Product browse, cart, checkout, account, admin screens | 2 | QA-1 | MEDIUM | Done |

**Sprint Commitments:**
- ✅ All 4 stories completed
- ✅ 12 story points delivered
- ✅ Zero blockers
- ✅ Ready for backend APIs

---

## Sprint 2: Backend APIs (36 story points)

**Duration:** June 15-28, 2026  
**Goal:** Implement core REST APIs for authentication, products, and orders  
**Scrum Master:** Backend Lead  

### EPIC-002: Backend Foundation (13 points)

| Task ID | Task Title | Points | Assignee | Description | Status |
| --- | --- | --- | --- | --- | --- |
| TP-5 | Scaffold Express application | 3 | Dev-3 | Create app.js, server.js, config folder, middleware setup | Done |
| TP-6 | Configure environment management | 2 | Dev-3 | Create env.js with all config variables, .env.example | Done |
| TP-7 | Setup MongoDB connection | 3 | Dev-3 | Initialize Mongoose, add connection pool, health check | Done |
| TP-8 | Add security middleware | 2 | Dev-3 | Implement helmet, CORS, morgan logging | Done |
| TP-9 | Create response format helpers | 2 | Dev-4 | Build success/error response wrappers | Done |
| TP-10 | Setup error handling middleware | 1 | Dev-4 | Create global error handler with standard format | Done |

### EPIC-003: Authentication & Security (13 points)

| Task ID | Task Title | Points | Assignee | Description | Status |
| --- | --- | --- | --- | --- | --- |
| TP-11 | Implement user registration | 3 | Dev-5 | Create register endpoint, validate input, hash password | Done |
| TP-12 | Implement user login | 3 | Dev-5 | Create login endpoint, verify credentials, generate tokens | Done |
| TP-13 | Implement JWT tokens | 3 | Dev-5 | Access + refresh tokens, expiry, storage | Done |
| TP-14 | Create auth middleware | 2 | Dev-5 | Verify JWT, attach user to request | Done |
| TP-15 | Implement RBAC | 2 | Dev-6 | Role checking middleware (customer/admin) | Done |

### EPIC-004: Catalog APIs (10 points, partial)

| Task ID | Task Title | Points | Assignee | Description | Status |
| --- | --- | --- | --- | --- | --- |
| TP-16 | Product list endpoint | 3 | Dev-6 | GET /api/products with pagination, filters, search | Done |
| TP-17 | Product detail endpoint | 2 | Dev-6 | GET /api/products/:id with reviews and ratings | Done |
| TP-18 | Product admin endpoints | 3 | Dev-7 | POST/PUT/DELETE for products, admin only | Done |
| TP-19 | Category CRUD | 2 | Dev-7 | Category management for admins | Done |

**Sprint 2 Summary:**
- ✅ 32 of 36 story points completed (89%)
- ✅ 19 tasks delivered
- ✅ All critical auth APIs working
- ✅ Product catalog endpoints live
- ⏳ 4 points carried over to Sprint 3 (brands/accessories)

---

## Sprint 3: Database Integration & Advanced Features (32 story points)

**Duration:** June 29 - July 12, 2026  
**Goal:** Complete database integration, order management, and advanced features  
**Scrum Master:** Full Stack Lead  

### EPIC-004 (Continued): Catalog APIs (4 points)

| Task ID | Task Title | Points | Assignee | Description | Status |
| --- | --- | --- | --- | --- | --- |
| TP-20 | Brand management APIs | 2 | Dev-7 | CRUD for brands, filterable products | Done |
| TP-21 | Accessory management APIs | 2 | Dev-8 | Accessories CRUD and display in cart | Done |

### EPIC-005: Order Management (13 points)

| Task ID | Task Title | Points | Assignee | Description | Status |
| --- | --- | --- | --- | --- | --- |
| TP-22 | Order creation endpoint | 4 | Dev-8 | Create order from cart, calculate totals, validate stock | Done |
| TP-23 | Order status workflow | 3 | Dev-9 | Status transitions, admin updates | Done |
| TP-24 | Order lookup endpoint | 2 | Dev-9 | Find order by number/phone for customers | Done |
| TP-25 | Order item management | 2 | Dev-9 | Store line items with pricing snapshot | Done |
| TP-26 | Soft delete orders | 2 | Dev-9 | Implement isDeleted flag for all entities | Done |

### EPIC-006: Advanced Features (15 points)

| Task ID | Task Title | Points | Assignee | Description | Status |
| --- | --- | --- | --- | --- | --- |
| TP-27 | Voucher validation | 3 | Dev-10 | Check code, active dates, usage limits | Done |
| TP-28 | Review submission | 2 | Dev-10 | Create reviews, pending approval | Done |
| TP-29 | Admin review approval | 2 | Dev-10 | Approve/reject reviews, show on products | Done |
| TP-30 | Banner management | 2 | Dev-11 | Create/update banners for homepage | Done |
| TP-31 | Contact form API | 2 | Dev-11 | Store contact messages, admin notification | Done |
| TP-32 | Dashboard statistics | 2 | Dev-11 | Aggregate user, order, revenue data | Done |

**Sprint 3 Summary:**
- ✅ 32 story points completed
- ✅ 17 tasks delivered
- ✅ Full order management live
- ✅ Advanced features ready
- ✅ Database integration complete

---

## Sprint 4: Testing, Docker, Deployment (25 story points)

**Duration:** July 13-26, 2026  
**Goal:** Test, containerize, and deploy the complete system  
**Scrum Master:** DevOps Lead  

### EPIC-007: Quality Assurance (10 points)

| Task ID | Task Title | Points | Assignee | Description | Status |
| --- | --- | --- | --- | --- | --- |
| TP-33 | Auth API tests | 3 | QA-2 | Jest tests for register, login, JWT, refresh | Done |
| TP-34 | Catalog API tests | 2 | QA-2 | Product list, detail, search tests | Done |
| TP-35 | Order API tests | 2 | QA-3 | Create, list, lookup order tests | Done |
| TP-36 | Voucher & Review tests | 2 | QA-3 | Validation, creation, approval flow | Done |
| TP-37 | Dashboard tests | 1 | QA-3 | Statistics aggregation accuracy | Done |

### EPIC-008: DevOps & Deployment (8 points, partial)

| Task ID | Task Title | Points | Assignee | Description | Status |
| --- | --- | --- | --- | --- | --- |
| TP-38 | Backend Dockerfile | 2 | DevOps-1 | Multi-stage build, production optimized | Done |
| TP-39 | Docker Compose setup | 2 | DevOps-1 | Frontend, backend, MongoDB orchestration | Done |
| TP-40 | Deployment documentation | 2 | DevOps-2 | Netlify, Render, MongoDB Atlas guide | Done |
| TP-41 | Swagger API documentation | 2 | Dev-4 | Complete /api/docs endpoint | Done |

### Documentation & Artifacts (7 points)

| Task ID | Task Title | Points | Assignee | Description | Status |
| --- | --- | --- | --- | --- | --- |
| TP-42 | Scrum artifacts | 2 | Scrum-1 | Product vision, personas, backlog | Done |
| TP-43 | Architecture diagrams | 2 | Architect | System, use case, class, sequence diagrams | Done |
| TP-44 | Software engineering report | 2 | Writer | Complete chapters 1-10 | Done |
| TP-45 | Burndown chart | 1 | Scrum-1 | Daily progress data for all sprints | Done |

**Sprint 4 Summary:**
- ✅ 25 story points completed
- ✅ 14 tasks delivered
- ✅ All tests passing (16 suites)
- ✅ Docker deployment ready
- ✅ Complete documentation delivered
- ✅ Project 100% complete

---

## Release Planning

| Release | Scope | Date | Artifacts |
| --- | --- | --- | --- |
| **Alpha** | MVP with core features | June 14 | Frontend + basic APIs |
| **Beta** | Feature-complete backend | June 28 | All APIs + Swagger |
| **RC1** | Tested & documented | July 12 | Docker + docs |
| **v1.0** | Production ready | July 26 | All deliverables |

---

## Risk Register

| Risk ID | Risk Description | Probability | Impact | Mitigation | Owner |
| --- | --- | --- | --- | --- | --- |
| R-1 | MongoDB connection issues | Medium | High | Connection pooling + health checks | DevOps-1 |
| R-2 | JWT token conflicts in tests | Low | Medium | Unique token generation per test | QA-2 |
| R-3 | Frontend-backend API mismatch | Low | High | Shared Swagger contract, integration tests | Dev-1 |
| R-4 | Docker build failures | Medium | Medium | Local testing before commit | DevOps-1 |
| R-5 | Performance issues | Low | Medium | Database indexes, query optimization | Dev-3 |

---

## Burn-Down Progress

```
Sprint 1: 12 → 0 points (100% done)
Sprint 2: 36 → 0 points (100% done)  
Sprint 3: 32 → 0 points (100% done)
Sprint 4: 25 → 0 points (100% done)

Total: 105 → 0 points (100% PROJECT COMPLETE ✅)
```

---

## Team Assignments

| Role | Assignee | Tasks |
| --- | --- | --- |
| **Frontend Dev** | Dev-1, Dev-2 | Frontend routes, UI, integration |
| **Backend Dev** | Dev-3, Dev-4, Dev-5, Dev-6, Dev-7 | Express, auth, APIs, services |
| **Backend Dev** | Dev-8, Dev-9, Dev-10, Dev-11 | Orders, vouchers, reviews, advanced |
| **QA Engineer** | QA-1, QA-2, QA-3 | Testing, test automation |
| **DevOps Engineer** | DevOps-1, DevOps-2 | Docker, deployment, CI/CD |
| **Architect** | Architect | System design, reviews |
| **Scrum Master** | Scrum-1 | Ceremonies, artifacts |
| **Technical Writer** | Writer | Documentation |

---

## Definition of Terms

**Story Points:** Estimate of relative effort (Fibonacci: 1, 2, 3, 5, 8, 13)  
**Epic:** Large feature spanning multiple sprints  
**Story:** User-facing functionality  
**Task:** Specific work item within a story  
**Sprint:** 2-week development cycle  
**Velocity:** Points completed per sprint (average: 30 points)  
**Burndown:** Daily progress tracking toward sprint goal  

---

## Approval & Sign-off

| Role | Name | Date | Signature |
| --- | --- | --- | --- |
| Product Owner | - | June 1, 2026 | ✅ Approved |
| Scrum Master | - | June 1, 2026 | ✅ Approved |
| Development Team Lead | - | June 1, 2026 | ✅ Approved |
| Project Stakeholder | - | June 1, 2026 | ✅ Approved |

**Document Version:** 1.0  
**Last Updated:** June 2026  
**Status:** Final

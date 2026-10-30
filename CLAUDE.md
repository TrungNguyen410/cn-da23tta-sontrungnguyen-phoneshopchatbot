# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working Rules (bắt buộc)

- **Khi có điểm mơ hồ thì phải hỏi lại người dùng trước khi làm.** Không tự chọn hướng, không tự mở rộng phạm vi, không tự quyết thay người dùng (yêu cầu, giao diện, thư viện, xoá/ghi đè file, commit/push).
- **Làm việc theo skill trong `.claude/skills/`.** Trước mỗi nhiệm vụ, chọn skill khớp với nhiệm vụ theo bảng dưới; nếu người dùng chỉ định skill thì dùng đúng skill đó. Nếu không rõ nên dùng skill nào thì hỏi lại.
- Các skill thiết kế UI mặc định viết cho landing page/marketing và có thể đòi đổi font, bỏ thư viện icon, thêm GSAP… Dự án này đang dùng **React 19 + Bootstrap 5 + react-icons + Chart.js**. Mọi thay đổi stack hoặc thêm thư viện phải hỏi người dùng trước.

### Skill → Nhiệm vụ

| Skill | Dùng khi |
|---|---|
| `planning-with-files` | Lập kế hoạch nhiệm vụ nhiều bước (ghi `task_plan.md`, `findings.md`, `progress.md`) |
| `full-output-enforcement` | Cần viết code/tài liệu đầy đủ, không được bỏ dở hay để placeholder |
| `redesign-existing-projects` | Nâng cấp giao diện trang có sẵn mà không phá chức năng |
| `design-taste-frontend` | Thiết kế giao diện mới (bản v2, mặc định) |
| `design-taste-frontend-v1` | Bản v1 cũ, chỉ dùng khi người dùng yêu cầu |
| `high-end-visual-design` | Phong cách cao cấp kiểu agency (font, spacing, shadow, animation) |
| `minimalist-ui` | Phong cách tối giản, editorial, đơn sắc ấm |
| `industrial-brutalist-ui` | Phong cách brutalist/terminal, hợp dashboard dày dữ liệu |
| `gpt-taste` | Trang nhiều chuyển động GSAP, bento grid, kiểu Awwwards |
| `stitch-design-taste` | Sinh file `DESIGN.md` cho Google Stitch |
| `image-to-code` | Tạo ảnh thiết kế trước rồi code theo ảnh |
| `imagegen-frontend-web` | Chỉ tạo ảnh mockup website (mỗi section một ảnh) |
| `imagegen-frontend-mobile` | Chỉ tạo ảnh mockup app mobile |
| `brandkit` | Tạo ảnh bộ nhận diện thương hiệu (logo, brand board) |
| `drawio-skill` | Vẽ sơ đồ (kiến trúc, ERD, UML, sequence, flowchart) ra `.drawio`/PNG/SVG; cần cài draw.io desktop |

## Project Overview

PhoneShopAI is a Vietnamese phone/accessory e-commerce app (thesis project, 19/10/2026 – 31/12/2026). The store core is inherited from TechPhone-Store (some internal names still say `techphone`: database name, JWT issuer, storage keys — keep them). New in this project: the AI chatbot (Google Gemini function calling, `backend/src/services/chatService.js`, `chatTools.js`, `frontend/src/components/chat/`) and automatic bank-transfer payment via SePay webhook (`backend/src/services/paymentService.js`). Design doc: `docs/phoneshopai-analysis-design.md`.

The repo is a monorepo with two independent Node.js projects: `frontend/` (React + Vite SPA) and `backend/` (Express + MongoDB REST API). They share no code and each has its own `package.json`. Guests can browse; placing an order requires registering and logging in (`POST /api/orders` uses `protect`) — keep it that way unless the user says otherwise.

## Commands

### Frontend (`cd frontend`)
```bash
npm run dev        # dev server at http://localhost:5173
npm run build      # production build → dist/ (needs frontend/.env with VITE_SITE_URL)
npm run preview    # serve the dist/ build
npm run lint       # ESLint
```

### Backend (`cd backend`)
```bash
npm run dev        # nodemon hot-reload
npm start          # production start
npm test           # Jest (all test files, runs in band)
npm run seed       # seed demo data into MongoDB
npm run test:coverage  # Jest with coverage (80% threshold on src/utils + voucherService)
```

Run a single test file:
```bash
cd backend && npx jest tests/auth.test.js --runInBand
```

### Full stack (repo root)
```bash
docker compose up -d                          # all three services
docker compose exec backend npm run seed      # seed after startup
```

Services: frontend → http://localhost:3000, backend → http://localhost:5000/api, Swagger → http://localhost:5000/api/docs

## Architecture

### Backend: Clean Architecture layers

```
routes → controllers → services → repositories → models
```

Every domain follows this chain. **Never skip layers**: controllers call services, services call repositories, repositories call Mongoose models.

- **`BaseRepository`** (`src/repositories/baseRepository.js`) — all queries automatically append `isDeleted: false`. Calls `doc.toJSON()` before returning, so plain objects (not Mongoose docs) come out. Use `.findAll(filter, options)` with `options.sort`, `options.skip`, `options.limit`.
- **`BaseCrudService`** (`src/services/baseCrudService.js`) — thin wrapper adding `AppError` on not-found. Domain services extend this and override methods that need extra logic.
- **`softDeletePlugin`** — applied to every model. `doc.softDelete()` sets `isDeleted=true`; `BaseRepository.softDelete(id)` calls it. Hard deletes are not used.
- **`baseSchemaOptions`** — applied to every schema. Transforms JSON output to map `_id → id` and strip `password`. All models use **string IDs** (custom `createId()`), not MongoDB ObjectIds.
- **API envelope**: all responses use `successResponse(res, data, message)` / `errorResponse(res, message, status, errors)` from `src/utils/apiResponse.js`, producing `{ success, message, data }`.
- **Error handling**: throw `new AppError(message, statusCode)` anywhere in a service/repository; the global `errorHandler` middleware catches it. Wrap controller functions in `asyncHandler` to forward async errors.
- **Auth**: `protect` middleware attaches `req.user` (plain JSON, not Mongoose doc). `authorize(...roles)` checks `req.user.role`. JWTs are short-lived (15m access / 7d refresh); refresh tokens are hashed and stored in MongoDB.

### Frontend: Mock / API dual mode

The `VITE_USE_MOCK` env var controls everything. When `true` (default for dev), every `src/api/*.js` module uses in-memory localStorage data instead of real HTTP calls. When `false`, the same modules call the real backend.

- **`src/utils/constants.js`** — `USE_MOCK` flag, `API_URL`, and all `STORAGE_KEYS` are defined here.
- **`axiosClient`** (`src/api/axiosClient.js`) — auto-unwraps `{ success, message, data }` envelope (returns `data` directly). Injects `Authorization: Bearer <token>` from localStorage. On `401`, clears session and redirects to `/login`.
- **`AuthContext`** / **`CartContext`** (`src/context/`) — global state via React Context. Cart persists to localStorage on every change. Both contexts never need to know whether mock or real API is used.
- **Routes** (`src/routes/AppRoutes.jsx`) — two layouts: `StoreLayout` (Header + Outlet + Footer) for customer pages, `AdminLayout` (nested `/admin/*`) for admin. `ProtectedRoute` requires login; `AdminRoute` requires `role === 'admin'`.

### Key conventions

- Mock data lives in `src/mock/`. The mock repository and real API modules return the same data shape, so components are agnostic to the mode.
- Admin pages are under `src/pages/admin/`. They all talk to `/api/admin/*` endpoints on the backend (`src/routes/adminRoutes.js`).
- Backend validators (`src/validators/`) use `express-validator`. Controllers call `validationResult` and throw on errors.
- Backend tests use `mongodb-memory-server` (started in `tests/setup.js`). No real MongoDB needed for tests. Each test suite gets a clean DB (`afterEach` deletes all collections).

## Environment Variables

**Frontend** — create `frontend/.env` from `frontend/.env.example`:
```
VITE_API_URL=http://localhost:5000/api
VITE_USE_MOCK=true    # false to hit the real backend
```

**Backend** — create `backend/.env`:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/techphone_store
JWT_ACCESS_SECRET=dev-access-secret
JWT_REFRESH_SECRET=dev-refresh-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
UPLOAD_DIR=uploads
```

Defaults are already coded in `src/config/env.js`, so the backend runs without a `.env` file in development.

## Mock Demo Accounts

| Role | Phone | Password |
|---|---|---|
| Admin | 0900000000 | 123456 |
| Customer | 0911111111 | 123456 |

Sample order for lookup: `TP260601` with phone `0911111111`.

Vouchers: `TECH10` (10% off, max 1M, min 5M order), `GIAM200K` (200K off, min 3M), `FREESHIP` (free shipping, min 500K).

To reset mock data to defaults, delete all `mock_*` keys in browser DevTools → Application → Local Storage.

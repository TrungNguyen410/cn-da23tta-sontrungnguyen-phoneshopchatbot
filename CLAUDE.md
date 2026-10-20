# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TechPhone Store is a Vietnamese phone/accessory e-commerce app. The repo is a monorepo with two independent Node.js projects: `frontend/` (React + Vite SPA) and `backend/` (Express + MongoDB REST API). They share no code and each has its own `package.json`.

## Commands

### Frontend (`cd frontend`)
```bash
npm run dev        # dev server at http://localhost:5173
npm run build      # production build → dist/
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

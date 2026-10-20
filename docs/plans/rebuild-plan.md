# Kế hoạch thực hiện lại dự án TechPhone Store (làm lại từ đầu)

> **Mục đích:** Đồ án môn học (Software Engineering / Agile Scrum).
> **Phạm vi:** Xây dựng lại toàn bộ hệ thống từ con số 0 — Frontend (React + Vite) + Backend (Express + MongoDB) + DevOps + tài liệu đồ án — theo đúng kiến trúc tham chiếu của dự án hiện tại.
> **Quy trình:** 4 Sprint × ~1–2 tuần, tổng ~105 story point, kèm đầy đủ artifacts Scrum/Jira/báo cáo.

---

## Trạng thái thực hiện — 2026-07-29

Plan rebuild đã hoàn thành trong phạm vi mã nguồn và hồ sơ có thể tạo trong repository:

- [x] Sprint 0: Git, Scrum/Jira, sơ đồ và burndown.
- [x] Sprint 1: storefront/admin mock mode, lint và build.
- [x] Sprint 2: backend nhiều lớp, database, auth/RBAC và health API.
- [x] Sprint 3: API nghiệp vụ, seed và tích hợp frontend/backend.
- [x] Sprint 4: test, Swagger, Docker Compose replica set, deployment guide và báo cáo 10 chương.
- [x] Coverage backend vượt 80%: 98,91% statements, 92,3% branches, 100% functions, 98,71% lines.
- [x] Docker smoke test: ba service chạy; health API, Swagger, frontend và SPA fallback trả HTTP 200.

Các checkbox chi tiết bên dưới là baseline lịch sử được viết trước khi triển khai; trạng thái nghiệm thu hiện tại được ghi ở phần này. Slide/clip demo là sản phẩm quay thủ công và chỉ thực hiện nếu giảng viên yêu cầu, không phải task code còn thiếu.

---

## 0. Mục tiêu & tiêu chí thành công

| Khía cạnh | Mục tiêu nghiệm thu |
| --- | --- |
| Sản phẩm | Web bán điện thoại + phụ kiện chạy được: storefront khách hàng + trang quản trị admin |
| Kiến trúc | Backend Clean Architecture 5 lớp: `routes → controllers → services → repositories → models` |
| API | ~50 REST endpoint, response chuẩn `{ success, message, data }`, có Swagger |
| Bảo mật | JWT (access + refresh), RBAC (customer/admin), validate đầu vào, bcrypt |
| Kiểm thử | Jest + Supertest, MongoDB Memory Server, coverage ≥ 80% (utils + service trọng yếu) |
| DevOps | Docker Compose 3 service (frontend / backend / mongo), seed demo |
| Tài liệu | Báo cáo SE 10 chương, sơ đồ (use case, class, sequence, ERD), Scrum artifacts, Jira plan, burndown |

**Definition of Done (mỗi user story):** code chạy + API trả đúng format chuẩn + route admin được bảo vệ + có validate & error handling + test pass cho phần thay đổi + cập nhật tài liệu/Swagger.

---

## 1. Công nghệ (giữ nguyên stack tham chiếu)

**Frontend:** React 19, Vite, React Router DOM, Axios (JWT interceptor), Bootstrap 5, React Icons, Chart.js, React Toastify, Context API. Yêu cầu Node.js 22 (`>=22 <23`).

**Backend:** Node.js + Express 5, MongoDB + Mongoose, JWT (`jsonwebtoken`), `bcrypt`, `express-validator`, `helmet`, `cors`, `morgan`, `multer`, `swagger-ui-express`.

**Test/DevOps:** Jest, Supertest, `mongodb-memory-server`, nodemon; Docker + Docker Compose + Nginx.

> Gợi ý: chọn 1 trong 2 cách dựng. **(A) Backend-first**: làm API trước rồi nối frontend. **(B) Mock-first** (giống dự án gốc): frontend chạy bằng mock data + localStorage trước, demo sớm, sau đó bật `VITE_USE_MOCK=false` để nối backend. Plan dưới đây dùng **Mock-first** vì cho phép demo từ Sprint 1 và giảm rủi ro tích hợp.

---

## 2. Cấu trúc thư mục đích

```
TechPhone Store/
├── frontend/                 # React + Vite SPA
│   └── src/{api, assets, components, context, hooks, mock, pages, routes, utils}
├── backend/                  # Express + MongoDB (Clean Architecture)
│   └── src/{config, controllers, services, repositories, models, routes,
│            middlewares, validators, utils, seed, jobs}
│   └── tests/                # Jest + Supertest
├── docs/                     # Scrum, Jira, báo cáo, sơ đồ, burndown
├── docker-compose.yml
└── deployment.md
```

---

## 3. Lộ trình theo Sprint

### Sprint 0 — Khởi tạo & lập kế hoạch (chuẩn bị, ~3 ngày)
**Mục tiêu:** sẵn sàng quy trình + môi trường trước khi code.
- [ ] Khởi tạo Git repo, nhánh `main`, cấu trúc 2 thư mục `frontend/` `backend/`, `.gitignore`.
- [ ] Viết **Scrum artifacts**: Product Vision, 4 persona, 10+ user story (kèm acceptance criteria), Product Backlog (12 hạng mục), DoR/DoD.
- [ ] Lập **Jira plan**: epic → story → task, ước lượng story point (Fibonacci), gán sprint, risk register (5 rủi ro + biện pháp).
- [ ] Vẽ sơ đồ ban đầu: use case (customer/admin), kiến trúc hệ thống, ERD.
- [ ] Chuẩn bị **burndown** (kế hoạch 105 điểm / 4 sprint, vận tốc ~26 điểm/sprint).

### Sprint 1 — Frontend storefront (mock mode) — 26 điểm
**Mục tiêu:** giao diện khách hàng + admin chạy được hoàn toàn bằng mock data, demo được ngay.
- [ ] Scaffold Vite + React, Bootstrap, React Router, cấu trúc thư mục `src/`.
- [ ] `utils/constants.js`: `USE_MOCK`, `API_URL`, `STORAGE_KEYS`; `utils/storage.js` (localStorage), format tiền, validators.
- [ ] Mock layer `src/mock/`: products, accessories, orders, reviews, vouchers, banners, users, settings + mock repository (trả về **đúng shape** như API thật).
- [ ] `AuthContext` + `CartContext` (giỏ hàng lưu localStorage, áp voucher).
- [ ] Routing: `StoreLayout` (Header/Footer) + `AdminLayout`; `ProtectedRoute`, `AdminRoute`.
- [ ] Trang khách hàng: Home, Products (search/filter/sort/paginate), ProductDetail, Accessories, Cart, Checkout, OrderSuccess, OrderLookup, Reviews, Contact, Login, Register, Account.
- [ ] Trang admin: Dashboard (Chart.js), Product/Accessory/Order/Customer/Review/Banner/Voucher/Category/Brand/Setting Management.
- [ ] Tài khoản & dữ liệu demo mock (admin@gmail.com / user@gmail.com / 123456; voucher TECH10, GIAM200K, FREESHIP).
- **Done:** `npm run dev` chạy đủ luồng mua hàng + admin bằng mock; `npm run build` thành công; ESLint sạch.

### Sprint 2 — Nền tảng Backend + Auth + Database — 28 điểm
**Mục tiêu:** API foundation, xác thực, và toàn bộ schema dữ liệu.
- [ ] Scaffold Express app: `app.js` (helmet, cors, morgan, json limit, static `/uploads`), `server.js`, `config/env.js`, `config/database.js`.
- [ ] Tiện ích nền: `utils/AppError`, `utils/asyncHandler`, `utils/apiResponse` (`successResponse`/`errorResponse`), `utils/id` (string id), `utils/token`, `utils/query`, `utils/slugify`.
- [ ] **12 Mongoose model** dùng chung `baseSchemaOptions` (map `_id→id`, ẩn `password`) + `softDeletePlugin` (`isDeleted`, `deletedAt`, `softDelete()`): User, Product, Accessory, Category, Brand, Order, OrderItem, Review, Voucher, Banner, Contact, Setting, RefreshToken.
- [ ] **BaseRepository** (luôn lọc `isDeleted:false`, trả plain object qua `toJSON`) + **BaseCrudService** (ném `AppError` khi not-found).
- [ ] Middleware: `authMiddleware` (`protect` gắn `req.user`, `authorize(...roles)`), `errorMiddleware` (`notFound`, `errorHandler`).
- [ ] **Auth**: register/login/me/updateProfile/changePassword/refresh/logout; access token 15m + refresh 7d (hash & lưu DB, có rotation).
- [ ] Routes index gắn `/api/...`; health check `/api/health`.
- **Done:** đăng ký/đăng nhập trả token + user; route `/api/admin/*` chặn non-admin; seed cơ bản chạy.

### Sprint 3 — Nghiệp vụ Backend + tích hợp Frontend — 28 điểm
**Mục tiêu:** đủ API nghiệp vụ và nối frontend thật.
- [ ] Catalog API: products, accessories, categories, brands (CRUD + search/filter/sort/paginate).
- [ ] Order API: tạo đơn (OrderItem), đơn của tôi, tra cứu theo mã + SĐT, admin cập nhật trạng thái (pending→confirmed→shipping→completed/cancelled).
- [ ] Voucher API: validate (ngày hiệu lực, số lượng, đơn tối thiểu, % và mức giảm tối đa) + CRUD.
- [ ] Review API: gửi (mặc định `pending`), duyệt/từ chối/xóa (admin).
- [ ] Banner / Contact / Setting API; Upload API (multer); Admin Dashboard (users, orders, doanh thu, sản phẩm, doanh số theo tháng, đơn gần đây).
- [ ] `seed/seed.js`: 8 điện thoại + phụ kiện + danh mục/thương hiệu + đơn mẫu + voucher + tài khoản demo.
- [ ] **Nối Frontend ↔ Backend**: kiểm tra mỗi module `src/api/*` khớp endpoint thật; `axiosClient` tự bóc envelope + gắn Bearer token + xử lý 401; chuyển `VITE_USE_MOCK=false` và chạy đối chiếu toàn luồng.
- **Done:** chạy thật end-to-end (đăng nhập → duyệt → giỏ hàng → đặt đơn → admin đổi trạng thái → tra cứu) không qua mock.

### Sprint 4 — Test, Docker, Deploy, Tài liệu — 23 điểm
**Mục tiêu:** chất lượng + đóng gói + hồ sơ đồ án.
- [ ] `tests/setup.js` (MongoMemoryServer, dọn DB mỗi test) + helpers.
- [ ] Test suite: auth, catalog, order-dashboard, voucher (unit + integration), review; coverage ≥ 80% theo `coverageThreshold`.
- [ ] Swagger: `config/swagger.js`, phục vụ tại `/api/docs`, mô tả các endpoint.
- [ ] Dockerfile (backend Node alpine; frontend multi-stage + Nginx SPA fallback) + `docker-compose.yml` (mongo healthcheck, backend, frontend) + `.dockerignore`.
- [ ] `deployment.md`: Docker Compose local, Netlify (frontend), Render (backend), MongoDB Atlas, checklist production.
- [ ] **Báo cáo SE 10 chương**, hoàn thiện sơ đồ (class, sequence ×6, ERD, deployment), cập nhật **burndown thực tế**, retrospective.
- **Done:** `npm test` xanh, coverage đạt ngưỡng; `docker compose up -d` chạy cả 3 service; `/api/health` & `/api/docs` phản hồi; bộ tài liệu đầy đủ để bảo vệ.

---

## 4. Bảng tổng hợp Sprint

| Sprint | Trọng tâm | Điểm | Deliverable chính |
| --- | --- | --- | --- |
| 0 | Lập kế hoạch | — | Repo, Scrum/Jira artifacts, sơ đồ ban đầu, burndown plan |
| 1 | Frontend (mock) | 26 | Storefront + admin chạy bằng mock, build sạch |
| 2 | Backend nền + Auth + DB | 28 | Express app, 12 model, JWT/RBAC, BaseRepo/Service |
| 3 | Nghiệp vụ + tích hợp | 28 | ~50 API, seed, frontend nối backend thật |
| 4 | Test/Docker/Docs | 23 | Jest ≥80%, Swagger, Docker Compose, báo cáo 10 chương |

---

## 5. Quy tắc kiến trúc bắt buộc (để chấm điểm "Clean Architecture")

- **Không nhảy lớp:** controller → service → repository → model. Controller chỉ điều phối + validate; nghiệp vụ nằm ở service; truy vấn DB nằm ở repository.
- Mọi response qua `successResponse/errorResponse` → `{ success, message, data }`. Frontend `axiosClient` tự bóc `data`.
- Mọi lỗi ném `new AppError(message, statusCode)`; controller bọc `asyncHandler`; `errorHandler` toàn cục bắt.
- Mọi model dùng **string id** (không ObjectId), `baseSchemaOptions` (ẩn password, map id), `softDeletePlugin` (xóa mềm — không hard delete).
- `protect` gắn `req.user` (plain object); `authorize('admin')` cho route admin.
- Frontend giữ nguyên: mock repo và API thật **trả cùng shape** ⇒ component không cần sửa khi đổi `VITE_USE_MOCK`.

---

## 6. Rủi ro & biện pháp

| Rủi ro | Mức | Biện pháp |
| --- | --- | --- |
| Lệch shape dữ liệu giữa mock và API thật | Cao | Định nghĩa contract chung ngay Sprint 1; nối backend sớm ở Sprint 3 |
| JWT/refresh token phức tạp, lỗi bảo mật | Trung bình | Tách `authService`, viết test auth trước; hash refresh token, có rotation |
| Coverage không đạt 80% | Trung bình | Giới hạn `collectCoverageFrom` vào utils + service trọng yếu (voucher); viết test song song |
| Docker/Mongo healthcheck chập chờn | Thấp | `depends_on: condition: service_healthy`, seed sau khi backend healthy |
| Thiếu artifacts khi bảo vệ | Trung bình | Làm tài liệu song song từng sprint, không dồn cuối |

---

## 7. Checklist hồ sơ nộp đồ án

- [ ] Mã nguồn frontend + backend chạy được (local + Docker)
- [ ] `README.md`, `deployment.md`, `CLAUDE.md`
- [ ] `docs/scrum/scrum-artifacts.md`, `docs/jira/jira-plan.md`, `docs/burndown-plan.md` + `burndown-chart-data.xlsx`
- [ ] `docs/diagrams/` (use case, class, sequence, ERD, kiến trúc, deployment)
- [ ] `docs/report/software-engineering-report.md` (10 chương)
- [ ] Swagger UI `/api/docs` + health `/api/health`
- [ ] Test pass + báo cáo coverage (`backend/coverage/`)
- [ ] Slide/clip demo (tùy yêu cầu môn học)

---

## 8. Lệnh thường dùng (tham chiếu nhanh)

```bash
# Frontend
cd frontend && npm install && npm run dev      # http://localhost:5173
npm run build && npm run lint

# Backend
cd backend && npm install && npm run dev        # http://localhost:5000
npm run seed
npm test                                         # Jest
npx jest tests/auth.test.js --runInBand          # chạy 1 file test
npm run test:coverage

# Toàn hệ thống
docker compose up -d
docker compose exec backend npm run seed
```

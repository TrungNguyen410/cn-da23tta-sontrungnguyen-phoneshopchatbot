# TechPhone Frontend

Frontend React cho website bán điện thoại và phụ kiện TechPhone. Dự án chạy độc lập bằng mock data, đồng thời đã sẵn sàng kết nối backend Node.js/Express qua REST API.

## Công nghệ

- React 19 + Vite 8
- React Router DOM
- Axios và JWT interceptor
- Bootstrap 5 + CSS custom responsive
- React Icons
- Chart.js + React Chart.js 2
- React Toastify
- Context API cho xác thực và giỏ hàng
- Nginx + Docker multi-stage

## Cài đặt và chạy

Yêu cầu Node.js 22 (`>=22 <23`).

```bash
cd frontend
npm install
npm run dev
```

Ứng dụng mặc định chạy tại `http://localhost:5173`.

## Local preview build

```bash
npm run build
npm run preview
```

Copy `.env.example` to `.env` before this local preview workflow. It uses the
explicit `local-preview` target so localhost URLs are intentional. A Render
production build must instead use the non-loopback variables documented below.

The local preview is available at `http://localhost:5173`.

Thư mục build được tạo tại `dist/`.

## Chạy bằng Docker

```bash
docker build -t duanwebdidong-frontend .
docker run -p 8080:80 duanwebdidong-frontend
```

Mở `http://localhost:8080`.

Để build và kết nối backend thật:

```bash
docker build \
  --build-arg VITE_USE_MOCK=false \
  --build-arg VITE_API_URL=http://localhost:5000/api \
  --build-arg VITE_SITE_URL=http://localhost:8080 \
  --build-arg VITE_DEPLOYMENT_TARGET=docker \
  -t duanwebdidong-frontend .
```

## Biến môi trường

Tạo file `.env` từ `.env.example`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_USE_MOCK=true
VITE_SITE_URL=http://localhost:5173
VITE_DEPLOYMENT_TARGET=local-preview
```

- `VITE_USE_MOCK=true`: dùng dữ liệu mock và lưu tạm thay đổi trong localStorage.
- `VITE_USE_MOCK=false`: gọi backend REST API qua Axios.
- JWT tự động được gắn vào header `Authorization: Bearer <token>`.
- Phản hồi `401` sẽ xóa phiên đăng nhập và chuyển về `/login`.

## Tài khoản mock

| Vai trò | Số điện thoại | Mật khẩu |
| --- | --- | --- |
| Admin | `0900000000` | `123456` |
| Khách hàng | `0911111111` | `123456` |

Đơn hàng mẫu để tra cứu: `TP260601` và số điện thoại `0911111111`.

Voucher dùng thử:

- `TECH10`: giảm 10%, tối đa 1.000.000đ, đơn từ 5.000.000đ.
- `GIAM200K`: giảm 200.000đ, đơn từ 3.000.000đ.
- `FREESHIP`: giảm phí giao hàng, đơn từ 500.000đ.

## Các trang

### Khách hàng

- `/`: trang chủ, banner, danh mục, sản phẩm và phụ kiện nổi bật.
- `/products`: tìm kiếm, lọc, sắp xếp, phân trang.
- `/products/:id`: chi tiết điện thoại, giỏ hàng, mua ngay, đánh giá.
- `/accessories/:id`: chi tiết phụ kiện.
- `/cart`: quản lý giỏ hàng và voucher.
- `/checkout`: thanh toán, yêu cầu đăng nhập.
- `/order-success/:orderId`: xác nhận đặt hàng.
- `/login`, `/register`: xác thực mock hoặc REST API.
- `/account`: hồ sơ, đơn hàng, hủy/đặt lại đơn, đổi mật khẩu.
- `/reviews`: danh sách và gửi đánh giá.
- `/contact`: thông tin cửa hàng, biểu mẫu, bản đồ, FAQ.
- `/order-lookup`: tra cứu trạng thái và timeline đơn hàng.

### Quản trị

- `/admin/dashboard`: chỉ số, biểu đồ doanh thu, trạng thái đơn, top sản phẩm.
- `/admin/products`: CRUD sản phẩm và tồn kho.
- `/admin/accessories`: CRUD phụ kiện.
- `/admin/orders`: tìm kiếm, lọc, xem chi tiết và cập nhật trạng thái.
- `/admin/customers`: thống kê mua hàng, khóa/mở tài khoản.
- `/admin/reviews`: duyệt, từ chối, xóa đánh giá.
- `/admin/banners`: CRUD banner.
- `/admin/vouchers`: CRUD voucher.
- `/admin/categories`: CRUD danh mục.
- `/admin/brands`: CRUD thương hiệu.
- `/admin/settings`: thông tin cửa hàng và mạng xã hội.

## Cấu trúc chính

```text
src/
├── api/          # Axios client và API theo domain
├── assets/       # CSS và tài nguyên tĩnh
├── components/   # Common, product, cart, auth, admin
├── context/      # AuthContext, CartContext
├── hooks/        # Hooks dùng chung
├── mock/         # Mock data và mock repository
├── pages/        # Trang khách hàng và quản trị
├── routes/       # Khai báo route và route guard
└── utils/        # Format, validate, storage, constants
```

## Kết nối backend

Các module trong `src/api` đã ánh xạ endpoint dự kiến cho:

- Auth: đăng ký, đăng nhập, hồ sơ, đổi mật khẩu.
- Products và Accessories: danh sách, chi tiết, CRUD.
- Orders: tạo đơn, đơn của tôi, hủy đơn, quản trị trạng thái.
- Reviews: danh sách, gửi, duyệt, từ chối, xóa.
- Vouchers và Banners: kiểm tra và CRUD.
- Admin Dashboard, Customers, Categories, Brands.

Khi backend hoàn thành, đặt `VITE_USE_MOCK=false`. Component và Context không cần thay đổi vì mock repository và REST API trả về cùng cấu trúc dữ liệu.

## Ghi chú dữ liệu tạm

Mock mode dùng localStorage để mô phỏng thay đổi trong phiên phát triển, không được xem là database production. Các key chính:

- `token`, `currentUser`
- `cart_items`, `cart_voucher`
- `mock_products`, `mock_orders`, `mock_reviews` và các collection quản trị khác

Xóa các key `mock_*` trong DevTools để khôi phục dữ liệu mẫu ban đầu.

## Canonical production deployment

Render is the repository's single canonical production target: use a Render
Static Site for the frontend, a Render Web Service for the backend, and MongoDB
Atlas. The backend requires a Render persistent disk mounted at `/app/uploads`
with `UPLOAD_DIR=/app/uploads`; do not deploy the current local-upload routes to
a serverless filesystem.

Replace these documented domain placeholders with the actual Render domains:

```env
VITE_SITE_URL=https://shop.techphone.example
VITE_API_URL=https://api.techphone.example/api
VITE_DEPLOYMENT_TARGET=render
FRONTEND_URL=https://shop.techphone.example
PUBLIC_SITE_URL=https://shop.techphone.example
API_PUBLIC_URL=https://api.techphone.example
DEPLOYMENT_TARGET=render
UPLOAD_DIR=/app/uploads
```

Production public URLs must be absolute HTTP(S) URLs. Render builds reject
loopback URLs and do not fall back to localhost; only the explicit `docker` and
`local-preview` targets permit localhost in a production-mode frontend build. If VNPay is enabled, also set
`VNPAY_RETURN_URL=https://api.techphone.example/api/payments/vnpay/return`.
See [deployment.md](deployment.md) for the complete Render checklist.

## Security exception: React Router RSC advisory

- Advisory: [GHSA-qwww-vcr4-c8h2](https://github.com/advisories/GHSA-qwww-vcr4-c8h2)
- Package: `react-router@7.18.2`, installed through `react-router-dom@7.18.2`.
- Reason: this is a Vite browser SPA using stable `react-router-dom` routing APIs;
  it does not import or enable the unstable RSC APIs affected by the advisory.
- Owner: TechPhone maintainers.
- Review date: 2026-09-05.
- Compatibility plan: upgrade `react-router-dom` and `react-router` to 8.3.0 or
  newer in a separate change, then run the route and full frontend test suites.
  Do not use `npm audit fix --force` or downgrade the packages.

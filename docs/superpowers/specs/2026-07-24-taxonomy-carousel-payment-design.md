# Thiết kế: Carousel danh mục, liên kết Taxonomy, và Phương thức thanh toán

**Ngày:** 2026-07-24
**Trạng thái:** Đã duyệt (chờ viết plan thực thi)

## Bối cảnh

Rà soát luồng danh mục trang chủ, quản lý taxonomy (thương hiệu/danh mục) trong admin, form sản phẩm, và đơn hàng hiện tại phát hiện các khoảng trống sau:

1. Carousel "Danh mục nổi bật" ở trang chủ chỉ là một dãy thẻ cuộn ngang tĩnh (`overflow-x: auto`), không tự chạy, không có xử lý accessibility riêng cho carousel.
2. CRUD Brand/Category đã tồn tại đầy đủ ở backend (models, routes, validators) và frontend (`TaxonomyManagement.jsx`), nhưng form admin chỉ cho nhập `name` + `active`, bỏ qua `slug`/`logo`/`description` mà model đã hỗ trợ.
3. `Product.brand` / `Product.category` là các trường `String` tự do, không tham chiếu đến Brand/Category — admin có thể gõ bất kỳ chuỗi nào ở form thêm/sửa sản phẩm.
4. `paymentMethod` hỗ trợ 4 giá trị (`cod`, `bank`, `momo`, `card`) ở schema/enum nhưng chỉ `cod` và `bank` có flow thực sự trên Checkout; `momo`/`card` không có UI xử lý; trang quản lý đơn hàng admin không hiển thị `paymentMethod` ở đâu cả.

Dự án chạy dual-mode (`VITE_USE_MOCK`), nên mọi thay đổi dữ liệu phải đồng bộ cả backend thật lẫn `frontend/src/mock/`.

## Mục tiêu

- Carousel danh mục tự chạy vòng lặp, tôn trọng `prefers-reduced-motion`, hỗ trợ touch/hover/focus để dừng, không tạo trùng link cho screen reader.
- Hoàn thiện form quản lý Brand/Category trong admin (đủ field model hỗ trợ).
- Sản phẩm tham chiếu Brand/Category bằng ID thay vì chuỗi tự do; form thêm/sửa sản phẩm dùng dropdown thay vì nhập chữ.
- `momo`/`card` có flow xác nhận thanh toán giả lập giống `bank`; admin xem được `paymentMethod` của mọi đơn hàng.
- Không phá vỡ dữ liệu/tính năng hiện có; lint/test/build/audit/docker sạch sau khi hoàn thành.

## Ngoài phạm vi

- Tích hợp cổng thanh toán thật (Momo API, cổng thẻ) — chỉ làm UI flow giả lập.
- Thêm nút điều hướng prev/next hoặc dots cho carousel.
- Thay đổi cấu trúc phân quyền admin hiện có.

## Thiết kế chi tiết

### 1. Carousel "Danh mục nổi bật"

**File chính:** [frontend/src/pages/Home.jsx](../../../frontend/src/pages/Home.jsx), [frontend/src/assets/styles/redesign.css](../../../frontend/src/assets/styles/redesign.css)

- Chuyển từ scroll tĩnh sang carousel autoplay: dùng `setInterval` để tự động dịch chuyển sang thẻ kế tiếp mỗi ~3.5s; áp dụng `transform: translateX()` (hoặc điều chỉnh `scrollLeft`) trên track.
- Loop vô hạn bằng kỹ thuật clone thẻ đầu/cuối để tạo hiệu ứng liền mạch. Các thẻ clone bắt buộc gắn `aria-hidden="true"` và `tabIndex={-1}` để không bị đọc trùng hoặc tab tới bởi screen reader / bàn phím — chỉ bộ thẻ gốc còn giữ `<a>` có thể focus.
- Dừng autoplay khi: `onMouseEnter`/`onFocus` xảy ra trên track hoặc bất kỳ thẻ con, hoặc `touchstart`; resume khi `onMouseLeave`/`onBlur`/`touchend` (có debounce nhẹ để tránh giật khi chuyển focus giữa các thẻ liền kề).
- Vuốt tay (touch swipe) chuyển thẻ thủ công theo hướng vuốt, reset timer autoplay sau thao tác.
- Khi `window.matchMedia('(prefers-reduced-motion: reduce)').matches` là `true`: tắt hẳn autoplay và animation dịch chuyển, hiển thị dạng danh sách cuộn tĩnh (giữ hành vi hiện tại).
- Container gắn `role="region"` + `aria-roledescription="carousel"` + `aria-label` mô tả mục đích; không thêm nút prev/next/dots.

### 2. Hoàn thiện Taxonomy Admin (Brand/Category)

**File chính:** [frontend/src/components/admin/TaxonomyManagement.jsx](../../../frontend/src/components/admin/TaxonomyManagement.jsx), [frontend/src/components/admin/SimpleCrudPage.jsx](../../../frontend/src/components/admin/SimpleCrudPage.jsx), [frontend/src/mock/mockDb.js](../../../frontend/src/mock/mockDb.js)

- Mở rộng form: Category có `name`, `description`, `active`; Brand có `name`, `logo` (input URL), `description`, `active`.
- `slug` không cho nhập tay — backend tự sinh từ `name` khi tạo/sửa nếu chưa có (kiểm tra `taxonomyValidators`/service để đảm bảo hành vi này đúng, bổ sung nếu thiếu); hiển thị read-only trong bảng danh sách/modal chi tiết nếu cần tham khảo.
- Mock mode: mở rộng seed record trong `mockDb.js` cho `categories`/`brands` để có đủ `slug`, `logo` (brand), `description`, khớp shape backend.
- Không thêm route/API mới — CRUD đã đầy đủ ở backend.

### 3. Liên kết Product ↔ Brand/Category bằng ID

**File chính:** [backend/src/models/Product.js](../../../backend/src/models/Product.js), [backend/src/validators/productValidators.js](../../../backend/src/validators/productValidators.js), [frontend/src/components/admin/ProductFormModal.jsx](../../../frontend/src/components/admin/ProductFormModal.jsx), [frontend/src/mock/mockProducts.js](../../../frontend/src/mock/mockProducts.js), [frontend/src/mock/mockAccessories.js](../../../frontend/src/mock/mockAccessories.js)

- **Schema:** đổi `Product.brand`/`Product.category` từ `String` sang trường lưu id tham chiếu (cùng kiểu string-id `createId()` đang dùng toàn dự án), có `ref: 'Brand'`/`ref: 'Category'` để populate. API trả về sản phẩm phải populate để frontend nhận được tên hiển thị (`brand: { id, name, ... }` thay vì chuỗi thô) — cần rà soát mọi nơi đọc `product.brand`/`product.category` dạng chuỗi (trang sản phẩm, filter, giỏ hàng, trang chi tiết) và cập nhật cách đọc field.
- **Migration dữ liệu:** viết script chạy một lần (backend, ví dụ `backend/src/scripts/` hoặc lồng vào seed) — với mỗi sản phẩm hiện có, tìm Brand/Category theo `name` (so khớp không phân biệt hoa thường); nếu không tìm thấy thì tạo mới bản ghi taxonomy tương ứng (`active: true`) rồi gán id. Áp dụng cho dữ liệu seed thật.
- **Mock mode:** cập nhật `mockProducts.js`/`mockAccessories.js` để `brand`/`category` trỏ tới id có trong `mockDb.js` thay vì chuỗi tự do; đảm bảo mock repository trả về populate-like shape tương thích với backend thật để component dùng chung không phải rẽ nhánh theo mode.
- **Validator:** `productValidators` kiểm tra `brandId`/`categoryId` gửi lên tồn tại và `active` trong taxonomy trước khi cho tạo/sửa sản phẩm; báo lỗi rõ ràng nếu không hợp lệ.
- **Form admin:** `ProductFormModal.jsx` thay 2 input text bằng 2 `<select>`, fetch danh sách từ `adminApi.brands`/`adminApi.categories` (lọc `active: true`), áp dụng cho cả `kind='product'` và `kind='accessory'`.

### 4. Phương thức thanh toán momo/card

**File chính:** [frontend/src/pages/Checkout.jsx](../../../frontend/src/pages/Checkout.jsx), [frontend/src/pages/admin/OrderManagement.jsx](../../../frontend/src/pages/admin/OrderManagement.jsx), [frontend/src/mock/mockOrders.js](../../../frontend/src/mock/mockOrders.js), [backend/src/seed/seed.js](../../../backend/src/seed/seed.js)

- **Checkout:** thêm bước xác nhận riêng cho `momo` và `card`, theo mẫu bước QR/bank-transfer hiện có cho `bank` — hiển thị mã QR giả lập (momo) hoặc form nhập thẻ giả lập + màn hình "xác nhận thanh toán thành công", không gọi cổng thanh toán thật, không lưu thông tin thẻ.
- **Admin Order Management:** thêm cột `paymentMethod` (hiển thị badge/nhãn tiếng Việt: "COD", "Chuyển khoản", "Momo", "Thẻ") vào bảng danh sách đơn và vào modal chi tiết đơn hàng — hiện đang thiếu hoàn toàn.
- **Dữ liệu mẫu:** cập nhật `mockOrders.js` và `backend/src/seed/seed.js` để đơn hàng mẫu xoay vòng đủ cả 4 phương thức thay vì chỉ `cod`/`bank`.
- Backend schema/enum/validator hiện đã hỗ trợ đủ 4 giá trị — chỉ cần rà soát `orderService.js` và swagger docs mô tả đúng, không cần đổi enum.

### 5. Kiểm thử & xác thực

- Test carousel: kiểm tra render, aria attributes trên clone vs thẻ gốc, hành vi tắt animation khi giả lập `prefers-reduced-motion`.
- Test taxonomy form: submit đủ field mới, validate slug tự sinh.
- Test migration Product→Brand/Category: sản phẩm cũ với brand/category string được map đúng sang id, tạo taxonomy mới khi cần.
- Test product form dropdown: chọn brand/category từ danh sách, lưu đúng id.
- Test payment flow: checkout với từng phương thức trong 4 loại, admin order view hiển thị đúng `paymentMethod`.
- Chạy toàn bộ: `npm run lint`, `npm test` / `npm run test:coverage` (backend), `npm run build` (frontend), `npm audit` (cả 2 project), `docker compose up -d` để xác nhận hệ thống chạy được end-to-end. Sửa mọi regression phát sinh trước khi coi là hoàn thành.

## Rủi ro & đánh đổi

- **Migration Product→Brand/Category** là thay đổi schema có khả năng phá vỡ dữ liệu nếu chạy sai — cần chạy migration script một cách idempotent (chạy lại nhiều lần không tạo trùng) và test kỹ trên dữ liệu seed trước khi áp dụng.
- **Carousel clone-based loop** có thể gây layout shift nhẹ nếu không tính toán đúng width — cần test kỹ trên các viewport khác nhau.
- **Populate Brand/Category trên Product API** thay đổi shape response — mọi nơi frontend đang đọc `product.brand`/`product.category` như chuỗi phải được cập nhật đồng bộ để tránh hiển thị `[object Object]`.

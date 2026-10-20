# TechPhone Store — kế hoạch hoàn thiện 9 hạng mục thương mại điện tử

Ngày lập: 2026-07-28

## Mục tiêu

Đưa storefront từ bản demo đầy đủ luồng cơ bản thành nền tảng thương mại điện tử có trải nghiệm mua hàng, dữ liệu và điểm tích hợp production rõ ràng. Giữ nguyên route, API envelope, kiến trúc backend nhiều lớp và hệ thiết kế khóa trong `design.md`.

## Nguyên tắc thực hiện

- Frontend tiếp tục hỗ trợ song song mock/API.
- Backend tuân thủ `routes → controllers → services → repositories → models`.
- Server luôn tính lại giá, giảm giá, phí vận chuyển và trạng thái thanh toán; không tin số tiền gửi từ client.
- UI mới dùng token hiện có, một bộ icon `react-icons/fi`, hỗ trợ bàn phím, reduced motion và màn hình 320/375/414/768 px.
- Không lưu số thẻ/CVV. Không đánh dấu đơn “đã thanh toán” nếu chưa nhận callback hợp lệ từ nhà cung cấp.

## Trạng thái thực hiện

Cập nhật lần cuối: 2026-07-29 — **9/9 workstream đã hoàn thành trong phạm vi repository**.

- [x] **1. Thanh toán production-ready:** có `PaymentTransaction`, VNPay adapter, URL thanh toán do backend tạo, IPN/return có kiểm tra chữ ký, idempotency và proof cho trang kết quả. API `/payments/config` tự ẩn VNPay, ngân hàng hoặc MoMo khi thiếu cấu hình; COD luôn còn dùng được. Test nằm tại `backend/tests/payment.test.js`, `backend/tests/vnpay-provider.test.js` và `frontend/src/pages/Checkout.test.jsx`.
- [x] **2. Guest checkout:** route tạo đơn dùng optional auth, đơn có tài khoản được gắn `userId`, guest vẫn đặt được hàng và tra cứu công khai bằng mã đơn + số điện thoại. Trang thành công không tải công khai đơn guest chỉ bằng ID sau khi refresh. Test nằm tại `backend/tests/order-dashboard.test.js` và `backend/tests/payment.test.js`.
- [x] **3. Địa chỉ, phí giao hàng và tracking:** checkout tách tỉnh/thành, quận/huyện, phường/xã và địa chỉ chi tiết; frontend/backend cùng áp dụng miễn phí từ 10 triệu và quy tắc vùng. Dự án dùng danh mục 34 đơn vị cấp tỉnh hiện hành thay cho danh mục 63 đơn vị trong bản nháp ban đầu. Admin cập nhật được đơn vị vận chuyển, mã vận đơn, ngày giao dự kiến; tracking hiển thị tại trang thành công, tra cứu và tài khoản. Test nằm tại `frontend/src/utils/shipping.test.js`, `backend/tests/shipping.test.js` và `frontend/src/pages/Account.test.jsx`.
- [x] **4. Review theo sản phẩm và verified purchase:** trang chi tiết có điểm trung bình, phân bố sao, lọc, ảnh và nhãn “Đã mua hàng”. Backend tự suy ra verified purchase từ đơn delivered/completed, luôn tạo review ở trạng thái pending và dùng unique index để giữ đúng một review cho mỗi user/target kể cả khi gửi đồng thời. Test nằm tại `backend/tests/voucher-review.test.js`.
- [x] **5. So sánh sản phẩm:** thêm/xóa từ product card hoặc trang chi tiết, tối đa bốn điện thoại, giữ thứ tự trong local storage và highlight thông số khác nhau trong bảng responsive. Test nằm tại `frontend/src/utils/commercePreferences.test.js` và `frontend/src/pages/ProductCompare.test.jsx`.
- [x] **6. Cá nhân hóa merchandising:** lưu sản phẩm đã xem, gợi ý theo thương hiệu/giá/RAM/bộ nhớ/tồn kho, có fallback best seller và khối phụ kiện tương thích. Logic không thu thập dữ liệu nhạy cảm và không gắn nhãn “AI”. Test nằm tại `frontend/src/utils/merchandising.test.js`.
- [x] **7. Wishlist đồng bộ tài khoản:** guest lưu local; khi đăng nhập hệ thống merge local + server, loại trùng, giới hạn 100 mục và đồng bộ Header/Favorites/product card qua cùng event/contract. Test nằm tại `frontend/src/utils/wishlist.test.js` và `backend/tests/auth.test.js`.
- [x] **8. Chính sách và hỗ trợ:** có bốn trang bảo hành/đổi trả/vận chuyển/thanh toán, Footer trỏ đúng route, support launcher lấy hotline/email/Zalo từ settings, đóng bằng Escape và hỗ trợ focus. Các điều khoản cần chủ shop duyệt đã được ghi chú rõ. Test hành vi dialog/focus nằm tại `frontend/src/components/common/AccessibleDialog.test.jsx`; responsive được kiểm tra trong plan remediation frontend.
- [x] **9. SEO và đo lường:** mọi route có title, description, canonical và Open Graph theo route; trang sản phẩm có Product/Offer/AggregateRating/Breadcrumb JSON-LD, trang gốc có Organization JSON-LD; sitemap gồm route tĩnh/chính sách và backend sinh URL sản phẩm. Analytics mặc định no-op khi thiếu measurement ID, lọc PII và có đủ `view_item`, `search`, `add_to_cart`, `begin_checkout`, `purchase`. Test nằm tại `frontend/src/hooks/usePageMeta.test.jsx`, `frontend/src/components/common/RouteMeta.test.jsx`, `frontend/src/utils/analytics.test.js`, `frontend/scripts/generate-site-metadata.test.js` và `backend/tests/seo.test.js`.

### Phần phụ thuộc bên ngoài

Kích hoạt thanh toán live không phải phần code còn thiếu. Khi không có merchant credentials, phương thức live được ẩn an toàn. Nếu sau này cần bật VNPay thật, chỉ điền credentials và callback URL vào biến môi trường runtime; không đưa khóa vào Git.

### Quality gate cuối

- Frontend: 40 test file, 121 test đều pass; ESLint pass; production build pass và không còn cảnh báo thiếu `VITE_SITE_URL`.
- Backend: 16 test suite, 74 test đều pass; coverage đạt 98,91% statements, 92,3% branches, 100% functions và 98,71% lines.
- Docker Compose: MongoDB `rs0`, backend và frontend đều khởi động; MongoDB/backend healthy; health API, Swagger, frontend và SPA fallback đều trả HTTP 200.
- Production dependency audit: backend không còn advisory. Frontend dùng React Router 7.18.2 mới nhất đang phát hành; advisory RSC/Server Action còn được npm liệt kê không áp dụng cho Vite SPA này vì dự án không dùng RSC hoặc server action.

## 9 workstream

### 1. Thanh toán production-ready

**Phạm vi**

- Tách luồng thanh toán khỏi `Checkout.jsx` thành API tạo phiên thanh toán.
- Bổ sung transaction model, trạng thái `pending/paid/failed/refunded`, idempotency và webhook.
- Giữ COD/chuyển khoản thủ công; thêm adapter cổng thanh toán cấu hình bằng biến môi trường.
- Checkout chuyển hướng/hiển thị QR từ dữ liệu backend, không tự xác nhận “đã thanh toán”.

**Điều kiện hoàn thành**

- Có sandbox adapter và test chữ ký/callback.
- Thiếu merchant key thì hệ thống tự ẩn phương thức live, không làm hỏng COD.
- Production chỉ cần điền merchant credentials và callback URL.

### 2. Guest checkout

**Phạm vi**

- Cho phép tạo đơn không đăng nhập bằng optional auth.
- Gắn đơn vào tài khoản nếu có token hợp lệ.
- Sau đặt hàng, khách có thể tra cứu bằng mã đơn + số điện thoại.
- CTA tạo tài khoản sau mua là tùy chọn, không chặn giao dịch.

**Điều kiện hoàn thành**

- Guest và user đều đặt được đơn.
- Refresh trang thành công không làm lộ đơn; tra cứu công khai vẫn yêu cầu hai yếu tố.

### 3. Địa chỉ, phí giao hàng và tracking

**Phạm vi**

- Tách tỉnh/thành, quận/huyện, phường/xã và địa chỉ chi tiết.
- Dùng danh sách 63 tỉnh/thành, tính phí/ETA ở frontend để preview và backend để xác thực.
- Lưu đơn vị vận chuyển, mã vận đơn, ngày dự kiến giao.
- Admin cập nhật tracking; khách thấy tracking trong thành công/tra cứu/tài khoản.

**Điều kiện hoàn thành**

- Phí frontend khớp backend.
- Đơn trên 10 triệu miễn phí; vùng giao hàng có quy tắc cấu hình tập trung.

### 4. Đánh giá theo sản phẩm và xác minh mua hàng

**Phạm vi**

- Hiển thị review, điểm trung bình, phân bố sao, ảnh và bộ lọc ngay trang chi tiết.
- Đánh dấu “Đã mua hàng” dựa trên đơn delivered/completed.
- Chỉ một review trên mỗi user/target; giữ luồng duyệt admin.

**Điều kiện hoàn thành**

- Review mới ở trạng thái pending.
- Nhãn verified do backend quyết định, client không thể tự gửi.

### 5. So sánh sản phẩm

**Phạm vi**

- Chọn tối đa 4 điện thoại từ card hoặc trang chi tiết.
- Trang so sánh có bảng thông số, giá, tồn kho và highlight khác biệt.
- Trạng thái lưu cục bộ, không bắt buộc đăng nhập; responsive bằng vùng cuộn có nhãn rõ.

**Điều kiện hoàn thành**

- Thêm/xóa không reload.
- Có test giới hạn 4 và bảo toàn thứ tự lựa chọn.

### 6. Cá nhân hóa merchandising

**Phạm vi**

- Lưu sản phẩm đã xem gần đây.
- Gợi ý theo điểm tương đồng: loại, thương hiệu, tầm giá, RAM/bộ nhớ và trạng thái còn hàng.
- Bổ sung khối mua kèm phụ kiện phù hợp.

**Điều kiện hoàn thành**

- Không gọi là “AI”; không thu thập dữ liệu nhạy cảm.
- Logic có test đơn vị và fallback khi chưa đủ lịch sử.

### 7. Wishlist đồng bộ tài khoản

**Phạm vi**

- Guest dùng local storage.
- Khi đăng nhập, merge local + server, loại trùng và giới hạn số lượng.
- Mọi thay đổi cập nhật Header, Favorites và product card nhất quán.

**Điều kiện hoàn thành**

- Đổi thiết bị vẫn giữ wishlist khi dùng API thật.
- Mock/API có cùng contract.

### 8. Tin cậy, chính sách và hỗ trợ

**Phạm vi**

- Tạo trang chính sách bảo hành, đổi trả, vận chuyển và thanh toán.
- Footer trỏ đúng trang thay vì dồn về Contact.
- Thêm support launcher dùng hotline/email và URL Zalo cấu hình; không bịa tài khoản.
- Contact giữ Google Maps bằng địa chỉ cửa hàng hiện có.

**Điều kiện hoàn thành**

- Nội dung chính sách dùng thông tin hiện có; các điều khoản chưa được chủ shop xác nhận được ghi rõ là cần cấu hình.
- Support launcher có focus-visible, đóng bằng Escape và không che CTA mobile.

### 9. SEO và đo lường

**Phạm vi**

- Title, description, canonical, Open Graph động.
- JSON-LD `Product/Offer/AggregateRating`, `Organization` và breadcrumb.
- `robots.txt`, sitemap theo route tĩnh và endpoint sitemap sản phẩm.
- Analytics adapter gửi event funnel; mặc định no-op nếu chưa có measurement ID.

**Điều kiện hoàn thành**

- Không phát event chứa email, điện thoại hay địa chỉ.
- Có event view item, search, add to cart, begin checkout, purchase.
- Metadata được dọn khi chuyển route để không giữ dữ liệu sản phẩm cũ.

## Thứ tự triển khai

1. Củng cố schema/API: payment, shipping, wishlist, verified review.
2. Hoàn thiện checkout và tracking.
3. Hoàn thiện compare, recent, recommendation và wishlist UI.
4. Thêm policy/support.
5. Thêm SEO/analytics.
6. Chạy lint, frontend tests/build, backend tests và audit Hallmark.

## File map dự kiến

### Backend

- Sửa: auth/order/review models, validators, services, controllers và routes hiện có.
- Thêm: `PaymentTransaction` cùng repository/service/controller/routes; payment provider adapter; sitemap endpoint nếu cần.
- Sửa: Swagger, seed và test tương ứng.

### Frontend

- Sửa: routes, header/footer, checkout, product/accessory detail, product card, favorites, order success/lookup/account.
- Thêm: payment API, analytics/SEO utilities, compare/recent/recommendation/support/policy components và pages.
- Sửa: token-aware CSS, responsive rules và tests.

## Phụ thuộc bên ngoài

Code sandbox và fallback có thể hoàn thành ngay. Để bật thanh toán hoặc vận chuyển live cần chủ shop cung cấp:

- Nhà cung cấp đã ký hợp đồng.
- Merchant/partner ID.
- Secret/hash key.
- Domain HTTPS và webhook/callback URL production.

Không ghi credentials vào git; chỉ đặt trong biến môi trường của runtime.

## Cổng chất lượng

- `frontend`: ESLint, Vitest, Vite production build.
- `backend`: Jest + mongodb-memory-server.
- `git diff --check`.
- Hallmark: token discipline, focus/active/disabled, không horizontal scroll, CTA một dòng, reduced motion và kiểm tra 320/375/414/768 px.

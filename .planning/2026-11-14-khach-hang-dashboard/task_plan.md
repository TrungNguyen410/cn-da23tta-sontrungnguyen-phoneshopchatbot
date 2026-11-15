# Task Plan: Lưu địa chỉ khách, chặn huỷ đơn đã xác nhận, nâng cấp dashboard admin

## Goal
1. Khách đăng nhập: lưu 1 địa chỉ nhận hàng (họ tên, SĐT, email, địa chỉ, tỉnh, phường/xã). Lần sau checkout hiện thẻ địa chỉ đã lưu + nút "Giao đến địa chỉ khác" (mở form, ô tick "Lưu làm mặc định", mặc định không tick). Lần đầu chưa có địa chỉ thì tự lưu. Bỏ cấp Quận/Huyện; phường/xã chọn từ danh sách sau sáp nhập 1/7/2025 (tải 1 lần từ provinces.open-api.vn v2, lưu JSON tĩnh).
2. Khách chỉ tự huỷ được đơn "Chờ xác nhận". Admin vẫn huỷ được đơn đã xác nhận.
3. Dashboard admin: 3 biểu đồ doanh thu riêng (theo năm / theo tháng của 1 năm / theo ngày của 1 tháng); top bán chạy gồm cả phụ kiện; top 10 khách chi tiêu nhiều nhất + nút "Tặng voucher" (voucher riêng 1 khách, dùng 1 lần, khách xem ở Tài khoản → Voucher của tôi); cảnh báo tồn kho ≤ 10 cho điện thoại + phụ kiện (dashboard + nhãn trong danh sách quản lý).

## Current Phase
Phase 5

## Phases

### Phase 1: Huỷ đơn chỉ khi chờ xác nhận
- [x] backend orderService.cancelOrderInSession: khách chỉ huỷ `pending`; admin `pending|confirmed`
- [x] frontend Account canSelfCancel + mock cancelMyOrder + ghi chú "không thể tự hủy"
- [x] test backend (tests/customer-features.test.js) + frontend (Account.test.jsx)
- **Status:** complete

### Phase 2: Dữ liệu phường/xã + địa chỉ đã lưu
- [x] tải dữ liệu (613 KB thô → 65 KB / 16 KB gzip), 34 tỉnh, 3.321 đơn vị, lưu frontend/src/data/vnWards.json (+ SOURCES.md)
- [x] User.shippingAddress (backend model, profile validator/service, order create saveAddress)
- [x] mockDb tương ứng
- [x] Checkout: thẻ địa chỉ đã lưu / form địa chỉ khác / tick lưu mặc định; bỏ Quận/Huyện; select phường/xã
- [x] Account: sửa địa chỉ nhận hàng
- [x] test
- **Status:** complete

### Phase 3: Voucher riêng cho khách
- [x] Voucher.assignedUserId; validate/reserve theo user; /vouchers/check biết user (optional auth)
- [x] POST /admin/customers/:id/vouchers; GET /vouchers/mine
- [x] chatbot list_promotions bỏ voucher riêng
- [x] mock + frontend Account tab "Voucher của tôi"
- [x] test
- **Status:** complete

### Phase 4: Dashboard
- [x] backend: revenue năm/tháng/ngày (múi giờ Asia/Ho_Chi_Minh), topProducts gồm phụ kiện, topCustomers, lowStock ≤ 10
- [x] mock dashboard tính từ dữ liệu mock
- [x] Dashboard.jsx: 3 biểu đồ + bộ chọn năm/tháng, top khách + modal tặng voucher, cảnh báo tồn kho
- [x] nhãn "Sắp hết/Hết hàng" ở quản lý sản phẩm/phụ kiện
- [x] test
- **Status:** complete

### Phase 5: Kiểm tra
- [x] backend npm test (30 file / 374 test), frontend vitest (59 / 290) + lint + build
- [x] xem trên Chrome (mock mode): checkout, tài khoản, dashboard, tặng voucher, nhãn tồn kho
- **Status:** complete

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 1 địa chỉ lưu, tick "Lưu làm mặc định" khi giao địa chỉ khác | Người dùng chọn |
| Phường/xã tải từ provinces.open-api.vn v2 | Người dùng chọn; báo dung lượng thực, nếu > 300 KB thì hỏi lại |
| Voucher riêng hiện ở Tài khoản khách | Người dùng chọn |
| Ngưỡng tồn kho ≤ 10, cả điện thoại + phụ kiện | Người dùng chọn |
| 3 biểu đồ doanh thu riêng năm/tháng/ngày | Người dùng yêu cầu |
| Top bán chạy giữ số "đã bán" cộng dồn, thêm phụ kiện | Người dùng không trả lời câu này; giữ cách tính hiện có (reserve/release đã cập nhật sold) |
| Doanh thu chỉ tính đơn delivered/completed | Giữ định nghĩa hiện tại |

## Next Step
Xong. Chờ người dùng quyết định commit/push (chưa commit).

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| Bash heredoc lỗi "unexpected EOF" với nội dung có dấu nháy | 1 | Ghi script/CSS ra scratchpad bằng Write rồi chạy |
| Bộ lọc ký tự tên phường chặn "Ea H’Leo" | 1 | Cho phép dấu nháy ’ và ( ) |
| Jest chạy 2 file chung bị treo > 20 phút | 1 | Chạy từng file với --forceExit: cả hai qua |
| eslint react-hooks/refs: gán ref khi render | 1 | Tải dashboard lần đầu theo `today` cố định |
| Vite HMR giữ bản cũ OrderSuccess (2 lần ghi liền nhau) | 1 | touch file để Vite biên dịch lại |

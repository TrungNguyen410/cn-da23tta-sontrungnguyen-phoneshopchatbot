# Progress

## 2026-11-14
- Khảo sát code, hỏi người dùng 7 câu (địa chỉ, voucher, tồn kho, biểu đồ). Lập kế hoạch.
- Phase 1 xong (backend + frontend test pass). Tải dữ liệu phường/xã: 34 tỉnh, 3321 đơn vị, file 65 KB.
- Phase 2-4 xong. Frontend 58+1 file test pass, lint sạch. Backend customer-features (10) + order-dashboard (40) pass. Swagger cập nhật.
- Phase 5 xong: backend 374/374, frontend 290/290, lint sạch, build OK. Kiểm tra Chrome: sửa vị trí ghi chú huỷ đơn, danh sách sắp hết hàng, trục biểu đồ khi trống, địa chỉ đầy đủ ở trang đặt hàng thành công.

## Session: 14/11 tối — người dùng báo "không thấy biểu đồ"
- Kiểm tra: container Docker (build 19:35) đã có code mới; dashboardService trong container trả đủ revenue.yearly/monthly/daily (DB Docker: chỉ có doanh thu T11/2026, 61.980.000đ). Bản mock 5174 hiện đủ 3 biểu đồ (Theo năm, Theo tháng, Theo ngày).
- Người dùng tự dừng Docker lúc ~19:46 (docker compose stop), không khởi động lại.
- Nguyên nhân nghi vấn: nginx không gửi Cache-Control cho index.html → trình duyệt dùng index.html cũ (heuristic cache) sau khi build lại image → chạy JS cũ.
- Sửa: frontend/nginx.conf thêm `Cache-Control: no-cache` cho `/` và `/index.html` (asset có hash vẫn immutable). Đã `nginx -t` và curl kiểm tra header trên container nginx tạm.
- Top bán chạy: người dùng xác nhận tính theo số lượng bán được nhiều nhất → giữ `sold` (tăng khi đặt, giảm khi hủy).

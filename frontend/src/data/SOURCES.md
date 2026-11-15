# Nguồn dữ liệu

## vnWards.json

Danh sách 3.321 phường, xã, đặc khu của 34 tỉnh/thành sau sắp xếp đơn vị hành chính (hiệu lực 01/07/2025, bỏ cấp quận/huyện).

- Nguồn: API mở `https://provinces.open-api.vn/api/v2/?depth=2` (dự án mã nguồn mở vn-open-api-provinces, dữ liệu theo danh mục hành chính của Cục Thống kê). Tải ngày 14/11/2026.
- Đã rút gọn: chỉ giữ tên, khoá theo tên tỉnh/thành như `SHIPPING_PROVINCES` (`frontend/src/utils/shipping.js`), sắp xếp theo bảng chữ cái.
- Khi có thay đổi địa giới, tải lại từ nguồn trên và tạo lại file theo cùng định dạng `{ "Tên tỉnh": ["Phường …", "Xã …"] }`.
